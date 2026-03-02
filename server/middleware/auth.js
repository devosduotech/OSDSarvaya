
const jwt = require('jsonwebtoken');
const logger = require('../logger');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('=== verifyToken middleware ===');
    console.log('authHeader:', authHeader);
    console.log('token:', token ? `${token.substring(0, 30)}...` : 'NULL');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    if (!token) {
        console.log('No token provided - returning 403');
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified, user:', decoded);
        req.user = decoded;
    } catch (err) {
        console.log('Token verify error:', err.message);
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


module.exports = { verifyToken, verifySocketToken };
