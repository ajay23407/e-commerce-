const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/db');
const { sendToken } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const {
  sendWelcomeEmail, sendVerifyEmail,
  sendPasswordResetEmail
} = require('../utils/email');

// ── REGISTER ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return next(new AppError('Name, email and password are required.', 400));
  if (password.length < 8)
    return next(new AppError('Password must be at least 8 characters.', 400));

  const existing = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing.rows.length) return next(new AppError('Email already registered.', 409));

  const hashed = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomBytes(32).toString('hex');

  const result = await query(`
    INSERT INTO users (name, email, password, phone, verify_token)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [name.trim(), email.toLowerCase(), hashed, phone || null, verifyToken]);

  const user = result.rows[0];

  // Create empty cart for user
  await query('INSERT INTO carts (user_id, items) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [user.id, JSON.stringify([])]);

  // Send emails (non-blocking)
  sendWelcomeEmail(user).catch(console.error);
  sendVerifyEmail(user, verifyToken).catch(console.error);

  sendToken(user, 201, res, 'Account created successfully!');
};

// ── LOGIN ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Email and password are required.', 400));

  const result = await query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password)))
    return next(new AppError('Invalid email or password.', 401));

  if (!user.is_active)
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));

  // Update last login
  await query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

  sendToken(user, 200, res, 'Welcome back!');
};

// ── LOGOUT ────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── GET ME ────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const result = await query(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM orders WHERE user_id=u.id) as order_count,
      (SELECT COUNT(*) FROM wishlists WHERE user_id=u.id) as wishlist_count
    FROM users u WHERE u.id=$1
  `, [req.user.id]);
  const { password, reset_token, verify_token, ...user } = result.rows[0];
  res.json({ success: true, user });
};

// ── UPDATE PROFILE ────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  const { name, phone } = req.body;
  const result = await query(`
    UPDATE users SET name=$1, phone=$2, updated_at=NOW()
    WHERE id=$3 RETURNING *
  `, [name || req.user.name, phone || req.user.phone, req.user.id]);
  const { password, ...user } = result.rows[0];
  res.json({ success: true, message: 'Profile updated.', user });
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return next(new AppError('Both current and new passwords are required.', 400));
  if (newPassword.length < 8)
    return next(new AppError('New password must be at least 8 characters.', 400));

  const result = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  const user = result.rows[0];

  if (!(await bcrypt.compare(currentPassword, user.password)))
    return next(new AppError('Current password is incorrect.', 401));

  const hashed = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [hashed, user.id]);

  res.json({ success: true, message: 'Password changed successfully.' });
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email is required.', 400));

  const result = await query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  // Always respond OK to prevent email enumeration
  if (!result.rows.length)
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query('UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3',
    [token, expires, user.id]);

  await sendPasswordResetEmail(user, token);

  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
};

// ── RESET PASSWORD ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8)
    return next(new AppError('Password must be at least 8 characters.', 400));

  const result = await query(`
    SELECT * FROM users WHERE reset_token=$1 AND reset_expires > NOW()
  `, [token]);

  if (!result.rows.length)
    return next(new AppError('Invalid or expired reset token.', 400));

  const user = result.rows[0];
  const hashed = await bcrypt.hash(password, 12);

  await query(`
    UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL, updated_at=NOW()
    WHERE id=$2
  `, [hashed, user.id]);

  sendToken(user, 200, res, 'Password reset successfully.');
};

// ── VERIFY EMAIL ──────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  const { token } = req.params;
  const result = await query('SELECT * FROM users WHERE verify_token=$1', [token]);
  if (!result.rows.length) return next(new AppError('Invalid verification link.', 400));

  await query(`
    UPDATE users SET is_verified=true, verify_token=NULL, updated_at=NOW() WHERE id=$1
  `, [result.rows[0].id]);

  res.json({ success: true, message: 'Email verified successfully!' });
};
