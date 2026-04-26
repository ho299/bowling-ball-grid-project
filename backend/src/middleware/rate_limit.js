const rateLimit = require('express-rate-limit');

// General limiter: applied to all API routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Auth limiter: stricter, for login and registration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again in 15 minutes.' },
});

module.exports = { generalLimiter, authLimiter };