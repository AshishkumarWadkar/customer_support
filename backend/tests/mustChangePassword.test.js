/**
 * mustChangePassword middleware — integration tests
 *
 * Acceptance criteria:
 *   AC1 — Users with must_change_password=1 receive mustChangePassword=true in JWT on login
 *   AC2 — All API requests return 403 MUST_CHANGE_PASSWORD when flag is active,
 *          except change-password, logout, and me
 *   AC3 — Successfully changing password clears the must_change_password flag
 *   AC4 — User can still logout while must_change_password is active
 *   AC5 — User can still access GET /auth/me while must_change_password is active
 */

'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─── Environment stubs ────────────────────────────────────────────────────────
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.NODE_ENV = 'test';

// ─── Module mocks (must be defined before requiring app) ─────────────────────

// Mock database pool — prevents real DB connections
jest.mock('../src/config/database', () => ({
  getPool: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue([[], {}]),
  })),
}));

// Mock userRepository
jest.mock('../src/repositories/userRepository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updateLoginInfo: jest.fn().mockResolvedValue(undefined),
  incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
  lockAccount: jest.fn().mockResolvedValue(undefined),
  unlockAccount: jest.fn().mockResolvedValue(undefined),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  getPasswordHistory: jest.fn().mockResolvedValue([]),
  savePasswordHistory: jest.fn().mockResolvedValue(undefined),
}));

// Mock emailService to prevent real outbound email
jest.mock('../src/utils/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger to suppress output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  stream: { write: jest.fn() },
}));

const userRepo = require('../src/repositories/userRepository');
const { hashPassword } = require('../src/utils/hashUtils');
const app = require('../src/app');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a signed JWT access token directly — bypasses the login endpoint
 * so we can control the mustChangePassword flag precisely.
 */
const makeAccessToken = (overrides = {}) => {
  const payload = {
    id: 1,
    email: 'user@example.com',
    role: 'AGENT',
    firstName: 'Test',
    lastName: 'User',
    mustChangePassword: false,
    ...overrides,
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
    issuer: 'support-platform',
  });
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ─── Shared user fixture ──────────────────────────────────────────────────────

let passwordHash;

