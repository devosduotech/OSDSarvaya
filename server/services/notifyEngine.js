const logger = require('../logger');
const whatsappClient = require('./whatsappClient');
const dbPromise = require('../database');

let io = null;

function setIO(socketIO) {
    io = socketIO;
}

async function sendDirectMessage(phone, message, attachment, variables) {
    const waClient = whatsappClient.getClient();

    if (!waClient || !waClient.info) {
        throw new Error('WhatsApp not connected');
    }

    const formatted = whatsappClient.normalizePhone(phone);

    const contactVars = variables || {};
    const finalMessage = whatsappClient.applyTemplateVariables(message, contactVars);

    const numberId = await Promise.race([
        waClient.getNumberId(formatted),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getNumberId timeout')), 30000))
    ]);

    if (!numberId) {
        throw new Error(`Number ${formatted} is not registered on WhatsApp`);
    }

    if (attachment && attachment.data) {
        const { mimeType, data, filename } = attachment;
        const isVideo = mimeType.startsWith('video/');

        if (isVideo) {
            const media = new whatsappClient.MessageMedia('application/octet-stream', data, filename);
            await waClient.sendMessage(numberId._serialized, media);
        } else {
            const media = new whatsappClient.MessageMedia(mimeType, data, filename);
            await waClient.sendMessage(numberId._serialized, media, { caption: finalMessage });
        }
    } else {
        await waClient.sendMessage(numberId._serialized, finalMessage);
    }

    return { phone: formatted, status: 'sent' };
}

async function sendNotification({ to, message, variables, attachment, externalId, apiKey }) {
    const db = await dbPromise;
    const results = [];

    if (!to || !Array.isArray(to) || to.length === 0) {
        throw new Error('"to" must be a non-empty array of phone numbers');
    }

    if (!message || !message.trim()) {
        throw new Error('"message" is required');
    }

    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, { key, value }) => {
        acc[key] = isNaN(Number(value)) ? value : Number(value);
        return acc;
    }, {});
    const messagesPerHour = (apiKey && apiKey.rateLimit > 0) ? apiKey.rateLimit : (settingsObj.messagesPerHour || 30);
    const baseDelay = Math.round(3600000 / messagesPerHour);
    const minMessageDelay = Math.max(baseDelay, 5000);

    const getRandomDelay = (baseMs) => {
        const jitter = Math.random() * (baseMs * 0.5);
        return Math.round(baseMs + jitter);
    };

    for (const phone of to) {
        const formatted = whatsappClient.normalizePhone(String(phone));
        const contactVars = (variables && variables[formatted]) || (variables && variables[phone]) || {};

        let logId = `notif_${Date.now()}_${formatted}`;

        try {
            let recipientName = contactVars.name || null;

            const existingContact = await db.get('SELECT * FROM contacts WHERE phone = ?', [formatted]);
            if (!existingContact) {
                await db.run(
                    'INSERT INTO contacts (id, name, phone, email, tags, optedIn) VALUES (?, ?, ?, ?, ?, ?)',
                    [`contact_${Date.now()}_${formatted}`, recipientName || formatted, formatted, '', '', 1]
                );
            } else {
                recipientName = existingContact.name;
            }

            if (existingContact && (existingContact.optedIn === 0 || existingContact.optedInOutAt)) {
                await db.run(
                    'INSERT INTO notification_log (id, api_key_id, api_key_name, recipient_phone, recipient_name, message, status, external_id, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [logId, apiKey?.id || null, apiKey?.name || null, formatted, recipientName, message, 'skipped', externalId || null, 'Contact opted out', new Date().toISOString()]
                );
                results.push({ phone: formatted, status: 'skipped', reason: 'Contact opted out' });
                continue;
            }

            const sendResult = await sendDirectMessage(formatted, message, attachment, contactVars);

            await db.run(
                'INSERT INTO notification_log (id, api_key_id, api_key_name, recipient_phone, recipient_name, message, status, external_id, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, apiKey?.id || null, apiKey?.name || null, formatted, recipientName, message, 'sent', externalId || null, new Date().toISOString(), new Date().toISOString()]
            );

            results.push({ phone: formatted, status: 'sent' });

            const dispatchWebhook = require('../utils/webhookDispatcher');
            dispatchWebhook('message.sent', {
                externalId,
                recipient: formatted,
                recipientName,
                status: 'sent',
                source: 'api'
            });

        } catch (err) {
            logger.error({ err, phone: formatted }, 'Notification send failed');

            await db.run(
                'INSERT INTO notification_log (id, api_key_id, api_key_name, recipient_phone, recipient_name, message, status, external_id, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, apiKey?.id || null, apiKey?.name || null, formatted, contactVars.name || null, message, 'failed', externalId || null, err.message, new Date().toISOString()]
            );

            results.push({ phone: formatted, status: 'failed', error: err.message });

            const dispatchWebhook = require('../utils/webhookDispatcher');
            dispatchWebhook('message.failed', {
                externalId,
                recipient: formatted,
                recipientName: contactVars.name || null,
                status: 'failed',
                error: err.message,
                source: 'api'
            });
        }

        if (to.indexOf(phone) < to.length - 1) {
            await new Promise(r => setTimeout(r, getRandomDelay(minMessageDelay)));
        }
    }

    return results;
}

async function sendGroupNotification({ groupId, templateId, variables, externalId, apiKey }) {
    const db = await dbPromise;

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!group) {
        throw new Error('Group not found');
    }

    const template = await db.get('SELECT * FROM campaign_templates WHERE id = ?', [templateId]);
    if (!template) {
        throw new Error('Template not found');
    }

    if (template.attachment) {
        try {
            template.attachment = JSON.parse(template.attachment);
        } catch (e) {
            template.attachment = null;
        }
    }

    const contacts = await db.all(
        `SELECT c.* FROM contacts c
         JOIN group_contacts gc ON c.id = gc.contact_id
         WHERE gc.group_id = ?
         AND (c.optedIn IS NULL OR c.optedIn = 1)`,
        [groupId]
    );

    if (contacts.length === 0) {
        throw new Error('No opted-in contacts found in the group');
    }

    const to = contacts.map(c => c.phone);
    const enrichedVars = { ...variables };
    for (const contact of contacts) {
        enrichedVars[contact.phone] = {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            ...(variables && variables[contact.phone] ? variables[contact.phone] : {})
        };
    }

    return sendNotification({
        to,
        message: template.message,
        variables: enrichedVars,
        attachment: template.attachment || undefined,
        externalId,
        apiKey
    });
}

async function getNotificationStatus(externalId) {
    const db = await dbPromise;

    const logs = await db.all(
        'SELECT * FROM notification_log WHERE external_id = ? ORDER BY created_at DESC',
        [externalId]
    );

    return logs;
}

async function getNotificationLogs({ page = 1, limit = 50, status, apiKeyId, fromDate, toDate }) {
    const db = await dbPromise;

    let query = 'SELECT * FROM notification_log WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (apiKeyId) {
        query += ' AND api_key_id = ?';
        params.push(apiKeyId);
    }
    if (fromDate) {
        query += ' AND created_at >= ?';
        params.push(fromDate);
    }
    if (toDate) {
        query += ' AND created_at <= ?';
        params.push(toDate);
    }

    query += ' ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.all(query, params);
}

module.exports = {
    sendDirectMessage,
    sendNotification,
    sendGroupNotification,
    getNotificationStatus,
    getNotificationLogs,
    setIO
};