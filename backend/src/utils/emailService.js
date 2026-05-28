const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Build a nodemailer transporter from environment variables.
 * Returns null if SMTP is not configured — callers fall back to console logging.
 */
const buildTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    auth: { user, pass },
  });
};

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Support Platform';
const FROM_ADDRESS = process.env.SMTP_USER || 'no-reply@support.example.com';
const FROM = `"${FROM_NAME}" <${FROM_ADDRESS}>`;

/**
 * Send an email via SMTP.
 * Falls back to logging the email details to the console if SMTP is not configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = buildTransporter();

  if (!transporter) {
    // Dev fallback — log instead of throwing
    logger.info('[emailService] SMTP not configured. Email details below:');
    logger.info(`  To:      ${to}`);
    logger.info(`  Subject: ${subject}`);
    logger.info(`  Body:    ${text || '(HTML only)'}`);
    return;
  }

  await transporter.sendMail({ from: FROM, to, subject, html, text });
  logger.info(`[emailService] Email sent to ${to} — "${subject}"`);
};

/**
 * Send a password reset link to the user.
 * @param {string} email       — Recipient email address
 * @param {string} firstName   — Recipient first name for personalisation
 * @param {string} rawToken    — The raw (un-hashed) reset token
 */
const sendPasswordResetEmail = async (email, firstName, rawToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

  const subject = 'Reset your password';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Support Platform</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                We received a request to reset your password. Click the button below to choose a new one.
                This link is valid for <strong>30 minutes</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}"
                   style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;
                          padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Reset Password
                </a>
              </div>
              <p style="margin:24px 0 8px;color:#475569;font-size:13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${resetLink}" style="color:#1d4ed8;font-size:13px;">${resetLink}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                If you did not request a password reset, you can safely ignore this email.
                Your password will not change until you click the link above.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    `Hi ${firstName},`,
    '',
    'We received a request to reset your password.',
    `Click the link below (valid for 30 minutes):`,
    '',
    resetLink,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  await sendEmail({ to: email, subject, html, text });

  // Always log the link in dev so testers can use it without a mail server
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[emailService] Password reset link: ${resetLink}`);
  }
};

module.exports = { sendEmail, sendPasswordResetEmail };
