const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Generate tokens
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Send token in cookie + response
const sendToken = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user.id, user.role);
  const cookieOptions = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  res.cookie('token', token, cookieOptions);
  const { password, reset_token, verify_token, ...safeUser } = user;
  res.status(statusCode).json({ success: true, message, token, user: safeUser });
};

// ── PROTECT MIDDLEWARE ─────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return res.status(401).json({ success: false, message: 'Please log in to continue.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT * FROM users WHERE id=$1 AND is_active=true', [decoded.id]);

    if (!result.rows.length)
      return res.status(401).json({ success: false, message: 'User no longer exists.' });

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ── OPTIONAL AUTH (doesn't fail if no token) ──────────────────
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
    else if (req.cookies?.token) token = req.cookies.token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT * FROM users WHERE id=$1 AND is_active=true', [decoded.id]);
    if (result.rows.length) req.user = result.rows[0];
    next();
  } catch {
    next();
  }
};

// ── ROLE GUARD ────────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  next();
};

module.exports = { generateToken, sendToken, protect, optionalAuth, restrictTo };
