require('dotenv').config();

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');
const { verifyToken, verifySocketToken, apiKeyAuth, requireAuth } = require('./middleware/auth');
const dbPromise = require('./database');

const whatsappClient = require('./services/whatsappClient');
const campaignEngine = require('./services/campaignEngine');

// Load production.env explicitly if it exists (for packaged app)
const productionEnvPath = path.join(__dirname, 'production.env');
const productionEnvPathParent = path.join(__dirname, '..', 'production.env');
const productionEnvPathParent2 = path.join(__dirname, '..', '..', 'production.env');
const resourcesPath = process.resourcesPath || '';
const productionEnvPathResources = resourcesPath ? path.join(resourcesPath, 'production.env') : '';
const productionEnvPathResources2 = resourcesPath ? path.join(resourcesPath, 'app', 'production.env') : '';

const hasEnvFromContainer = !!process.env.ERPNEXT_URL;

let envLoaded = false;
if (hasEnvFromContainer) {
    envLoaded = true;
} else if (fs.existsSync(productionEnvPath)) {
    require('dotenv').config({ path: productionEnvPath });
    envLoaded = true;
} else if (fs.existsSync(productionEnvPathParent)) {
    require('dotenv').config({ path: productionEnvPathParent });
    envLoaded = true;
} else if (fs.existsSync(productionEnvPathParent2)) {
    require('dotenv').config({ path: productionEnvPathParent2 });
    envLoaded = true;
} else if (productionEnvPathResources && fs.existsSync(productionEnvPathResources)) {
    require('dotenv').config({ path: productionEnvPathResources });
    envLoaded = true;
} else if (productionEnvPathResources2 && fs.existsSync(productionEnvPathResources2)) {
    require('dotenv').config({ path: productionEnvPathResources2 });
    envLoaded = true;
}

if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'osdsarvaya_default_secret_key_2024_v1';
}

process.env.ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://dvarika.osduotech.com';
process.env.ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || 'a652ccfadaa8917';
process.env.ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '155057be1ff06fa';

const { APP_VERSION } = require('./version');
const API_VERSION = 'v1';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

function getDataPath() {
    if (process.env.OSDSARVAYA_DATA) {
        return process.env.OSDSARVAYA_DATA;
    }
    if (process.platform === 'win32' && process.env.APPDATA) {
        return path.join(process.env.APPDATA, 'OSDSarvaya', 'data');
    }
    return path.join(__dirname, 'data');
}

// =====================================================
// SECURITY
// =====================================================
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: '15mb' }));

