const logger = require('../logger');
const whatsappClient = require('./whatsappClient');
const dbPromise = require('../database');

let isCampaignRunning = false;
let shouldStopCampaign = false;
let currentRunId = null;

function getCampaignState() {
    return { isCampaignRunning, shouldStopCampaign, currentRunId };
}

function setCampaignRunning(val) {
    isCampaignRunning = val;
}

function setCurrentRunId(id) {
    currentRunId = id;
}

async function processRun(runId, templateId, groupIds) {
    const waClient = whatsappClient.getClient();
    const db = await dbPromise;
    let sent = 0;
    let failed = 0;
    currentRunId = runId;
    shouldStopCampaign = false;

    logger.info(`PROCESS RUN STARTED -> ${runId}`);
    logger.info(`Group IDs: ${JSON.stringify(groupIds)}`);

    try {
        if (!waClient || !waClient.info) {
            throw new Error('WhatsApp not ready');
        }

        const template = await db.get(
            `SELECT * FROM campaign_templates WHERE id=?`,
            [templateId]
        );

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

        let groupIdsArray = groupIds;
        if (typeof groupIds === 'string') {
            try {
                groupIdsArray = JSON.parse(groupIds);
            } catch (e) {
                groupIdsArray = [groupIds];
            }
        }

        if (!Array.isArray(groupIdsArray)) {
            groupIdsArray = [groupIdsArray];
        }

        if (groupIdsArray.length === 0) {
            throw new Error('No groups selected');
        }

        logger.info(`Querying contacts for groups: ${JSON.stringify(groupIdsArray)}`);

        const contacts = await db.all(
            `SELECT c.*
             FROM contacts c
             JOIN group_contacts gc
               ON c.id = gc.contact_id
             WHERE gc.group_id IN (${groupIdsArray.map(() => '?').join(',')})
             AND (c.optedIn IS NULL OR c.optedIn = 1)`,
            groupIdsArray
        );

        logger.info(`Contacts loaded: ${contacts.length}`);

        if (contacts.length === 0) {
            logger.warn('No opted-in contacts found in selected groups');

            await db.run(
                `UPDATE reports SET totalContacts=0, sent=0, failed=0, progress=100 WHERE campaignRunId=?`,
                [runId]
            );
            await db.run(
                `UPDATE campaign_runs SET status='Sent' WHERE id=?`,
                [runId]
            );

            isCampaignRunning = false;
            currentRunId = null;
            shouldStopCampaign = false;

            whatsappClient.emitActivity('campaign_completed', 'Campaign completed - no opted-in contacts found in selected groups', { runId });
            return;
        }

        const settings = await db.all(`SELECT * FROM settings`);
        const settingsObj = settings.reduce((acc, { key, value }) => {
            acc[key] = isNaN(Number(value)) ? value : Number(value);
            return acc;
        }, {});
        const messagesPerHour = settingsObj.messagesPerHour || 30;
        const baseDelay = Math.round(3600000 / messagesPerHour);
        const minMessageDelay = Math.max(baseDelay, 5000);

        const getRandomDelay = (baseMs) => {
            const jitter = Math.random() * (baseMs * 0.5);
            return Math.round(baseMs + jitter);
        };

        logger.info(`Rate limit: ${messagesPerHour} msgs/hour, base delay: ${minMessageDelay}ms with jitter`);

        await db.run(
            `UPDATE reports SET totalContacts=? WHERE campaignRunId=?`,
            [contacts.length, runId]
        );

        for (const contact of contacts) {
            if (!waClient) {
                logger.error('WhatsApp client is null during campaign');
                throw new Error('WhatsApp client disconnected');
            }

            try {
                await new Promise(resolve => setTimeout(resolve, 500));

                const formatted = whatsappClient.normalizePhone(contact.phone);
                logger.info(`Looking up WhatsApp ID for: ${formatted}`);

                const numberId = await Promise.race([
                    waClient.getNumberId(formatted),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('getNumberId timeout')), 30000))
                ]);

                if (!numberId) {
                    logger.warn(`Not registered on WhatsApp: ${formatted}`);
                    await db.run(
                        `INSERT INTO failed_messages (campaignRunId, contactPhone, contactName, reason, createdAt) VALUES (?, ?, ?, ?, ?)`,
                        [runId, contact.phone, contact.name || null, 'Not registered on WhatsApp', new Date().toISOString()]
                    );
                    failed++;
                    continue;
                }

                logger.info(`Found WhatsApp ID: ${numberId._serialized}`);

                let message = whatsappClient.applyTemplateVariables(template.message, contact);

                if (template.attachment && template.attachment.data) {
                    try {
                        const { mimeType, data, filename } = template.attachment;
                        const isVideo = mimeType.startsWith('video/');

                        if (isVideo) {
                            const media = new whatsappClient.MessageMedia('application/octet-stream', data, filename);
                            await waClient.sendMessage(numberId._serialized, media);
                            logger.info(`Sent video to ${formatted}`);
                        } else {
                            const media = new whatsappClient.MessageMedia(mimeType, data, filename);
                            await waClient.sendMessage(numberId._serialized, media, { caption: message });
                            logger.info(`Sent to ${formatted}`);
                        }
                        sent++;
                    } catch (mediaErr) {
                        logger.error({ err: mediaErr }, 'ATTACHMENT SEND FAILED - trying without attachment');
                        await waClient.sendMessage(numberId._serialized, message);
                        sent++;
                    }
                } else {
                    logger.info(`Sending message to ${numberId._serialized}: ${message.substring(0, 50)}...`);
                    await waClient.sendMessage(numberId._serialized, message);
                    logger.info(`Sent to ${formatted}`);
                    sent++;
                }

                const dispatchWebhook = require('../utils/webhookDispatcher');
                dispatchWebhook('message.sent', {
                    campaignRunId: runId,
                    recipient: contact.phone,
                    recipientName: contact.name,
                    message: message.substring(0, 200),
                    status: 'sent'
                });

            } catch (err) {
                logger.error({ err, contact: contact.phone }, 'SEND FAILED');

                const reason = err.message || err.toString() || 'Unknown error';
                await db.run(
                    `INSERT INTO failed_messages (campaignRunId, contactPhone, contactName, reason, createdAt) VALUES (?, ?, ?, ?, ?)`,
                    [runId, contact.phone, contact.name || null, reason, new Date().toISOString()]
                );
                failed++;

                const dispatchWebhook = require('../utils/webhookDispatcher');
                dispatchWebhook('message.failed', {
                    campaignRunId: runId,
                    recipient: contact.phone,
                    recipientName: contact.name,
                    reason,
                    status: 'failed'
                });
            }

            const progress = ((sent + failed) / contacts.length) * 100;

            await db.run(
                `UPDATE reports SET sent=?, failed=?, progress=? WHERE campaignRunId=?`,
                [sent, failed, progress, runId]
            );

            if (io) {
                io.emit('campaign_progress', { runId, sent, failed, progress });
            }

            if (shouldStopCampaign) {
                logger.info(`Campaign stopped by user at ${sent + failed}/${contacts.length}`);

                await db.run(
                    `UPDATE campaign_runs SET status='Stopped' WHERE id=?`,
                    [runId]
                );

                whatsappClient.emitActivity('campaign_stopped', 'Campaign stopped by user', { runId, sent, failed });

                isCampaignRunning = false;
                currentRunId = null;
                shouldStopCampaign = false;
                return;
            }

            if (sent + failed < contacts.length) {
                await new Promise(r => setTimeout(r, getRandomDelay(minMessageDelay)));
            }
        }

        await db.run(
            `UPDATE campaign_runs SET status='Sent' WHERE id=?`,
            [runId]
        );

        const maxRetries = settingsObj.maxRetries || 3;
        const currentRetryCount = (await db.get(`SELECT retryCount FROM campaign_runs WHERE id=?`, [runId]))?.retryCount || 0;

        if (failed > 0 && currentRetryCount < maxRetries) {
            logger.info(`Retrying failed messages: ${failed} contacts, attempt ${currentRetryCount + 1}/${maxRetries}`);

            await db.run(`UPDATE campaign_runs SET retryCount = ? WHERE id=?`, [currentRetryCount + 1, runId]);

            for (const contact of contacts) {
                if (shouldStopCampaign) break;

                try {
                    const formatted = whatsappClient.normalizePhone(contact.phone);
                    const numberId = await waClient.getNumberId(`${formatted}@c.us`);
                    if (!numberId) continue;

                    let message = whatsappClient.applyTemplateVariables(template.message, contact);

                    if (template.attachment && template.attachment.data) {
                        const { mimeType, data, filename } = template.attachment;
                        const isVideo = mimeType.startsWith('video/');
                        if (isVideo) {
                            const media = new whatsappClient.MessageMedia('application/octet-stream', data, filename);
                            await waClient.sendMessage(numberId._serialized, media);
                        } else {
                            const media = new whatsappClient.MessageMedia(mimeType, data, filename);
                            await waClient.sendMessage(numberId._serialized, media, { caption: message });
                        }
                    } else {
                        await waClient.sendMessage(numberId._serialized, message);
                    }
                    sent++;
                } catch (err) {
                    logger.error({ err }, 'RETRY SEND FAILED');
                }

                await new Promise(r => setTimeout(r, getRandomDelay(minMessageDelay)));
            }

            await db.run(
                `UPDATE reports SET sent=?, failed=? WHERE campaignRunId=?`,
                [sent, failed, runId]
            );
        }

        whatsappClient.emitActivity('campaign_completed', `Campaign completed (${sent} sent, ${failed} failed)`, { runId });

        const dispatchWebhook = require('../utils/webhookDispatcher');
        dispatchWebhook('campaign.completed', {
            campaignRunId: runId,
            sent,
            failed,
            total: contacts.length,
            status: 'completed'
        });

    } catch (err) {
        logger.error({ err, runId, templateId, groupIds }, 'PROCESS RUN FAILED');

        await db.run(
            `UPDATE campaign_runs SET status='Failed' WHERE id=?`,
            [runId]
        );

        whatsappClient.emitActivity('campaign_failed', `Campaign failed: ${err.message}`, { runId });

        const dispatchWebhook = require('../utils/webhookDispatcher');
        dispatchWebhook('campaign.completed', {
            campaignRunId: runId,
            status: 'failed',
            error: err.message
        });
    }

    isCampaignRunning = false;
    currentRunId = null;
    shouldStopCampaign = false;

    try {
        const nextQueued = await db.get(
            "SELECT * FROM campaign_runs WHERE status = 'Queued' ORDER BY queuePosition ASC LIMIT 1"
        );

        if (nextQueued) {
            logger.info(`Auto-starting queued campaign: ${nextQueued.id}`);
            await db.run(`UPDATE campaign_runs SET status = 'Sending' WHERE id = ?`, [nextQueued.id]);
            const nextGroupIds = JSON.parse(nextQueued.targetGroupIds);
            isCampaignRunning = true;
            processRun(nextQueued.id, nextQueued.campaignTemplateId, nextGroupIds)
                .catch(err => logger.error({ err }, 'Queued campaign crashed'));
        }
    } catch (err) {
        logger.error({ err }, 'Queue processing error');
    }
}

