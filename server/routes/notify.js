const express = require('express');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');
const notifyEngine = require('../services/notifyEngine');
const whatsappClient = require('../services/whatsappClient');
const campaignEngine = require('../services/campaignEngine');

router.post('/send', async (req, res) => {
    const { to, message, variables, attachment, externalId, scheduleAt } = req.body;
    const apiKey = req.apiKey;

    if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ success: false, message: '"to" must be a non-empty array of phone numbers' });
    }

    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: '"message" is required' });
    }

    if (whatsappClient.getStatus() !== 'CONNECTED') {
        return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
    }

    if (campaignEngine.getCampaignState().isCampaignRunning) {
        return res.status(202).json({
            success: false,
            message: 'A campaign is currently running. Please try again later or use /api/notify/bulk to queue.',
            retryAfter: 60
        });
    }

    try {
        const results = await notifyEngine.sendNotification({
            to,
            message,
            variables: variables || {},
            attachment,
            externalId,
            apiKey
        });

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        logger.info({
            apiKeyName: apiKey?.name,
            total: to.length,
            sent: successCount,
            failed: failedCount,
            skipped: skippedCount,
            externalId
        }, 'Notification send completed');

        res.json({
            success: true,
            notificationId: `notif_${Date.now()}`,
            externalId: externalId || null,
            summary: {
                total: results.length,
                sent: successCount,
                failed: failedCount,
                skipped: skippedCount
            },
            results
        });

    } catch (err) {
        logger.error({ err }, 'Notification send error');
        res.status(500).json({ success: false, message: err.message || 'Failed to send notification' });
    }
});