// =====================================================
// VERSION INFO (public endpoint)
// =====================================================
app.get('/api/version', (req, res) => {
    res.json({
        appVersion: APP_VERSION,
        apiVersion: API_VERSION,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// =====================================================
// PUBLIC ROUTES
// =====================================================
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const licenseRouter = require('./routes/license');
app.use('/api/license', licenseRouter);

const updatesRouter = require('./routes/updates');
app.use('/api/updates', updatesRouter);

// =====================================================
// PROTECTED ROUTES - Admin JWT only
// =====================================================
const apiRouter = require('./routes/api');
app.use('/api', verifyToken, apiRouter);

// API Key management (admin JWT only)
const apiKeysRouter = require('./routes/apiKeys');
app.use('/api/api-keys', verifyToken, apiKeysRouter);

// Webhook management (admin JWT only)
const webhooksRouter = require('./routes/webhooks');
app.use('/api/webhooks', verifyToken, webhooksRouter);

// =====================================================
// NOTIFICATION API - API Key auth required
// =====================================================
const notifyRouter = require('./routes/notify');
app.use('/api/notify', apiKeyAuth, notifyRouter);

// =====================================================
// DUAL AUTH ROUTES - JWT or API Key
// =====================================================
// Contacts, groups, templates accessible by both admin (JWT) and API integrations (API key)
app.use('/api/data', requireAuth, (req, res, next) => next());

// =====================================================
// CAMPAIGN ROUTES - Keep in server.js since they're tightly coupled
// =====================================================

// Start campaign
app.post('/api/campaigns/start', verifyToken, async (req, res) => {
    logger.info('CAMPAIGN START API CALLED');
    const { templateId, groupIds } = req.body;
    const db = await dbPromise;

    if (whatsappClient.getStatus() !== 'CONNECTED') {
        return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
    }

    const { isCampaignRunning } = campaignEngine.getCampaignState();

    if (isCampaignRunning) {
        try {
            const lastQueued = await db.get(
                "SELECT MAX(queuePosition) as maxPos FROM campaign_runs WHERE status = 'Queued'"
            );
            const queuePosition = (lastQueued?.maxPos || 0) + 1;
            const runId = `run_${Date.now()}`;

            await db.run(
                `INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, queuePosition, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
                [runId, templateId, JSON.stringify(groupIds), 'Queued', queuePosition, new Date().toISOString()]
            );

            await db.run(
                `INSERT INTO reports (campaignRunId, totalContacts, sent, failed, delivered, read, progress) VALUES (?, ?, 0, 0, 0, 0, 0)`,
                [runId, 0]
            );

            whatsappClient.emitActivity('campaign_queued', `Campaign queued at position ${queuePosition}`, { runId });

            return res.json({ success: true, queued: true, queuePosition, runId });
        } catch (err) {
            logger.error(err);
            return res.status(500).json({ success: false });
        }
    }

    const runId = `run_${Date.now()}`;

    try {
        await db.run(
            `INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, createdAt) VALUES (?, ?, ?, ?, ?)`,
            [runId, templateId, JSON.stringify(groupIds), 'Sending', new Date().toISOString()]
        );

        await db.run(
            `INSERT INTO reports (campaignRunId, totalContacts, sent, failed, delivered, read, progress) VALUES (?, ?, 0, 0, 0, 0, 0)`,
            [runId, 0]
        );

        campaignEngine.setCampaignRunning(true);

        campaignEngine.processRun(runId, templateId, groupIds)
            .catch(err => logger.error({ err }, 'processRun crashed'));

        return res.json({ success: true });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false });
    }
});

// Schedule campaign
app.post('/api/campaigns/schedule', verifyToken, async (req, res) => {
    logger.info('CAMPAIGN SCHEDULE API CALLED');
    const { templateId, groupIds, scheduledAt } = req.body;

    if (!scheduledAt) {
        return res.status(400).json({ success: false, message: 'scheduledAt is required' });
    }

    let scheduledTime;
    if (scheduledAt.includes('T')) {
        const [datePart, timePart] = scheduledAt.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        scheduledTime = new Date(year, month - 1, day, hours, minutes);
    } else {
        scheduledTime = new Date(scheduledAt);
    }

    if (isNaN(scheduledTime.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const scheduledTimeUTC = new Date(scheduledTime.getTime() + (5.5 * 60 * 60 * 1000));
    const nowUTC = new Date();

    if (scheduledTimeUTC <= nowUTC) {
        return res.status(400).json({ success: false, message: 'Scheduled time must be in the future' });
    }

    const db = await dbPromise;
    const runId = `run_${Date.now()}`;

    try {
        await db.run(
            `INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, scheduledAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [runId, templateId, JSON.stringify(groupIds), 'Scheduled', scheduledAt, new Date().toISOString()]
        );

        await db.run(
            `INSERT INTO reports (campaignRunId, totalContacts, sent, failed, delivered, read, progress) VALUES (?, ?, 0, 0, 0, 0, 0)`,
            [runId, 0]
        );

        whatsappClient.emitActivity('campaign_scheduled', `Campaign scheduled for ${scheduledTime.toLocaleString()}`, { runId });

        return res.json({ success: true, runId });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false });
    }
});

// Stop campaign
app.post('/api/campaigns/stop', verifyToken, async (req, res) => {
    const { isCampaignRunning } = campaignEngine.getCampaignState();
    if (!isCampaignRunning) {
        return res.status(400).json({ success: false, message: 'No campaign running' });
    }

    logger.info('Campaign stop requested');
    campaignEngine.setShouldStopCampaign(true);

    return res.json({ success: true });
});

// Cancel queued campaign
app.post('/api/campaigns/cancel/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const db = await dbPromise;

    try {
        const run = await db.get("SELECT status FROM campaign_runs WHERE id = ?", id);

        if (!run) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (run.status !== 'Queued') {
            return res.status(400).json({ success: false, message: 'Can only cancel queued campaigns' });
        }

        await db.run("UPDATE campaign_runs SET status = 'Cancelled' WHERE id = ?", [id]);
        whatsappClient.emitActivity('campaign_cancelled', 'Campaign cancelled from queue', { runId: id });

        return res.json({ success: true });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false });
    }
});

// Cancel all queued/scheduled
app.post('/api/campaigns/cancel-all', verifyToken, async (req, res) => {
    const db = await dbPromise;

    try {
        const result = await db.run(
            "UPDATE campaign_runs SET status = 'Cancelled' WHERE status IN ('Scheduled', 'Queued')"
        );

        whatsappClient.emitActivity('campaigns_cancelled', `${result.changes} scheduled/queued campaigns cancelled`);

        return res.json({ success: true, cancelled: result.changes });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false });
    }
});