let io = null;

function setIO(socketIO) {
    io = socketIO;
}

function startScheduler() {
    setInterval(async () => {
        logger.info(`Scheduler check: isCampaignRunning=${isCampaignRunning}, waStatus=${whatsappClient.getStatus()}`);

        if (isCampaignRunning || whatsappClient.getStatus() !== 'CONNECTED') {
            return;
        }

        try {
            const db = await dbPromise;
            const allScheduled = await db.all(
                `SELECT id, campaignTemplateId, targetGroupIds, scheduledAt FROM campaign_runs WHERE status = 'Scheduled'`
            );

            const now = new Date();
            const dueRuns = allScheduled.filter(run => {
                const [datePart, timePart] = run.scheduledAt.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);
                const scheduledTime = new Date(year, month - 1, day, hours, minutes);
                return scheduledTime <= now;
            });

            for (const run of dueRuns) {
                logger.info(`Starting scheduled campaign: ${run.id}`);
                await db.run(`UPDATE campaign_runs SET status = 'Sending' WHERE id = ?`, [run.id]);
                const groupIds = JSON.parse(run.targetGroupIds);
                isCampaignRunning = true;
                processRun(run.id, run.campaignTemplateId, groupIds)
                    .catch(err => logger.error({ err }, 'processRun crashed'));
            }
        } catch (err) {
            logger.error({ err }, 'Scheduler error');
        }
    }, 30000);
}

module.exports = {
    getCampaignState,
    setCampaignRunning,
    setCurrentRunId,
    processRun,
    setIO,
    startScheduler,
    get shouldStopCampaign() { return shouldStopCampaign; },
    setShouldStopCampaign(val) { shouldStopCampaign = val; }
};