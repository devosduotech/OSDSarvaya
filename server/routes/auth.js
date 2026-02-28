const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const dbPromise = require('../database');

const router = express.Router();

// Check if admin exists (for setup wizard)
router.get('/check', async (req, res) => {
    try {
        const db = await dbPromise;
        const adminExists = db.all("SELECT COUNT(*) as count FROM admin_user");
        const exists = adminExists[0]?.count > 0;
        res.json({ exists });
    } catch (err) {
        logger.error({ err }, 'Error checking admin existence');
        res.status(500).json({ error: 'Server error' });
    }
});

// Setup admin user (first-time)
router.post('/setup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Password validation: min 8 chars, 1 uppercase, 1 numeric
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters with 1 uppercase letter and 1 numeric digit' 
            });
        }

        const db = await dbPromise;

        // Check if admin already exists
        const existing = db.all("SELECT COUNT(*) as count FROM admin_user");
        if (existing[0]?.count > 0) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = bcrypt.hashSync(password, saltRounds);

        // Generate JWT secret
        const jwtSecret = require('crypto').randomBytes(64).toString('hex');

        // Create admin user
        db.run(
            "INSERT INTO admin_user (username, password, jwt_secret) VALUES (?, ?, ?)",
            [username, hashedPassword, jwtSecret]
        );

        // Store JWT secret in app_config
        db.run(
            "INSERT OR REPLACE INTO app_config (key, value) VALUES ('jwt_secret', ?)",
            [jwtSecret]
        );

        // Generate JWT token
        const token = jwt.sign(
            { username, role: 'admin' },
            jwtSecret,
            { expiresIn: '7d' }
        );

        logger.info(`Admin user created: ${username}`);

        res.json({ 
            success: true, 
            token,
            username 
        });
    } catch (err) {
        logger.error({ err }, 'Error creating admin user');
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const db = await dbPromise;

        // Get admin user
        const admin = db.get("SELECT * FROM admin_user WHERE username = ?", [username]);
        
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const valid = bcrypt.compareSync(password, admin.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get JWT secret
        const config = db.get("SELECT value FROM app_config WHERE key = 'jwt_secret'");
        const jwtSecret = config ? config.value : null;

        if (!jwtSecret) {
            logger.error('JWT secret not found');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Generate JWT token (7 days)
        const token = jwt.sign(
            { username: admin.username, role: 'admin' },
            jwtSecret,
            { expiresIn: '7d' }
        );

        logger.info(`Admin logged in: ${username}`);

        res.json({ 
            success: true, 
            token,
            username: admin.username 
        });
    } catch (err) {
        logger.error({ err }, 'Error during login');
        res.status(500).json({ error: 'Server error' });
    }
});

// Change password
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        // Password validation: min 8 chars, 1 uppercase, 1 numeric
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters with 1 uppercase letter and 1 numeric digit' 
            });
        }

        const db = await dbPromise;

        // Get JWT secret
        const config = db.get("SELECT value FROM app_config WHERE key = 'jwt_secret'");
        const jwtSecret = config ? config.value : null;

        if (!jwtSecret) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (e) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Get admin user
        const admin = db.get("SELECT * FROM admin_user WHERE username = ?", [decoded.username]);
        
        if (!admin) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Verify current password
        const valid = bcrypt.compareSync(currentPassword, admin.password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

        // Update password
        db.run(
            "UPDATE admin_user SET password = ?, updated_at = datetime('now') WHERE id = ?",
            [hashedPassword, admin.id]
        );

        logger.info(`Password changed for: ${decoded.username}`);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        logger.error({ err }, 'Error changing password');
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
