const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');
const { getMachineId } = require('../utils/machineId');

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://dvarika.osduotech.com';
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;
const GRACE_PERIOD_HOURS = 24;

async function callERPNext(method, data) {
    console.log('=== ERPNext API Call ===');
    console.log('ERPNEXT_URL:', ERPNEXT_URL);
    console.log('ERPNEXT_API_KEY set:', !!ERPNEXT_API_KEY);
    console.log('ERPNEXT_API_SECRET set:', !!ERPNEXT_API_SECRET);
    console.log('process.resourcesPath:', process.resourcesPath);
    
    if (!ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
        const errMsg = 'ERPNext API credentials not configured - check production.env. ERPNEXT_API_KEY: ' + (ERPNEXT_API_KEY ? 'set' : 'UNDEFINED') + ', ERPNEXT_API_SECRET: ' + (ERPNEXT_API_SECRET ? 'set' : 'UNDEFINED');
        logger.error(errMsg);
        throw new Error(errMsg);
    }

    const url = `${ERPNEXT_URL}/api/method/osdsarvaya_app.api.${method}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.message) {
            return result.message;
        }
        
        return result;
    } catch (err) {
        logger.error({ err }, 'ERPNext API call failed');
        throw err;
    }
}

async function getCachedValidation(licenseKey) {
    const db = await dbPromise;
    const cached = await db.get(
        'SELECT * FROM license_cache WHERE license_key = ?',
        licenseKey
    );
    return cached;
}

async function setCachedValidation(licenseKey, isValid, message, customerData) {
    const db = await dbPromise;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + GRACE_PERIOD_HOURS);

    await db.run(
        `INSERT OR REPLACE INTO license_cache (license_key, is_valid, message, customer_email, customer_name, validated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            licenseKey,
            isValid ? 1 : 0,
            message,
            customerData?.customer_email || null,
            customerData?.customer || null,
            new Date().toISOString(),
            expiresAt.toISOString()
        ]
    );
}

router.post('/activate', async (req, res) => {
    try {
        const { licenseKey, email } = req.body;
        const machineId = getMachineId();

        console.log('=== License Activation ===');
        console.log('licenseKey:', licenseKey);
        console.log('email:', email);
        console.log('machineId:', machineId);

        if (!licenseKey || !email) {
            return res.status(400).json({ success: false, message: 'License key and email are required' });
        }

        logger.info({ licenseKey, email, machineId }, 'Attempting license activation');

        let erpnextResult;
        try {
            erpnextResult = await callERPNext('activate_license', {
                license_key: licenseKey,
                machine_id: machineId,
                email: email
            });
        } catch (err) {
            logger.error({ err }, 'ERPNext activation failed, checking cache');
            const cached = await getCachedValidation(licenseKey);
            if (cached && new Date(cached.expires_at) > new Date()) {
                return res.json({
                    success: true,
                    message: 'License activated (cached)',
                    licenseKey: licenseKey,
                    customerEmail: cached.customer_email,
                    customerName: cached.customer_name,
                    cached: true
                });
            }
            return res.status(503).json({ 
                success: false, 
                message: 'Unable to connect to license server. Please check your internet connection.' 
            });
        }

        if (!erpnextResult.success) {
            logger.warn({ licenseKey, erpnextResult }, 'License activation failed from ERPNext');
            return res.json({
                success: false,
                message: erpnextResult.message || 'Activation failed'
            });
        }

        const db = await dbPromise;
        const activationDate = new Date().toISOString();
        
        await db.run(
            `INSERT OR REPLACE INTO licenses (license_key, customer_email, customer_name, machine_id, activated, is_active, activation_date, updated_at)
             VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
            [
                licenseKey,
                email,
                erpnextResult.customer || '',
                machineId,
                activationDate,
                activationDate
            ]
        );

        await setCachedValidation(licenseKey, true, 'License activated', {
            customer_email: email,
            customer: erpnextResult.customer
        });

        logger.info({ licenseKey, machineId, email }, 'License activated successfully');

        res.json({
            success: true,
            message: 'License activated successfully',
            licenseKey: licenseKey,
            customerEmail: erpnextResult.customer_email,
            customerName: erpnextResult.customer
        });
    } catch (err) {
        logger.error({ err }, 'Failed to activate license');
        res.status(500).json({ success: false, message: 'Failed to activate license' });
    }
});

router.post('/validate', async (req, res) => {
    try {
        const { licenseKey } = req.body;
        const machineId = getMachineId();

        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'License key is required' });
        }

        let erpnextResult;
        try {
            erpnextResult = await callERPNext('validate_license', {
                license_key: licenseKey,
                machine_id: machineId
            });
        } catch (err) {
            logger.error({ err }, 'ERPNext validation failed, checking cache');
            const cached = await getCachedValidation(licenseKey);
            if (cached && new Date(cached.expires_at) > new Date()) {
                return res.json({
                    success: true,
                    valid: cached.is_valid === 1,
                    activated: cached.is_valid === 1,
                    customerEmail: cached.customer_email,
                    customerName: cached.customer_name,
                    activationDate: cached.validated_at,
                    message: cached.message,
                    cached: true,
                    gracePeriod: true
                });
            }
            return res.status(503).json({
                success: false,
                valid: false,
                message: 'Unable to connect to license server and no valid cache available'
            });
        }

        if (!erpnextResult.valid) {
            return res.json({
                success: false,
                valid: false,
                message: erpnextResult.message || 'License validation failed'
            });
        }

        const db = await dbPromise;
        await db.run(
            `INSERT OR REPLACE INTO licenses (license_key, customer_email, customer_name, machine_id, activated, is_active, activation_date, updated_at)
             VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
            [
                licenseKey,
                erpnextResult.customer_email || '',
                erpnextResult.customer || '',
                machineId,
                erpnextResult.activation_date || new Date().toISOString(),
                new Date().toISOString()
            ]
        );

        await setCachedValidation(licenseKey, true, 'License valid', {
            customer_email: erpnextResult.customer_email,
            customer: erpnextResult.customer
        });

        res.json({
            success: true,
            valid: true,
            activated: true,
            customerEmail: erpnextResult.customer_email,
            customerName: erpnextResult.customer,
            activationDate: erpnextResult.activation_date
        });
    } catch (err) {
        logger.error({ err }, 'Failed to validate license');
        res.status(500).json({ success: false, message: 'Failed to validate license' });
    }
});