router.post('/bulk', async (req, res) => {
    const { groupId, templateId, variables, externalId, scheduleAt } = req.body;
    const apiKey = req.apiKey;

    if (!groupId) {
        return res.status(400).json({ success: false, message: '"groupId" is required' });
    }

    if (!templateId) {
        return res.status(400).json({ success: false, message: '"templateId" is required' });
    }

    if (whatsappClient.getStatus() !== 'CONNECTED') {
        return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
    }

    try {
        const db = await dbPromise;

        const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const template = await db.get('SELECT * FROM campaign_templates WHERE id = ?', [templateId]);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        const contacts = await db.all(
            `SELECT c.* FROM contacts c
             JOIN group_contacts gc ON c.id = gc.contact_id
             WHERE gc.group_id = ?
             AND (c.optedIn IS NULL OR c.optedIn = 1)`,
            [groupId]
        );

        if (contacts.length === 0) {
            return res.status(400).json({ success: false, message: 'No opted-in contacts found in the group' });
        }

        if (campaignEngine.getCampaignState().isCampaignRunning) {
            const lastQueued = await db.get(
                "SELECT MAX(queuePosition) as maxPos FROM campaign_runs WHERE status = 'Queued'"
            );
            const queuePosition = (lastQueued?.maxPos || 0) + 1;
            const runId = `run_${Date.now()}`;

            await db.run(
                `INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, queuePosition, external_id, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [runId, templateId, JSON.stringify([groupId]), 'Queued', queuePosition, externalId || null, new Date().toISOString()]
            );

            await db.run(
                `INSERT INTO reports (campaignRunId, totalContacts, sent, failed, delivered, read, progress) VALUES (?, ?, 0, 0, 0, 0, 0)`,
                [runId, contacts.length]
            );

            whatsappClient.emitActivity('campaign_queued', `Notification queued at position ${queuePosition}`, { runId, externalId });

            return res.status(202).json({
                success: true,
                queued: true,
                campaignRunId: runId,
                externalId: externalId || null,
                queuePosition,
                totalContacts: contacts.length,
                message: 'Campaign is currently running. Your notification has been queued.'
            });
        }

        const runId = `run_${Date.now()}`;

        await db.run(
            `INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, external_id, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [runId, templateId, JSON.stringify([groupId]), 'Sending', externalId || null, new Date().toISOString()]
        );

        await db.run(
            `INSERT INTO reports (campaignRunId, totalContacts, sent, failed, delivered, read, progress) VALUES (?, ?, 0, 0, 0, 0, 0)`,
            [runId, contacts.length]
        );

        campaignEngine.setCampaignRunning(true);

        campaignEngine.processRun(runId, templateId, [groupId])
            .catch(err => logger.error({ err }, 'Bulk notification processRun crashed'));

        whatsappClient.emitActivity('notification_sent', `Bulk notification started via API`, { runId, externalId, groupId });

        res.json({
            success: true,
            campaignRunId: runId,
            externalId: externalId || null,
            totalContacts: contacts.length,
            status: 'Sending'
        });

    } catch (err) {
        logger.error({ err }, 'Bulk notification error');
        res.status(500).json({ success: false, message: err.message || 'Failed to send bulk notification' });
    }
});

router.post('/template', async (req, res) => {
    const { templateId, to, variables, externalId } = req.body;
    const apiKey = req.apiKey;

    if (!templateId) {
        return res.status(400).json({ success: false, message: '"templateId" is required' });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ success: false, message: '"to" must be a non-empty array of phone numbers' });
    }

    if (whatsappClient.getStatus() !== 'CONNECTED') {
        return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
    }

    if (campaignEngine.getCampaignState().isCampaignRunning) {
        return res.status(202).json({
            success: false,
            message: 'A campaign is currently running. Please try again later.',
            retryAfter: 60
        });
    }

    try {
        const db = await dbPromise;
        const template = await db.get('SELECT * FROM campaign_templates WHERE id = ?', [templateId]);

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        let attachment = null;
        if (template.attachment) {
            try {
                attachment = JSON.parse(template.attachment);
            } catch (e) {
                attachment = null;
            }
        }

        const results = await notifyEngine.sendNotification({
            to,
            message: template.message,
            variables: variables || {},
            attachment: attachment || undefined,
            externalId,
            apiKey
        });

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        res.json({
            success: true,
            notificationId: `notif_${Date.now()}`,
            externalId: externalId || null,
            templateName: template.name,
            summary: {
                total: results.length,
                sent: successCount,
                failed: failedCount,
                skipped: skippedCount
            },
            results
        });

    } catch (err) {
        logger.error({ err }, 'Template notification error');
        res.status(500).json({ success: false, message: err.message || 'Failed to send template notification' });
    }
});

router.get('/status/:externalId', async (req, res) => {
    const { externalId } = req.params;

    try {
        const logs = await notifyEngine.getNotificationStatus(externalId);

        if (logs.length === 0) {
            return res.status(404).json({ success: false, message: 'No notifications found for this external ID' });
        }

        res.json({
            success: true,
            externalId,
            notifications: logs.map(l => ({
                id: l.id,
                recipientPhone: l.recipient_phone,
                recipientName: l.recipient_name,
                status: l.status,
                error: l.error,
                createdAt: l.created_at,
                deliveredAt: l.delivered_at
            }))
        });
    } catch (err) {
        logger.error({ err }, 'Failed to get notification status');
        res.status(500).json({ success: false, message: 'Failed to get notification status' });
    }
});

router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, status, apiKeyId, fromDate, toDate } = req.query;

        const logs = await notifyEngine.getNotificationLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            apiKeyId,
            fromDate,
            toDate
        });

        res.json({
            success: true,
            logs: logs.map(l => ({
                id: l.id,
                apiKeyId: l.api_key_id,
                apiKeyName: l.api_key_name,
                recipientPhone: l.recipient_phone,
                recipientName: l.recipient_name,
                message: l.message ? l.message.substring(0, 500) : null,
                status: l.status,
                externalId: l.external_id,
                error: l.error,
                createdAt: l.created_at,
                deliveredAt: l.delivered_at
            })),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        logger.error({ err }, 'Failed to get notification logs');
        res.status(500).json({ success: false, message: 'Failed to get notification logs' });
    }
});

module.exports = router;