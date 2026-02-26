const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');

function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 4;
    const segmentLength = 4;
    const parts = [];
    
    for (let s = 0; s < segments; s++) {
        let segment = '';
        for (let i = 0; i < segmentLength; i++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        parts.push(segment);
    }
    
    return `CAMP-${parts.join('-')}`;
}

router.post('/generate', async (req, res) => {
    try {
        const { customerEmail, customerName, purchaseDate } = req.body;
        
        if (!customerEmail) {
            return res.status(400).json({ success: false, message: 'Customer email is required' });
        }

        const licenseKey = generateLicenseKey();
        const db = await dbPromise;
        
        await db.run(
            `INSERT INTO licenses (license_key, customer_email, customer_name, purchase_date, activated, is_active) 
             VALUES (?, ?, ?, ?, 0, 1)`,
            licenseKey,
            customerEmail,
            customerName || '',
            purchaseDate || new Date().toISOString()
        );

        logger.info({ licenseKey, customerEmail }, 'License key generated');

        res.json({ 
            success: true, 
            licenseKey,
            customerEmail,
            customerName,
            purchaseDate
        });
    } catch (err) {
        logger.error({ err }, 'Failed to generate license key');
        res.status(500).json({ success: false, message: 'Failed to generate license key' });
    }
});

router.post('/activate', async (req, res) => {
    try {
        const { licenseKey, machineId } = req.body;

        if (!licenseKey || !machineId) {
            return res.status(400).json({ success: false, message: 'License key and machine ID are required' });
        }

        const db = await dbPromise;
        
        const license = await db.get(
            'SELECT * FROM licenses WHERE license_key = ? AND is_active = 1',
            licenseKey
        );

        if (!license) {
            logger.warn({ licenseKey }, 'Invalid license key activation attempt');
            return res.status(404).json({ success: false, message: 'Invalid license key' });
        }

        if (license.activated && license.machine_id !== machineId) {
            logger.warn({ licenseKey, machineId }, 'License already activated on different machine');
            return res.status(403).json({ 
                success: false, 
                message: 'License already activated on another computer. Please contact support.' 
            });
        }

        const activationDate = new Date().toISOString();
        
        if (!license.activated) {
            await db.run(
                `UPDATE licenses SET activated = 1, machine_id = ?, activation_date = ?, updated_at = ? 
                 WHERE license_key = ?`,
                machineId,
                activationDate,
                activationDate,
                licenseKey
            );
            
            logger.info({ licenseKey, machineId }, 'License activated successfully');
        }

        res.json({ 
            success: true, 
            message: 'License activated successfully',
            customerEmail: license.customer_email,
            customerName: license.customer_name
        });
    } catch (err) {
        logger.error({ err }, 'Failed to activate license');
        res.status(500).json({ success: false, message: 'Failed to activate license' });
    }
});

router.post('/validate', async (req, res) => {
    try {
        const { licenseKey, machineId } = req.body;

        if (!licenseKey || !machineId) {
            return res.status(400).json({ success: false, message: 'License key and machine ID are required' });
        }

        const db = await dbPromise;
        
        const license = await db.get(
            'SELECT * FROM licenses WHERE license_key = ? AND is_active = 1',
            licenseKey
        );

        if (!license) {
            return res.status(404).json({ 
                success: false, 
                valid: false,
                message: 'Invalid license key' 
            });
        }

        if (!license.activated) {
            return res.json({ 
                success: true, 
                valid: true,
                activated: false,
                message: 'License not yet activated' 
            });
        }

        if (license.machine_id !== machineId) {
            return res.status(403).json({ 
                success: false, 
                valid: false,
                message: 'License activated on different computer' 
            });
        }

        res.json({ 
            success: true, 
            valid: true,
            activated: true,
            customerEmail: license.customer_email,
            customerName: license.customer_name,
            activationDate: license.activation_date
        });
    } catch (err) {
        logger.error({ err }, 'Failed to validate license');
        res.status(500).json({ success: false, message: 'Failed to validate license' });
    }
});

router.get('/status/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const db = await dbPromise;
        
        const license = await db.get(
            'SELECT license_key, customer_email, customer_name, purchase_date, activated, activation_date, is_active, created_at FROM licenses WHERE license_key = ?',
            key
        );

        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }

        res.json({ success: true, license });
    } catch (err) {
        logger.error({ err }, 'Failed to get license status');
        res.status(500).json({ success: false, message: 'Failed to get license status' });
    }
});

router.get('/list', async (req, res) => {
    try {
        const db = await dbPromise;
        
        const licenses = await db.all(
            'SELECT license_key, customer_email, customer_name, purchase_date, activated, activation_date, is_active, created_at FROM licenses ORDER BY created_at DESC'
        );

        res.json({ success: true, licenses });
    } catch (err) {
        logger.error({ err }, 'Failed to list licenses');
        res.status(500).json({ success: false, message: 'Failed to list licenses' });
    }
});

router.put('/revoke/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const db = await dbPromise;
        
        const result = await db.run(
            'UPDATE licenses SET is_active = 0, updated_at = ? WHERE license_key = ?',
            new Date().toISOString(),
            key
        );

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }

        logger.info({ key }, 'License revoked');

        res.json({ success: true, message: 'License revoked successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to revoke license');
        res.status(500).json({ success: false, message: 'Failed to revoke license' });
    }
});

router.put('/reactivate/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { newMachineId } = req.body;
        const db = await dbPromise;
        
        const license = await db.get('SELECT * FROM licenses WHERE license_key = ?', key);
        
        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }

        await db.run(
            'UPDATE licenses SET machine_id = ?, activated = 1, activation_date = ?, updated_at = ? WHERE license_key = ?',
            newMachineId || null,
            new Date().toISOString(),
            new Date().toISOString(),
            key
        );

        logger.info({ key }, 'License reactivated');

        res.json({ success: true, message: 'License reactivated successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to reactivate license');
        res.status(500).json({ success: false, message: 'Failed to reactivate license' });
    }
});

module.exports = router;