router.post('/deactivate', async (req, res) => {
    try {
        const { licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'License key is required' });
        }

        let erpnextResult;
        try {
            erpnextResult = await callERPNext('deactivate_license', {
                license_key: licenseKey
            });
        } catch (err) {
            return res.status(503).json({
                success: false,
                message: 'Unable to connect to license server'
            });
        }

        if (!erpnextResult.success) {
            return res.json({
                success: false,
                message: erpnextResult.message || 'Deactivation failed'
            });
        }

        const db = await dbPromise;
        await db.run(
            'UPDATE licenses SET machine_id = NULL, activated = 0, activation_date = NULL, updated_at = ? WHERE license_key = ?',
            [new Date().toISOString(), licenseKey]
        );

        await db.run(
            'DELETE FROM license_cache WHERE license_key = ?',
            [licenseKey]
        );

        logger.info({ licenseKey }, 'License deactivated successfully');

        res.json({
            success: true,
            message: 'License deactivated successfully'
        });
    } catch (err) {
        logger.error({ err }, 'Failed to deactivate license');
        res.status(500).json({ success: false, message: 'Failed to deactivate license' });
    }
});

router.get('/status/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const db = await dbPromise;
        
        const license = await db.get(
            'SELECT license_key, customer_email, customer_name, machine_id, activated, activation_date, is_active, created_at FROM licenses WHERE license_key = ?',
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

router.get('/check', async (req, res) => {
    try {
        const db = await dbPromise;
        
        const license = await db.get(
            'SELECT license_key, customer_email, customer_name, machine_id, activated, activation_date, is_active FROM licenses WHERE activated = 1 ORDER BY activation_date DESC LIMIT 1'
        );

        if (!license) {
            return res.json({ 
                success: true, 
                activated: false,
                message: 'No active license found'
            });
        }

        res.json({
            success: true,
            activated: true,
            licenseKey: license.license_key,
            customerEmail: license.customer_email,
            customerName: license.customer_name,
            activationDate: license.activation_date
        });
    } catch (err) {
        logger.error({ err }, 'Failed to check license status');
        res.status(500).json({ success: false, message: 'Failed to check license status' });
    }
});

router.get('/machine-id', (req, res) => {
    const machineId = getMachineId();
    res.json({ success: true, machineId });
});

module.exports = router;