// Get failed messages
app.get('/api/campaigns/failed/:runId', verifyToken, async (req, res) => {
    const db = await dbPromise;
    const { runId } = req.params;

    try {
        const failedMessages = await db.all(
            `SELECT * FROM failed_messages WHERE campaignRunId = ? ORDER BY createdAt DESC LIMIT 100`,
            [runId]
        );
        return res.json({ success: true, failedMessages });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false });
    }
});

// =====================================================
// WHATSAPP CONNECTION (JWT only)
// =====================================================
app.post('/api/whatsapp/connect', verifyToken, async (req, res) => {
    logger.info(`WhatsApp connect API called, waStatus: ${whatsappClient.getStatus()}`);

    if (whatsappClient.getClient() && whatsappClient.getStatus() === 'CONNECTED') {
        return res.json({ success: true, status: whatsappClient.getStatus(), message: 'WhatsApp already connected' });
    }

    whatsappClient.changeStatus('CONNECTING');

    try {
        await whatsappClient.initializeWhatsAppClient();
        return res.json({ success: true, status: whatsappClient.getStatus() });
    } catch (err) {
        logger.error({ err }, 'WhatsApp connect failed');
        whatsappClient.changeStatus('FAILED');
        return res.status(500).json({ success: false, message: 'Failed to connect WhatsApp' });
    }
});

app.post('/api/whatsapp/disconnect', verifyToken, async (req, res) => {
    await whatsappClient.destroyWhatsAppClient();
    res.json({ success: true });
});

// =====================================================
// WHATSAPP STATUS (API accessible)
// =====================================================
app.get('/api/whatsapp/status', requireAuth, (req, res) => {
    res.json({
        success: true,
        status: whatsappClient.getStatus(),
        connected: whatsappClient.getStatus() === 'CONNECTED'
    });
});

// =====================================================
// SOCKET.IO
// =====================================================
const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || "*" }
});

whatsappClient.setIO(io);
whatsappClient.setDB(dbPromise);
campaignEngine.setIO(io);

io.use(verifySocketToken);

io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.emit('status_change', whatsappClient.getStatus());

    socket.on('connect_wa', async () => {
        logger.info(`connect_wa received, current waStatus: ${whatsappClient.getStatus()}`);
        if (whatsappClient.getClient()) {
            logger.info('WhatsApp client already exists, skipping init');
            return;
        }
        whatsappClient.changeStatus('CONNECTING');
        try {
            await whatsappClient.initializeWhatsAppClient();
        } catch (err) {
            logger.error({ err }, 'Failed to initialize WhatsApp');
            whatsappClient.changeStatus('FAILED');
        }
    });

    socket.on('disconnect_wa', async () => {
        await whatsappClient.destroyWhatsAppClient();
    });
});

// Start the scheduler
campaignEngine.startScheduler();

// =====================================================
// FRONTEND
// =====================================================
const isPackaged = !!process.resourcesPath;
const dockerPath = path.join(__dirname, '..', 'client', 'dist');
const packagedPath = path.join(__dirname, '..', 'dist');
const packagedPath2 = path.join(__dirname, '..', '..', 'dist');

let clientBuildPath;
if (isPackaged) {
    if (fs.existsSync(packagedPath)) {
        clientBuildPath = packagedPath;
    } else if (fs.existsSync(packagedPath2)) {
        clientBuildPath = packagedPath2;
    }
} else if (fs.existsSync(dockerPath)) {
    clientBuildPath = dockerPath;
} else if (fs.existsSync(packagedPath)) {
    clientBuildPath = packagedPath;
}

if (clientBuildPath && fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
    }));
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
async function gracefulShutdown() {
    logger.info('Graceful shutdown initiated');

    try {
        const db = await dbPromise;
        await db.run('SELECT 1');
        logger.info('Final database save completed');

        await whatsappClient.destroyWhatsAppClient();
    } catch (err) {
        logger.error({ err }, 'Shutdown error');
    } finally {
        logger.info('Process exiting');
        process.exit(0);
    }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// =====================================================
// START
// =====================================================
async function startServer() {
    await fsPromises.mkdir(getDataPath(), { recursive: true });
    await dbPromise;

    if (process.env.NODE_ENV !== 'test') {
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`OSDSarvaya Server v${APP_VERSION} (API ${API_VERSION}) running on port ${PORT}`);
        });
    }
}

startServer();
module.exports = app;