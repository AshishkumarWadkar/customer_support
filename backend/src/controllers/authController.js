const authService = require('../services/authService');
const { sendSuccess, sendCreated } = require('../utils/responseUtils');
const { HTTP_STATUS } = require('../constants/httpStatus');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.ip);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return sendSuccess(res, {
      accessToken: result.tokens.accessToken,
      user: result.user,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN',
      });
    }
    const tokens = await authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken');
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Always return same message — don't reveal email existence
    return sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    await authService.resetPassword(token, newPassword, confirmPassword);
    return sendSuccess(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword, confirmPassword);
    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const userRepo = require('../repositories/userRepository');
    const user = await userRepo.findById(req.user.id);
    return sendSuccess(res, user, 'User profile retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, forgotPassword, resetPassword, changePassword, getMe };
