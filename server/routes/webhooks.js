const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');
const { testWebhook: testWebhookDelivery } = require('../utils/webhookDispatcher');
const { isSafeWebhookUrl } = require('../utils/security');

const AVAILABLE_EVENTS = [
    'message.sent',
    'message.failed',
    'campaign.started',
    'campaign.completed',
    'campaign.stopped'
];

// Never expose signing secrets in list/read payloads; they are shown once
// at creation time only.
function stripSecret(webhook) {
    if (!webhook) return webhook;
    const { secret, ...rest } = webhook;
    return { ...rest, hasSecret: true };
}

function validateEvents(events) {
    return events.filter(e => AVAILABLE_EVENTS.includes(e));
}

router.get('/', async (req, res) => {
    try {
        const db = await dbPromise;
        const webhooks = await db.all('SELECT * FROM webhooks ORDER BY created_at DESC');

        const processed = webhooks.map(w => ({
            ...stripSecret(w),
            events: JSON.parse(w.events || '[]')
        }));

        res.json({ success: true, webhooks: processed, availableEvents: AVAILABLE_EVENTS });
    } catch (err) {
        logger.error({ err }, 'Failed to list webhooks');
        res.status(500).json({ success: false, message: 'Failed to list webhooks' });
    }
});

router.post('/', async (req, res) => {
    const { name, url, events } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Webhook name is required' });
    }

    if (!url || !url.trim()) {
        return res.status(400).json({ success: false, message: 'Webhook URL is required' });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one event is required' });
    }

    // SSRF guard: reject non-http(s) schemes and local/private targets
    const urlCheck = isSafeWebhookUrl(url.trim());
    if (!urlCheck.ok) {
        return res.status(400).json({ success: false, message: `Webhook URL rejected: ${urlCheck.reason}` });
    }

    const validEvents = validateEvents(events);
    if (validEvents.length === 0) {
        return res.status(400).json({
            success: false,
            message: `No valid events. Available events: ${AVAILABLE_EVENTS.join(', ')}`
        });
    }

    try {
        const db = await dbPromise;
        const id = `webhook_${Date.now()}`;
        const secret = crypto.randomBytes(32).toString('hex');
        const eventsJson = JSON.stringify(validEvents);

        await db.run(
            'INSERT INTO webhooks (id, name, url, secret, events, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
            [id, name.trim(), urlCheck.url.href, secret, eventsJson, new Date().toISOString()]
        );

        logger.info({ webhookId: id, webhookName: name }, 'Webhook created');

        res.status(201).json({
            success: true,
            webhook: {
                id,
                name: name.trim(),
                url: urlCheck.url.href,
                secret,
                events: validEvents,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        });
    } catch (err) {
        logger.error({ err }, 'Failed to create webhook');
        res.status(500).json({ success: false, message: 'Failed to create webhook' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, url, events, isActive } = req.body;

    try {
        const db = await dbPromise;
        const existing = await db.get('SELECT * FROM webhooks WHERE id = ?', [id]);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Webhook not found' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name.trim());
        }
        if (url !== undefined) {
            const urlCheck = isSafeWebhookUrl(url.trim());
            if (!urlCheck.ok) {
                return res.status(400).json({ success: false, message: `Webhook URL rejected: ${urlCheck.reason}` });
            }
            updates.push('url = ?');
            values.push(urlCheck.url.href);
        }
        if (events !== undefined && Array.isArray(events)) {
            const validEvents = validateEvents(events);
            if (validEvents.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `No valid events. Available events: ${AVAILABLE_EVENTS.join(', ')}`
                });
            }
            updates.push('events = ?');
            values.push(JSON.stringify(validEvents));
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(id);
        await db.run(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?`, values);

        const updated = await db.get('SELECT * FROM webhooks WHERE id = ?', [id]);
        updated.events = JSON.parse(updated.events || '[]');

        logger.info({ webhookId: id }, 'Webhook updated');

        res.json({ success: true, webhook: stripSecret(updated) });
    } catch (err) {
        logger.error({ err }, 'Failed to update webhook');
        res.status(500).json({ success: false, message: 'Failed to update webhook' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const db = await dbPromise;
        const result = await db.run('DELETE FROM webhooks WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Webhook not found' });
        }

        logger.info({ webhookId: id }, 'Webhook deleted');

        res.json({ success: true, message: 'Webhook deleted successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to delete webhook');
        res.status(500).json({ success: false, message: 'Failed to delete webhook' });
    }
});

router.post('/:id/test', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await testWebhookDelivery(id);
        res.json({ success: result.success, ...result });
    } catch (err) {
        logger.error({ err }, 'Webhook test failed');
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;