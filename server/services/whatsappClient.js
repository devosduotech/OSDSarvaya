const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const { applyTemplateVariables } = require('../utils/template');

let waClient = null;
let waStatus = 'DISCONNECTED';
let io = null;
let dbPromise = null;

function getDataPath() {
    if (process.env.OSDSARVAYA_DATA) {
        return process.env.OSDSARVAYA_DATA;
    }
    if (process.platform === 'win32' && process.env.APPDATA) {
        return path.join(process.env.APPDATA, 'OSDSarvaya', 'data');
    }
    return path.join(__dirname, '..', 'data');
}

function getSessionPath() {
    return path.join(getDataPath(), '.wwebjs_auth');
}

function setIO(socketIO) {
    io = socketIO;
}

function setDB(db) {
    dbPromise = db;
}

function getStatus() {
    return waStatus;
}

function getClient() {
    return waClient;
}

function changeStatus(newStatus) {
    waStatus = newStatus;
    if (io) {
        io.emit('status_change', waStatus);
    }
}

async function emitActivity(type, message, meta = {}) {
    const activity = {
        id: `act_${Date.now()}`,
        type,
        message,
        meta,
        timestamp: new Date().toISOString()
    };

    if (io) {
        io.emit('activity', activity);
    }

    try {
        const db = await dbPromise;
        if (db) {
            await db.run(
                "INSERT INTO activities (type, message, metadata, createdAt) VALUES (?, ?, ?, ?)",
                [type, message, JSON.stringify(meta), activity.timestamp]
            );
        }
    } catch (err) {
        logger.error({ err }, 'Failed to save activity to database');
    }
}

function cleanChromiumLocks(dir) {
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'];

    function walk(currentPath) {
        if (!fs.existsSync(currentPath)) return;
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
            const full = path.join(currentPath, file);
            if (fs.lstatSync(full).isDirectory()) {
                walk(full);
            } else if (lockFiles.includes(file)) {
                try {
                    fs.unlinkSync(full);
                    logger.warn(`Removed lock file: ${full}`);
                } catch (err) {
                    logger.error({ err }, 'Failed removing lock file');
                }
            }
        }
    }

    walk(dir);
}

