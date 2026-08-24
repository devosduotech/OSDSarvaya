const logger = require('../logger');

// Minimal fixed-window in-memory rate limiter (no external dependency).
// Suitable for a single-process deployment; counters reset on restart.
function createRateLimiter({ windowMs = 60000, max = 60, keyFn, name = 'limiter' } = {}) {
    const hits = new Map();

    // Periodically clear expired entries so the map cannot grow unbounded
    const sweeper = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, Math.max(windowMs, 30000));
    if (sweeper.unref) sweeper.unref();

    return function rateLimit(req, res, next) {
        let key = 'global';
        if (keyFn) {
            try {
                key = keyFn(req) || 'global';
            } catch (e) {
                key = 'global';
            }
        }

        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count += 1;

        if (entry.count > max) {
            const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            logger.warn({ limiter: name, key }, `Rate limit exceeded (${entry.count}/${max})`);
            res.setHeader('Retry-After', retryAfterSec);
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        return next();
    };
}

function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

module.exports = { createRateLimiter, getClientIp };
