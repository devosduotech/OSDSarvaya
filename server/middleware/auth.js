
const jwt = require('jsonwebtoken');
const logger = require('../logger');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Strip extra quotes if present
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


module.exports = { verifyToken, verifySocketToken };