async function initializeWhatsAppClient() {
    if (waClient) return waClient;

    logger.info('Starting WhatsApp initialization...');

    const maxRetries = 3;
    let attempt = 0;

    async function attemptInit() {
        attempt++;
        logger.info(`WhatsApp initialization attempt ${attempt}/${maxRetries}`);

        try {
            logger.info('Cleaning Chromium locks...');
            cleanChromiumLocks(getSessionPath());
            await new Promise(r => setTimeout(r, 2000));

            logger.info('Initializing WhatsApp Client...');

            const puppeteerOptions = {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-sync',
                    '--disable-translate',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update',
                    '--disable-gpu-process-crash-dump',
                    '--disable-software-rasterizer',
                    '--no-default-browser-check',
                ]
            };

            if (!puppeteerOptions.executablePath && process.resourcesPath) {
                const possibleChromePaths = [
                    path.join(process.resourcesPath, 'chrome-win64', 'chrome.exe'),
                    path.join(process.resourcesPath, 'app.asar.unpacked', 'chrome-win64', 'chrome.exe'),
                    path.join(process.resourcesPath, 'app', 'chrome-win64', 'chrome.exe'),
                    path.join(process.resourcesPath, 'chrome-win64', 'chrome-win', 'chrome.exe'),
                ];

                for (const chromePath of possibleChromePaths) {
                    if (fs.existsSync(chromePath)) {
                        puppeteerOptions.executablePath = chromePath;
                        logger.info('Using bundled Chrome:', chromePath);
                        break;
                    }
                }
            }

            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }

            waClient = new Client({
                authStrategy: new LocalAuth({ dataPath: getSessionPath() }),
                puppeteer: puppeteerOptions,
                restartOnAuthFail: true
            });

            waClient.on('qr', (qr) => {
                changeStatus('SCAN_QR');
                if (io) io.emit('qr_code', qr);
                logger.info('QR Code generated, waiting for scan...');

                if (global.qrTimeout) clearTimeout(global.qrTimeout);
                global.qrTimeout = setTimeout(() => {
                    if (waStatus === 'SCAN_QR') {
                        logger.warn('QR scan timeout reached (2 mins). The QR code might be expired.');
                    }
                }, 120000);
            });

            waClient.on('authenticated', () => {
                logger.info('WhatsApp authenticated successfully');
                changeStatus('AUTHENTICATED');
                emitActivity('whatsapp', 'WhatsApp authenticated successfully');
            });

            waClient.on('state_change', (state) => {
                logger.info('WhatsApp state changed:', state);
                emitActivity('whatsapp', `WhatsApp state changed to: ${state}`);
            });

            waClient.on('ready', () => {
                logger.info(`WhatsApp READY: ${waClient.info?.wid?._serialized}`);
                changeStatus('CONNECTED');
                emitActivity('whatsapp', 'WhatsApp connected');
            });

            waClient.on('disconnected', (reason) => {
                logger.info(`WhatsApp disconnected: ${reason}`);
                changeStatus('DISCONNECTED');
                emitActivity('whatsapp', 'WhatsApp disconnected, attempting to reconnect...');

                setTimeout(async () => {
                    if (waStatus === 'DISCONNECTED') {
                        logger.info('Attempting auto-reconnect...');
                        try {
                            waClient = null;
                            await initializeWhatsAppClient();
                        } catch (err) {
                            logger.error({ err }, 'Auto-reconnect failed');
                        }
                    }
                }, 3000);
            });

            waClient.on('auth_failure', (msg) => {
                logger.error({ msg }, 'WhatsApp AUTH FAILURE');
                changeStatus('AUTH_FAILED');
                emitActivity('whatsapp', `WhatsApp authentication failed: ${msg}`);
            });

            waClient.on('loading_screen', (msg) => {
                logger.info(`WhatsApp loading: ${msg}`);
            });

            waClient.on('message', async (message) => {
                if (message.fromMe) return;

                const body = message.body?.trim().toUpperCase();
                const from = message.from;

                try {
                    const db = await dbPromise;
                    if (!db) return;
                    const phone = from.replace('@c.us', '');

                    if (body === 'STOP' || body === 'UNSUBSCRIBE') {
                        const result = await db.run(
                            `UPDATE contacts SET optedIn = 0, optedOutAt = ? WHERE phone = ?`,
                            [new Date().toISOString(), phone]
                        );
                        if (result.changes > 0) {
                            logger.info(`Contact ${phone} opted out`);
                            emitActivity('consent', `Contact ${phone} opted out`);
                        }
                    } else if (body === 'START' || body === 'SUBSCRIBE' || body === 'OPTIN') {
                        const result = await db.run(
                            `UPDATE contacts SET optedIn = 1, optedInAt = ? WHERE phone = ?`,
                            [new Date().toISOString(), phone]
                        );
                        if (result.changes > 0) {
                            logger.info(`Contact ${phone} opted back in`);
                            emitActivity('consent', `Contact ${phone} opted back in`);
                        }
                    }
                } catch (err) {
                    logger.error({ err }, 'Opt-in/out handling failed');
                }
            });

            await waClient.initialize();
            return waClient;

        } catch (err) {
            logger.error({ err, attempt }, 'WA INIT ERROR');
            waClient = null;

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 2000;
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                return attemptInit();
            }

            changeStatus('FAILED');
            return null;
        }
    }

    return attemptInit();
}

async function destroyWhatsAppClient() {
    if (waClient) {
        await waClient.destroy();
        waClient = null;
    }
    const sessionPath = getSessionPath();
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    changeStatus('DISCONNECTED');
}

function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}

module.exports = {
    setIO,
    setDB,
    getStatus,
    getClient,
    changeStatus,
    emitActivity,
    initializeWhatsAppClient,
    destroyWhatsAppClient,
    normalizePhone,
    applyTemplateVariables,
    MessageMedia,
    getDataPath,
    getSessionPath
};