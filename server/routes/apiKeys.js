const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');

router.get('/', async (req, res) => {
    try {
        const db = await dbPromise;
        const keys = await db.all(
            'SELECT id, name, key_prefix, rate_limit, is_active, created_at, last_used_at FROM api_keys ORDER BY created_at DESC'
        );
        res.json({ success: true, apiKeys: keys });
    } catch (err) {
        logger.error({ err }, 'Failed to list API keys');
        res.status(500).json({ success: false, message: 'Failed to list API keys' });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'API key name is required' });
    }

    try {
        const db = await dbPromise;
        const id = `apikey_${Date.now()}`;
        const rawKey = `osds_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12);

        await db.run(
            'INSERT INTO api_keys (id, name, key_hash, key_prefix, rate_limit, is_active, created_at) VALUES (?, ?, ?, ?, 0, 1, ?)',
            [id, name.trim(), keyHash, keyPrefix, new Date().toISOString()]
        );

        logger.info({ apiKeyId: id, apiKeyName: name }, 'API key created');

        res.status(201).json({
            success: true,
            apiKey: {
                id,
                name: name.trim(),
                key: rawKey,
                keyPrefix,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        });
    } catch (err) {
        logger.error({ err }, 'Failed to create API key');
        res.status(500).json({ success: false, message: 'Failed to create API key' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, isActive, rateLimit } = req.body;

    try {
        const db = await dbPromise;
        const existing = await db.get('SELECT * FROM api_keys WHERE id = ?', [id]);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'API key not found' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name.trim());
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }
        if (rateLimit !== undefined) {
            updates.push('rate_limit = ?');
            values.push(rateLimit);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(id);
        await db.run(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`, values);

        const updated = await db.get(
            'SELECT id, name, key_prefix, rate_limit, is_active, created_at, last_used_at FROM api_keys WHERE id = ?',
            [id]
        );

        logger.info({ apiKeyId: id }, 'API key updated');

        res.json({ success: true, apiKey: updated });
    } catch (err) {
        logger.error({ err }, 'Failed to update API key');
        res.status(500).json({ success: false, message: 'Failed to update API key' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const db = await dbPromise;
        const result = await db.run('DELETE FROM api_keys WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'API key not found' });
        }

        logger.info({ apiKeyId: id }, 'API key revoked');

        res.json({ success: true, message: 'API key revoked successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to revoke API key');
        res.status(500).json({ success: false, message: 'Failed to revoke API key' });
    }
});

module.exports = router;