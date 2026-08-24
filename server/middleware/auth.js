const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../logger');
const dbPromise = require('../database');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (token) {
        token = token.replace(/^["']|["']$/g, '');
    }

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send('Invalid Token');
    }
    return next();
};

const verifySocketToken = (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
        logger.warn('Socket connection rejected: No token provided.');
        return next(new Error('Authentication error: Token not provided.'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            logger.warn('Socket connection rejected: Invalid token.');
            return next(new Error('Authentication error: Invalid token.'));
        }
        socket.user = decoded;
        next();
    });
};

const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API key required. Provide x-api-key header.' });
    }

    if (!apiKey.startsWith('osds_')) {
        return res.status(401).json({ success: false, message: 'Invalid API key format' });
    }

    try {
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const db = await dbPromise;

        const keyRecord = await db.get(
            'SELECT id, name, key_prefix, rate_limit, is_active FROM api_keys WHERE key_hash = ?',
            [keyHash]
        );

        if (!keyRecord) {
            logger.warn({ keyPrefix: apiKey.substring(0, 12) }, 'API key not found');
            return res.status(401).json({ success: false, message: 'Invalid API key' });
        }

        if (!keyRecord.is_active) {
            logger.warn({ keyId: keyRecord.id, keyName: keyRecord.name }, 'Inactive API key used');
            return res.status(401).json({ success: false, message: 'API key is deactivated' });
        }

        await db.run(
            'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
            [new Date().toISOString(), keyRecord.id]
        );

        req.apiKey = {
            id: keyRecord.id,
            name: keyRecord.name,
            rateLimit: keyRecord.rate_limit || 0
        };

        next();
    } catch (err) {
        logger.error({ err }, 'API key authentication error');
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};

const requireAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (token) {
        token = token.replace(/^["']|["']$/g, '');
    }

    if (apiKey) {
        return apiKeyAuth(req, res, next);
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid Token' });
        }
    }

    return res.status(401).json({ success: false, message: 'Authentication required. Provide Authorization header or x-api-key header.' });
};

module.exports = { verifyToken, verifySocketToken, apiKeyAuth, requireAuth };