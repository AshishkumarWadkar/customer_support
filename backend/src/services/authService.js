const userRepo = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hashUtils');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwtUtils');
const { AuthError, ConflictError, ValidationError, NotFoundError } = require('../middlewares/errorMiddleware');
const { validatePasswordComplexity } = require('../utils/passwordUtils');
const { AUDIT_EVENTS } = require('../constants/auditEvents');
const logger = require('../utils/logger');
const crypto = require('crypto');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

const login = async (email, password, ip) => {
  const user = await userRepo.findByEmail(email);

  if (!user || !user.is_active) {
    throw new AuthError('Invalid email or password');
  }

  // Check if account is locked
  if (user.is_locked) {
    const lockExpiry = user.locked_until ? new Date(user.locked_until) : null;
    if (lockExpiry && lockExpiry > new Date()) {
      const remaining = Math.ceil((lockExpiry - new Date()) / 60000);
      throw new AuthError(`Account is locked. Try again in ${remaining} minute(s)`);
    }
    // Lock expired — auto-unlock
    await userRepo.unlockAccount(user.id);
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    await userRepo.incrementFailedAttempts(user.id);

    const updatedUser = await userRepo.findByEmail(email);
    if (updatedUser.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await userRepo.lockAccount(user.id, lockUntil);
      throw new AuthError(`Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes`);
    }

    throw new AuthError('Invalid email or password');
  }

  await userRepo.updateLoginInfo(user.id, ip);

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role_name,
    firstName: user.first_name,
    lastName: user.last_name,
  };

  const tokens = generateTokenPair(tokenPayload);

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role_name,
      avatarUrl: user.avatar_url,
      timezone: user.timezone,
      mustChangePassword: user.must_change_password === 1,
    },
  };
};

const refreshTokens = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await userRepo.findById(decoded.id);
    if (!user || !user.is_active) {
      throw new AuthError('User not found or inactive');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return generateTokenPair(tokenPayload);
  } catch (err) {
    throw new AuthError('Invalid or expired refresh token');
  }
};

const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email);
  if (!user) return; // Silent — don't reveal email existence

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  const pool = require('../config/database').getPool();
  await pool.execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user.id, tokenHash, expiresAt]
  );

  logger.info(`Password reset token generated for user ${user.id}`);
  return { token, user }; // Caller responsible for sending email
};

const resetPassword = async (token, newPassword, confirmPassword) => {
  if (!newPassword) {
    throw new ValidationError('New password is required');
  }
  if (newPassword !== confirmPassword) {
    throw new ValidationError('Passwords do not match');
  }

  validatePasswordComplexity(newPassword);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const pool = require('../config/database').getPool();

  const [[resetRecord]] = await pool.execute(
    `SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

  if (!resetRecord) {
    throw new ValidationError('Invalid or expired reset token');
  }

  // Password history check — prevent reuse of last 5 passwords
  const history = await userRepo.getPasswordHistory(resetRecord.user_id);
  for (const oldHash of history) {
    const isReused = await comparePassword(newPassword, oldHash);
    if (isReused) {
      throw new ValidationError('Cannot reuse one of your last 5 passwords');
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepo.updatePassword(resetRecord.user_id, passwordHash);
  await userRepo.savePasswordHistory(resetRecord.user_id, passwordHash);

  // Mark token as used to prevent replay attacks
  await pool.execute(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [resetRecord.id]);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  if (!newPassword) {
    throw new ValidationError('New password is required');
  }

  validatePasswordComplexity(newPassword);

  const user = await userRepo.findById(userId);
  const fullUser = await userRepo.findByEmail(user.email);

  const isMatch = await comparePassword(currentPassword, fullUser.password_hash);
  if (!isMatch) {
    throw new ValidationError('Current password is incorrect');
  }

  // Password history check — prevent reuse of last 5 passwords
  const history = await userRepo.getPasswordHistory(userId);
  for (const oldHash of history) {
    const isReused = await comparePassword(newPassword, oldHash);
    if (isReused) {
      throw new ValidationError('Cannot reuse one of your last 5 passwords');
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepo.updatePassword(userId, passwordHash);
  await userRepo.savePasswordHistory(userId, passwordHash);
};

module.exports = { login, refreshTokens, forgotPassword, resetPassword, changePassword };
