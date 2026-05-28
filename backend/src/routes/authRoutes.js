const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { mustChangePassword } = require('../middlewares/mustChangePasswordMiddleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests' },
});

router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/forgot-password', resetLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// change-password: authenticated + must_change_password is explicitly allowed by the middleware
router.put('/change-password', authenticate, mustChangePassword, authController.changePassword);

module.exports = router;
