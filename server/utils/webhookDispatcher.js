const crypto = require('crypto');
const logger = require('../logger');
const dbPromise = require('../database');

function signPayload(payload, secret) {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

async function dispatchWebhook(event, data) {
    let webhooks;
    try {
        const db = await dbPromise;
        webhooks = await db.all('SELECT * FROM webhooks WHERE is_active = 1');
    } catch (err) {
        logger.error({ err }, 'Failed to fetch webhooks for dispatch');
        return;
    }

    if (!webhooks || webhooks.length === 0) return;

    const payload = {
        event,
        timestamp: new Date().toISOString(),
        data
    };

    for (const webhook of webhooks) {
        let events = [];
        try {
            events = JSON.parse(webhook.events);
        } catch (e) {
            events = [];
        }

        if (!events.includes(event)) continue;

        const signature = signPayload(payload, webhook.secret);

        const headers = {
            'Content-Type': 'application/json',
            'X-OSDSarvaya-Signature': `sha256=${signature}`,
            'X-OSDSarvaya-Event': event
        };

        deliverWebhook(webhook, payload, headers);
    }
}

function deliverWebhook(webhook, payload, headers, attempt = 1) {
    const maxRetries = 3;
    const retryDelays = [1000, 5000, 25000];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeout);
        if (response.ok) {
            logger.info({ webhookId: webhook.id, event: payload.event }, 'Webhook delivered successfully');
        } else {
            logger.warn({ webhookId: webhook.id, event: payload.event, status: response.status }, 'Webhook delivered with non-OK status');
        }
    })
    .catch(err => {
        clearTimeout(timeout);
        logger.error({ err, webhookId: webhook.id, event: payload.event, attempt }, 'Webhook delivery failed');

        if (attempt < maxRetries) {
            const delay = retryDelays[attempt - 1] || 5000;
            logger.info({ webhookId: webhook.id, attempt: attempt + 1 }, `Retrying webhook in ${delay}ms`);
            setTimeout(() => {
                deliverWebhook(webhook, payload, headers, attempt + 1);
            }, delay);
        } else {
            logger.error({ webhookId: webhook.id, event: payload.event }, 'Webhook delivery failed after max retries');
        }
    });
}

async function testWebhook(webhookId) {
    const db = await dbPromise;
    const webhook = await db.get('SELECT * FROM webhooks WHERE id = ?', [webhookId]);

    if (!webhook) {
        throw new Error('Webhook not found');
    }

    const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
            message: 'This is a test webhook from OSDSarvaya',
            test: true
        }
    };

    const signature = signPayload(payload, webhook.secret);

    const headers = {
        'Content-Type': 'application/json',
        'X-OSDSarvaya-Signature': `sha256=${signature}`,
        'X-OSDSarvaya-Event': 'test'
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);

        return {
            success: response.ok,
            statusCode: response.status,
            message: response.ok ? 'Test webhook delivered successfully' : `Webhook endpoint returned status ${response.status}`
        };
    } catch (err) {
        return {
            success: false,
            statusCode: 0,
            message: `Failed to deliver test webhook: ${err.message}`
        };
    }
}

module.exports = dispatchWebhook;
module.exports.testWebhook = testWebhook;
module.exports.signPayload = signPayload;