class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    message = 'Referenced record not found.';
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { message = 'Invalid token.'; statusCode = 401; }
  if (err.name === 'TokenExpiredError') { message = 'Token expired.'; statusCode = 401; }

  // Validation errors
  if (err.name === 'ValidationError') statusCode = 422;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
};

module.exports = { AppError, errorHandler, notFound };