beforeAll(async () => {
  passwordHash = await hashPassword('OldPass@123');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — Login sets mustChangePassword=true in JWT when must_change_password=1
// ─────────────────────────────────────────────────────────────────────────────
describe('AC1 — Login JWT payload', () => {
  it('includes mustChangePassword=true when user.must_change_password=1', async () => {
    userRepo.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password_hash: passwordHash,
      role_name: 'AGENT',
      first_name: 'Test',
      last_name: 'User',
      is_active: 1,
      is_locked: 0,
      locked_until: null,
      must_change_password: 1,
      avatar_url: null,
      timezone: 'UTC',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'OldPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);

    // Decode the access token and verify the claim is present
    const decoded = jwt.verify(
      res.body.data.accessToken,
      process.env.JWT_ACCESS_SECRET
    );
    expect(decoded.mustChangePassword).toBe(true);
  });

  it('includes mustChangePassword=false when user.must_change_password=0', async () => {
    userRepo.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password_hash: passwordHash,
      role_name: 'AGENT',
      first_name: 'Test',
      last_name: 'User',
      is_active: 1,
      is_locked: 0,
      locked_until: null,
      must_change_password: 0,
      avatar_url: null,
      timezone: 'UTC',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'OldPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(false);

    const decoded = jwt.verify(
      res.body.data.accessToken,
      process.env.JWT_ACCESS_SECRET
    );
    expect(decoded.mustChangePassword).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — Protected routes return 403 MUST_CHANGE_PASSWORD when flag is active
// ─────────────────────────────────────────────────────────────────────────────
describe('AC2 — Blocked routes return 403 MUST_CHANGE_PASSWORD', () => {
  const blockedToken = () => makeAccessToken({ mustChangePassword: true });

  const blockedRoutes = [
    ['GET',    '/api/v1/tickets'],
    ['POST',   '/api/v1/tickets'],
    ['GET',    '/api/v1/tickets/42'],
    ['PUT',    '/api/v1/tickets/42'],
    ['DELETE', '/api/v1/tickets/42'],
    ['GET',    '/api/v1/kb/articles'],
    ['POST',   '/api/v1/kb/articles'],
    ['GET',    '/api/v1/dashboard/admin'],
    ['GET',    '/api/v1/admin/users'],
  ];

  test.each(blockedRoutes)(
    '%s %s returns 403 MUST_CHANGE_PASSWORD',
    async (method, path) => {
      const res = await request(app)
        [method.toLowerCase()](path)
        .set(authHeader(blockedToken()));

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MUST_CHANGE_PASSWORD');
      expect(res.body.success).toBe(false);
    }
  );

  it('does NOT block requests when mustChangePassword=false', async () => {
    // Mock DB so the ticket list query doesn't crash; we only care about status != 403
    const { getPool } = require('../src/config/database');
    getPool.mockReturnValue({
      execute: jest.fn().mockResolvedValue([[[], {}], {}]),
    });

    userRepo.findById.mockResolvedValue({
      id: 1,
      role: 'AGENT',
      role_name: 'AGENT',
      is_active: 1,
    });

    const normalToken = makeAccessToken({ mustChangePassword: false });
    const res = await request(app)
      .get('/api/v1/tickets')
      .set(authHeader(normalToken));

    // Must NOT be blocked by mustChangePassword — any status other than 403 MUST_CHANGE_PASSWORD
    expect(res.body.code).not.toBe('MUST_CHANGE_PASSWORD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — Changing password clears must_change_password flag
// ─────────────────────────────────────────────────────────────────────────────
describe('AC3 — Changing password clears must_change_password flag', () => {
  it('calls userRepo.updatePassword which sets must_change_password=0', async () => {
    userRepo.findById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      role: 'AGENT',
      is_active: 1,
    });
    userRepo.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password_hash: passwordHash,
      role_name: 'AGENT',
      first_name: 'Test',
      last_name: 'User',
      is_active: 1,
      is_locked: 0,
    });

    // Use a token WITH mustChangePassword=true — the middleware allows PUT /change-password through
    const token = makeAccessToken({ mustChangePassword: true });

    const res = await request(app)
      .put('/api/v1/auth/change-password')
      .set(authHeader(token))
      .send({
        currentPassword: 'OldPass@123',
        newPassword: 'NewPass@456!',
        confirmPassword: 'NewPass@456!',
      });

    expect(res.status).toBe(200);
    // updatePassword sets must_change_password = 0 in SQL (verified in userRepository.js:171)
    expect(userRepo.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
  });

  it('rejects change-password when current password is wrong', async () => {
    userRepo.findById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      role: 'AGENT',
      is_active: 1,
    });
    userRepo.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password_hash: passwordHash,
      role_name: 'AGENT',
      first_name: 'Test',
      last_name: 'User',
      is_active: 1,
      is_locked: 0,
    });

    const token = makeAccessToken({ mustChangePassword: true });

    const res = await request(app)
      .put('/api/v1/auth/change-password')
      .set(authHeader(token))
      .send({
        currentPassword: 'WrongPass@000',
        newPassword: 'NewPass@456!',
        confirmPassword: 'NewPass@456!',
      });

    expect(res.status).toBe(400);
    expect(userRepo.updatePassword).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — User can still logout while must_change_password is active
// ─────────────────────────────────────────────────────────────────────────────
describe('AC4 — Logout is allowed when mustChangePassword=true', () => {
  it('POST /auth/logout returns 200 with mustChangePassword token', async () => {
    const token = makeAccessToken({ mustChangePassword: true });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.code).not.toBe('MUST_CHANGE_PASSWORD');
  });

  it('POST /auth/logout clears the refreshToken cookie', async () => {
    const token = makeAccessToken({ mustChangePassword: true });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(token));

    expect(res.headers['set-cookie']).toBeDefined();
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/refreshToken=;/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC5 — User can still access GET /auth/me while must_change_password is active
// ─────────────────────────────────────────────────────────────────────────────
describe('AC5 — GET /auth/me is allowed when mustChangePassword=true', () => {
  it('returns 200 with user profile when mustChangePassword=true', async () => {
    userRepo.findById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'AGENT',
      is_active: 1,
      must_change_password: 1,
    });

    const token = makeAccessToken({ mustChangePassword: true });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.code).not.toBe('MUST_CHANGE_PASSWORD');
    expect(res.body.data.email).toBe('user@example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Middleware unit — direct tests of mustChangePassword middleware logic
// ─────────────────────────────────────────────────────────────────────────────
describe('mustChangePassword middleware — unit', () => {
  const { mustChangePassword } = require('../src/middlewares/mustChangePasswordMiddleware');

  const makeReq = (method, path, mustChange) => ({
    method,
    path,
    user: { id: 1, mustChangePassword: mustChange },
  });

  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('calls next() when mustChangePassword=false', () => {
    const req = makeReq('GET', '/tickets', false);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when req.user is absent', () => {
    const req = { method: 'GET', path: '/tickets' }; // no user
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows PUT /change-password through', () => {
    const req = makeReq('PUT', '/change-password', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows POST /logout through', () => {
    const req = makeReq('POST', '/logout', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows GET /me through', () => {
    const req = makeReq('GET', '/me', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks GET /tickets with 403 MUST_CHANGE_PASSWORD', () => {
    const req = makeReq('GET', '/tickets', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'MUST_CHANGE_PASSWORD',
      })
    );
  });

  it('blocks POST /tickets with 403 MUST_CHANGE_PASSWORD', () => {
    const req = makeReq('POST', '/tickets', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MUST_CHANGE_PASSWORD' })
    );
  });

  it('does NOT allow wrong method on allowed path (POST /change-password)', () => {
    // Only PUT /change-password is allowed, not POST
    const req = makeReq('POST', '/change-password', true);
    const res = makeRes();
    const next = jest.fn();

    mustChangePassword(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
