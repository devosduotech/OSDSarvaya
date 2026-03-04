require('dotenv').config();

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { verifyToken, verifySocketToken } = require('./middleware/auth');
const dbPromise = require('./database');

// Check if running in Electron and get Chromium path
function getElectronChromiumPath() {
  const electron = require('electron');
  return process.execPath.replace(/\[^.exe\]+/, 'resources\\chrome-win\\chrome.exe').replace('OSDSarvaya.exe', 'chrome-win\\chrome.exe');
}

// Load production.env explicitly if it exists (for packaged app)
const productionEnvPath = path.join(__dirname, 'production.env');
const productionEnvPathParent = path.join(__dirname, '..', 'production.env');
const productionEnvPathParent2 = path.join(__dirname, '..', '..', 'production.env');
const resourcesPath = process.resourcesPath || '';
const productionEnvPathResources = resourcesPath ? path.join(resourcesPath, 'production.env') : '';
const productionEnvPathResources2 = resourcesPath ? path.join(resourcesPath, 'app', 'production.env') : '';

console.log('=== Loading Environment ===');
console.log('__dirname:', __dirname);
console.log('process.resourcesPath:', resourcesPath);

// Check if env vars are already available (from Docker env_file or container)
const hasEnvFromContainer = !!process.env.ERPNEXT_URL;
console.log('Environment variables available:', hasEnvFromContainer);

console.log('productionEnvPath:', productionEnvPath, 'exists:', fs.existsSync(productionEnvPath));
console.log('productionEnvPathParent:', productionEnvPathParent, 'exists:', fs.existsSync(productionEnvPathParent));
console.log('productionEnvPathParent2:', productionEnvPathParent2, 'exists:', fs.existsSync(productionEnvPathParent2));
console.log('productionEnvPathResources:', productionEnvPathResources, 'exists:', productionEnvPathResources ? fs.existsSync(productionEnvPathResources) : false);
console.log('productionEnvPathResources2:', productionEnvPathResources2, 'exists:', productionEnvPathResources2 ? fs.existsSync(productionEnvPathResources2) : false);

let envLoaded = false;
if (hasEnvFromContainer) {
  // Already loaded via env_file - no need to load from file
  console.log('Using environment from container env_file');
  envLoaded = true;
} else if (fs.existsSync(productionEnvPath)) {
  require('dotenv').config({ path: productionEnvPath });
  console.log('Loaded from:', productionEnvPath);
  envLoaded = true;
} else if (fs.existsSync(productionEnvPathParent)) {
  require('dotenv').config({ path: productionEnvPathParent });
  console.log('Loaded from:', productionEnvPathParent);
  envLoaded = true;
} else if (fs.existsSync(productionEnvPathParent2)) {
  require('dotenv').config({ path: productionEnvPathParent2 });
  console.log('Loaded from:', productionEnvPathParent2);
  envLoaded = true;
} else if (productionEnvPathResources && fs.existsSync(productionEnvPathResources)) {
  require('dotenv').config({ path: productionEnvPathResources });
  console.log('Loaded from resources:', productionEnvPathResources);
  envLoaded = true;
} else if (productionEnvPathResources2 && fs.existsSync(productionEnvPathResources2)) {
  require('dotenv').config({ path: productionEnvPathResources2 });
  console.log('Loaded from resources2:', productionEnvPathResources2);
  envLoaded = true;
}

console.log('ENV LOADED:', envLoaded);
console.log('ERPNEXT_URL:', process.env.ERPNEXT_URL);
console.log('ERPNEXT_API_KEY set:', !!process.env.ERPNEXT_API_KEY);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);

// Set default JWT_SECRET if not provided (for Windows packaged app)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'osdsarvaya_default_secret_key_2024_v1';
  console.log('JWT_SECRET: Using default for Windows');
}

// Set default ERPNext credentials (same for all deployments)
process.env.ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://dvarika.osduotech.com';
process.env.ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || 'a652ccfadaa8917';
process.env.ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '155057be1ff06fa';

console.log('=======================');

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

// Get DATA_PATH dynamically
function getSessionPath() {
    return path.join(getDataPath(), '.wwebjs_auth');
}

let waClient = null;
let waStatus = 'DISCONNECTED';
let isCampaignRunning = false;
let shouldStopCampaign = false;
let currentRunId = null;

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || "*" }
});


// =====================================================
// PHONE NORMALIZATION
// =====================================================
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}


// =====================================================
// TEMPLATE VARIABLE REPLACEMENT
// =====================================================
function applyTemplateVariables(message, contact) {

  if (!message) return '';

  Object.keys(contact).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    message = message.replace(regex, contact[key] ?? '');
  });

  // Remove any unused placeholders
  message = message.replace(/{{.*?}}/g, '');

  return message;
}


// =====================================================
// CLEAN CHROMIUM LOCK FILES
// =====================================================
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


// =====================================================
// ACTIVITY EMITTER
// =====================================================
async function emitActivity(type, message, meta = {}) {
  const activity = {
    id: `act_${Date.now()}`,
    type,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
  
  // Emit to socket
  io.emit('activity', activity);
  
  // Save to database
  try {
    const db = await dbPromise;
    await db.run(
      "INSERT INTO activities (type, message, metadata, createdAt) VALUES (?, ?, ?, ?)",
      [type, message, JSON.stringify(meta), activity.timestamp]
    );
  } catch (err) {
    logger.error({ err }, 'Failed to save activity to database');
  }
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

// =====================================================
// HEALTH CHECK (for Docker healthcheck)
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});


// =====================================================
// AUTH ROUTES (Public - for setup wizard and login)
// =====================================================
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// =====================================================
// LICENSE ROUTES (Public - for client activation)
// =====================================================
const licenseRouter = require('./routes/license');
app.use('/api/license', licenseRouter);

// =====================================================
// UPDATE ROUTES (Public - for auto-update)
// =====================================================
const updatesRouter = require('./routes/updates');
app.use('/api/updates', updatesRouter);


// =====================================================
// PROTECTED ROUTES
// =====================================================
const apiRouter = require('./routes/api');
app.use('/api', verifyToken, apiRouter);


// =====================================================
// STATUS
// =====================================================
function changeStatus(newStatus) {
  waStatus = newStatus;
  io.emit('status_change', waStatus);
}


// =====================================================
// WHATSAPP INIT
// =====================================================
async function initializeWhatsAppClient() {

  if (waClient) return;
  
  console.error('[WA_INIT] Starting initializeWhatsAppClient...');
  logger.info('Starting WhatsApp initialization...');
  
  const maxRetries = 3;
  let attempt = 0;

  async function attemptInit() {
    attempt++;
    console.error(`[WA_INIT] Attempt ${attempt}/${maxRetries}`);
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
          '--disable-site-isolation-trials',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update'
        ]
      };

      // Check for bundled Chrome in packaged app
      if (!puppeteerOptions.executablePath && process.resourcesPath) {
        const possibleChromePaths = [
          path.join(process.resourcesPath, 'chrome-win64', 'chrome-win', 'chrome.exe'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'chrome-win64', 'chrome-win', 'chrome.exe'),
          path.join(process.resourcesPath, 'chrome-win64', 'chrome.exe'),
        ];
        
        console.error('[WA_INIT] Checking for bundled Chrome, resourcesPath:', process.resourcesPath);
        for (const chromePath of possibleChromePaths) {
          console.error('[WA_INIT] Checking Chrome path:', chromePath, 'exists:', fs.existsSync(chromePath));
          if (fs.existsSync(chromePath)) {
            puppeteerOptions.executablePath = chromePath;
            console.error('[WA_INIT] Using bundled Chrome:', chromePath);
            logger.info('Using bundled Chrome:', chromePath);
            break;
          }
        }
      }

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      console.error('[WA_INIT] puppeteer executablePath:', puppeteerOptions.executablePath);
      logger.info('Creating WhatsApp client with puppeteer options...');

      waClient = new Client({
        authStrategy: new LocalAuth({ dataPath: getSessionPath() }),
        puppeteer: puppeteerOptions,
        restartOnAuthFail: true
      });

      waClient.on('qr', (qr) => {
        changeStatus('SCAN_QR');
        io.emit('qr_code', qr);
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
            await initializeWhatsApp();
          }
        }, 3000);
      });

      waClient.on('auth_failure', (msg) => {
        logger.error({ msg }, 'WhatsApp AUTH FAILURE');
        changeStatus('AUTH_FAILED');
        emitActivity('whatsapp', 'WhatsApp authentication failed');
      });

      waClient.on('loading_screen', (msg) => {
        logger.info(`WhatsApp loading: ${msg}`);
      });

      waClient.on('message', async (message) => {
        if (message.fromMe) return;
        
        const body = message.body?.trim().toUpperCase();
        const from = message.from;
        
        if (body === 'STOP' || body === 'UNSUBSCRIBE') {
          try {
            const db = await dbPromise;
            const phone = from.replace('@c.us', '');
            
            const result = await db.run(
              `UPDATE contacts SET optedIn = 0, optedOutAt = ? WHERE phone = ?`,
              [new Date().toISOString(), phone]
            );
            
            if (result.changes > 0) {
              logger.info(`Contact ${phone} opted out`);
              emitActivity('consent', `Contact ${phone} opted out`);
            }
          } catch (err) {
            logger.error({ err }, 'Opt-out handling failed');
          }
        } else if (body === 'START' || body === 'SUBSCRIBE' || body === 'OPTIN') {
          try {
            const db = await dbPromise;
            const phone = from.replace('@c.us', '');
            
            const result = await db.run(
              `UPDATE contacts SET optedIn = 1, optedInAt = ? WHERE phone = ?`,
              [new Date().toISOString(), phone]
            );
            
            if (result.changes > 0) {
              logger.info(`Contact ${phone} opted in`);
              emitActivity('consent', `Contact ${phone} opted back in`);
            }
          } catch (err) {
            logger.error({ err }, 'Opt-in handling failed');
          }
        }
      });

      await waClient.initialize();
      return true;

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
      return false;
    }
  }

  return attemptInit();
}


// =====================================================
// CAMPAIGN START
// =====================================================
app.post('/api/campaigns/start', verifyToken, async (req, res) => {

  logger.info('CAMPAIGN START API CALLED');
  logger.info(`Body: ${JSON.stringify(req.body)}`);

  const { templateId, groupIds } = req.body;
  const db = await dbPromise;

  // Check if WhatsApp is connected
  if (waStatus !== 'CONNECTED')
    return res.status(400).json({ success: false, message: 'WhatsApp not connected' });

  // If campaign is running, add to queue
  if (isCampaignRunning) {
    try {
      // Get next queue position
      const lastQueued = await db.get(
        "SELECT MAX(queuePosition) as maxPos FROM campaign_runs WHERE status = 'Queued'"
      );
      const queuePosition = (lastQueued?.maxPos || 0) + 1;
      
      const runId = `run_${Date.now()}`;
      
      await db.run(
        `INSERT INTO campaign_runs
         (id, campaignTemplateId, targetGroupIds, status, queuePosition, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [runId, templateId, JSON.stringify(groupIds), 'Queued', queuePosition, new Date().toISOString()]
      );

      await db.run(
        `INSERT INTO reports
         (campaignRunId, totalContacts, sent, failed, delivered, read, progress)
         VALUES (?, ?, 0, 0, 0, 0, 0)`,
        [runId, 0]
      );

      emitActivity('campaign_queued', `Campaign queued at position ${queuePosition}`, { runId });

      return res.json({ success: true, queued: true, queuePosition, runId });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ success: false });
    }
  }

  // If no campaign running, start immediately
  const runId = `run_${Date.now()}`;

  try {

    await db.run(
      `INSERT INTO campaign_runs
       (id, campaignTemplateId, targetGroupIds, status, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [runId, templateId, JSON.stringify(groupIds), 'Sending', new Date().toISOString()]
    );

    await db.run(
      `INSERT INTO reports
       (campaignRunId, totalContacts, sent, failed, delivered, read, progress)
       VALUES (?, ?, 0, 0, 0, 0, 0)`,
      [runId, 0]
    );

    isCampaignRunning = true;

    processRun(runId, templateId, groupIds)
      .catch(err => logger.error({ err }, 'processRun crashed'));

    return res.json({ success: true });

  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false });
  }
});


// =====================================================
// CAMPAIGN SCHEDULE
// =====================================================
app.post('/api/campaigns/schedule', verifyToken, async (req, res) => {

  logger.info('CAMPAIGN SCHEDULE API CALLED');
  logger.info(`Body: ${JSON.stringify(req.body)}`);

  const { templateId, groupIds, scheduledAt } = req.body;
  
  if (!scheduledAt) {
    return res.status(400).json({ success: false, message: 'scheduledAt is required' });
  }

  // Handle datetime-local format (YYYY-MM-DDTHH:MM) - parse as local time
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

  // Convert to UTC for comparison
  const scheduledTimeUTC = new Date(scheduledTime.getTime() + (5.5 * 60 * 60 * 1000));
  const nowUTC = new Date();

  if (scheduledTimeUTC <= nowUTC) {
    logger.warn(`Schedule validation failed: scheduledTime=${scheduledTime.toString()}, now=${new Date().toString()}`);
    return res.status(400).json({ success: false, message: 'Scheduled time must be in the future' });
  }

  const db = await dbPromise;
  const runId = `run_${Date.now()}`;

  try {

    await db.run(
      `INSERT INTO campaign_runs
       (id, campaignTemplateId, targetGroupIds, status, scheduledAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, templateId, JSON.stringify(groupIds), 'Scheduled', scheduledAt, new Date().toISOString()]
    );

    logger.info(`Campaign scheduled successfully: runId=${runId}, scheduledAt=${scheduledAt}`);

    await db.run(
      `INSERT INTO reports
       (campaignRunId, totalContacts, sent, failed, delivered, read, progress)
       VALUES (?, ?, 0, 0, 0, 0, 0)`,
      [runId, 0]
    );

    emitActivity('campaign_scheduled', `Campaign scheduled for ${scheduledTime.toLocaleString()}`, { runId });

    return res.json({ success: true, runId });

  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false });
  }
});


// =====================================================
// SCHEDULER - Check for scheduled campaigns every 30 seconds
// =====================================================
setInterval(async () => {
  logger.info(`Scheduler check: isCampaignRunning=${isCampaignRunning}, waStatus=${waStatus}`);
  
  if (isCampaignRunning || waStatus !== 'CONNECTED') {
    logger.info('Scheduler skipped: campaign running or WhatsApp not connected');
    return;
  }

  try {
    const db = await dbPromise;
    const now = new Date();

    // Get all scheduled campaigns and filter in JS (since stored as local time strings)
    const allScheduled = await db.all(
      `SELECT id, campaignTemplateId, targetGroupIds, scheduledAt FROM campaign_runs 
       WHERE status = 'Scheduled'`
    );

    const dueRuns = allScheduled.filter(run => {
      const [datePart, timePart] = run.scheduledAt.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const scheduledTime = new Date(year, month - 1, day, hours, minutes);
      return scheduledTime <= now;
    });

    logger.info(`Scheduler found ${dueRuns.length} due campaigns`);

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


// =====================================================
// CAMPAIGN STOP
// =====================================================
app.post('/api/campaigns/stop', verifyToken, async (req, res) => {
  
  if (!isCampaignRunning) {
    return res.status(400).json({ success: false, message: 'No campaign running' });
  }

  logger.info('Campaign stop requested');
  shouldStopCampaign = true;

  return res.json({ success: true });
});


// =====================================================
// CAMPAIGN CANCEL (from queue)
// =====================================================
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
    
    emitActivity('campaign_cancelled', 'Campaign cancelled from queue', { runId: id });

    return res.json({ success: true });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false });
  }
});

app.post('/api/campaigns/cancel-all', verifyToken, async (req, res) => {
  const db = await dbPromise;

  try {
    const result = await db.run(
      "UPDATE campaign_runs SET status = 'Cancelled' WHERE status IN ('Scheduled', 'Queued')"
    );

    const count = result.changes;
    logger.info(`Cancelled ${count} scheduled/queued campaigns`);
    emitActivity('campaigns_cancelled', `${count} scheduled/queued campaigns cancelled`);

    return res.json({ success: true, cancelled: count });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false });
  }
});

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
// CAMPAIGN PROCESS (FINAL)
// =====================================================
async function processRun(runId, templateId, groupIds) {

  logger.info(`PROCESS RUN STARTED -> ${runId}`);
  logger.info(`Group IDs: ${JSON.stringify(groupIds)}`);

  const db = await dbPromise;
  let sent = 0;
  let failed = 0;
  currentRunId = runId;
  shouldStopCampaign = false;

  try {

    if (!waClient || !waClient.info)
      throw new Error('WhatsApp not ready');

    const template = await db.get(
      `SELECT * FROM campaign_templates WHERE id=?`,
      [templateId]
    );

    if (!template)
      throw new Error('Template not found');

    // Parse attachment if it exists
    if (template.attachment) {
      try {
        template.attachment = JSON.parse(template.attachment);
      } catch (e) {
        template.attachment = null;
      }
    }

    // Ensure groupIds is an array
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

    // JOIN-based contact retrieval (only opted-in contacts)
    const contacts = await db.all(
      `SELECT c.*
       FROM contacts c
       JOIN group_contacts gc
         ON c.id = gc.contact_Id
       WHERE gc.group_Id IN (${groupIdsArray.map(() => '?').join(',')})
       AND (c.optedIn IS NULL OR c.optedIn = 1)`,
      groupIdsArray
    );

    logger.info(`Contacts loaded: ${contacts.length}`);
    logger.info(`Contact details: ${JSON.stringify(contacts.map(c => ({ phone: c.phone, optedIn: c.optedIn })))}`);
    
    // If no contacts found (all opted out), mark as completed with 0 sent
    if (contacts.length === 0) {
      logger.warn('No opted-in contacts found in selected groups');
      
      await db.run(
        `UPDATE reports SET totalContacts=0, sent=0, failed=0, progress=100 WHERE campaignRunId=?`,
        runId
      );
      
      await db.run(
        `UPDATE campaign_runs SET status='Sent' WHERE id=?`,
        runId
      );
      
      isCampaignRunning = false;
      currentRunId = null;
      shouldStopCampaign = false;
      
      emitActivity('campaign_completed', 'Campaign completed - no opted-in contacts found in selected groups', { runId });
      return;
    }

    // Get rate limiting setting
    const settings = await db.all(`SELECT * FROM settings`);
    const settingsObj = settings.reduce((acc, { key, value }) => {
      acc[key] = isNaN(Number(value)) ? value : Number(value);
      return acc;
    }, {});
    const messagesPerHour = settingsObj.messagesPerHour || 30; // Reduced from 65 to 30 to avoid restrictions
    const baseDelay = Math.round(3600000 / messagesPerHour);
    const minMessageDelay = Math.max(baseDelay, 5000); // Minimum 5s delay to prevent disconnection

    // Helper for random delay with jitter (adds 0-50% randomness to appear more human)
    const getRandomDelay = (baseMs) => {
      const jitter = Math.random() * (baseMs * 0.5);
      return Math.round(baseMs + jitter);
    };

    logger.info(`Rate limit: ${messagesPerHour} msgs/hour, base delay: ${minMessageDelay}ms with jitter`);
    logger.info(`WhatsApp client status: ${waClient ? 'exists' : 'null'}, info: ${waClient?.info?.wid?._serialized || 'no info'}`);

    await db.run(
      `UPDATE reports SET totalContacts=? WHERE campaignRunId=?`,
      [contacts.length, runId]
    );

    for (const contact of contacts) {

      logger.info(`Processing contact: ${contact.phone}, optedIn: ${contact.optedIn}`);

      // Check if WhatsApp is still connected before each message
      if (!waClient) {
        logger.error('WhatsApp client is null during campaign');
        throw new Error('WhatsApp client disconnected');
      }

      try {

        // Small delay to let WhatsApp client stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        const formatted = normalizePhone(contact.phone);
        logger.info(`Looking up WhatsApp ID for: ${formatted}`);
        
        // Add timeout for getNumberId (increased to 30 seconds)
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

        let message = applyTemplateVariables(template.message, contact);

        // =======================
        // ATTACHMENT SUPPORT
        // =======================
        if (template.attachment && template.attachment.data) {
          try {
            const { mimeType, data, filename } = template.attachment;
            
            // For videos, send as document without caption (more reliable)
            const isVideo = mimeType.startsWith('video/');
            
            if (isVideo) {
              // Send video as document - no caption for videos
              const media = new MessageMedia(
                'application/octet-stream',
                data,
                filename
              );
              await waClient.sendMessage(numberId._serialized, media);
              logger.info(`Sent video to ${formatted}`);
            } else {
              // Images and PDFs - send with caption
              const media = new MessageMedia(mimeType, data, filename);
              await waClient.sendMessage(numberId._serialized, media, { caption: message });
              logger.info(`Sent to ${formatted}`);
            }
            sent++;
            
          } catch (mediaErr) {
            logger.error({ 
              err: mediaErr, 
              mimeType: template.attachment.mimeType,
              filename: template.attachment.filename,
              dataLength: template.attachment.data?.length 
            }, 'ATTACHMENT SEND FAILED - trying without attachment');
            
            await waClient.sendMessage(numberId._serialized, message);
            sent++;
          }

        } else {
          logger.info(`Sending message to ${numberId._serialized}: ${message.substring(0, 50)}...`);
          await waClient.sendMessage(numberId._serialized, message);
          logger.info(`Sent to ${formatted}`);
          sent++;
        }

      } catch (err) {
        logger.error({ err, contact: contact.phone }, 'SEND FAILED');
        
        // Store failed message with reason
        const reason = err.message || err.toString() || 'Unknown error';
        await db.run(
          `INSERT INTO failed_messages (campaignRunId, contactPhone, contactName, reason, createdAt) VALUES (?, ?, ?, ?, ?)`,
          [runId, contact.phone, contact.name || null, reason, new Date().toISOString()]
        );
        
        failed++;
      }

      const progress = ((sent + failed) / contacts.length) * 100;

      await db.run(
        `UPDATE reports
         SET sent=?, failed=?, progress=?
         WHERE campaignRunId=?`,
        [sent, failed, progress, runId]
      );

      io.emit('campaign_progress', { runId, sent, failed, progress });

      // Check if campaign should stop
      if (shouldStopCampaign) {
        logger.info(`Campaign stopped by user at ${sent + failed}/${contacts.length}`);
        
        await db.run(
          `UPDATE campaign_runs SET status='Stopped' WHERE id=?`,
          [runId]
        );

        emitActivity('campaign_stopped', 'Campaign stopped by user', { runId, sent, failed });
        
        isCampaignRunning = false;
        currentRunId = null;
        shouldStopCampaign = false;
        return;
      }

      // Rate limiting: dynamic delay with jitter to appear more human
      if (sent + failed < contacts.length) {
        await new Promise(r => setTimeout(r, getRandomDelay(minMessageDelay)));
      }
    }

    await db.run(
      `UPDATE campaign_runs SET status='Sent' WHERE id=?`,
      [runId]
    );

    // Get failed contacts for retry
    const maxRetries = settingsObj.maxRetries || 3;
    const currentRetryCount = (await db.get(`SELECT retryCount FROM campaign_runs WHERE id=?`, [runId]))?.retryCount || 0;
    
    if (failed > 0 && currentRetryCount < maxRetries) {
      logger.info(`Retrying failed messages: ${failed} contacts, attempt ${currentRetryCount + 1}/${maxRetries}`);
      
      // Get failed contacts (those that were not sent)
      const failedContacts = await db.all(`
        SELECT c.* FROM contacts c
        JOIN group_contacts gc ON c.id = gc.contact_id
        WHERE gc.group_id IN (${groupIds.map(() => '?').join(',')})
        AND c.id NOT IN (
          SELECT contactId FROM reports 
          WHERE campaignRunId = ? AND status = 'sent'
        )
        AND c.optedIn = 1
      `, [...groupIds, runId]);
      
      // Update retry count
      await db.run(`UPDATE campaign_runs SET retryCount = ? WHERE id=?`, [currentRetryCount + 1, runId]);
      
      // Retry sending to failed contacts
      for (const contact of failedContacts) {
        if (shouldStopCampaign) break;
        
        try {
          const formatted = normalizePhone(contact.phone);
          const numberId = await waClient.getNumberId(`${formatted}@c.us`);
          
          if (!numberId) continue;
          
          let message = applyTemplateVariables(template.message, contact);
          
          if (template.attachment && template.attachment.data) {
            const { mimeType, data, filename } = template.attachment;
            const isVideo = mimeType.startsWith('video/');
            
            if (isVideo) {
              const media = new MessageMedia('application/octet-stream', data, filename);
              await waClient.sendMessage(numberId._serialized, media);
            } else {
              const media = new MessageMedia(mimeType, data, filename);
              await waClient.sendMessage(numberId._serialized, media, { caption: message });
            }
          } else {
            await waClient.sendMessage(numberId._serialized, message);
          }
          
          sent++;
          
        } catch (err) {
          logger.error({ err }, 'RETRY SEND FAILED');
        }
        
        // Rate limiting for retries too (with jitter)
        await new Promise(r => setTimeout(r, getRandomDelay(minMessageDelay)));
      }
      
      // Update final report
      const finalReport = await db.get(`SELECT * FROM reports WHERE campaignRunId=?`, runId);
      await db.run(
        `UPDATE reports SET sent=?, failed=? WHERE campaignRunId=?`,
        [sent, failed, runId]
      );
      
      logger.info(`Retry complete: ${sent} sent, ${failed} failed`);
    }

    emitActivity('campaign_completed', `Campaign completed (${sent} sent, ${failed} failed)`, { runId });

  } catch (err) {

    logger.error({ err, runId, templateId, groupIds }, 'PROCESS RUN FAILED');
    logger.error('Error message:', err.message);
    logger.error('Error stack:', err.stack);

    await db.run(
      `UPDATE campaign_runs SET status='Failed' WHERE id=?`,
      runId
    );
    
    emitActivity('campaign_failed', `Campaign failed: ${err.message}`, { runId });
  }

  isCampaignRunning = false;
  currentRunId = null;
  shouldStopCampaign = false;

  // Check for queued campaigns and auto-start next
  try {
    const db = await dbPromise;
    const nextQueued = await db.get(
      "SELECT * FROM campaign_runs WHERE status = 'Queued' ORDER BY queuePosition ASC LIMIT 1"
    );

    if (nextQueued) {
      logger.info(`Auto-starting queued campaign: ${nextQueued.id}`);
      
      await db.run(`UPDATE campaign_runs SET status = 'Sending' WHERE id = ?`, [nextQueued.id]);
      
      const groupIds = JSON.parse(nextQueued.targetGroupIds);
      isCampaignRunning = true;
      
      processRun(nextQueued.id, nextQueued.campaignTemplateId, groupIds)
        .catch(err => logger.error({ err }, 'Queued campaign crashed'));
    }
  } catch (err) {
    logger.error({ err }, 'Queue processing error');
  }
}


// =====================================================
// SOCKET
// =====================================================

// REST API fallback for WhatsApp connection (more reliable on Windows)
app.post('/api/whatsapp/connect', verifyToken, async (req, res) => {
  console.error('[WA] WhatsApp connect API called, waStatus:', waStatus, 'waClient exists:', !!waClient);
  logger.info(`WhatsApp connect API called, waStatus: ${waStatus}, waClient exists: ${!!waClient}`);
  
  if (waClient && waStatus === 'CONNECTED') {
    return res.json({ success: true, status: waStatus, message: 'WhatsApp already connected' });
  }
  
  changeStatus('CONNECTING');
  
  try {
    console.error('[WA] Calling initializeWhatsAppClient...');
    await initializeWhatsAppClient();
    console.error('[WA] After init, waStatus:', waStatus);
    return res.json({ success: true, status: waStatus });
  } catch (err) {
    console.error('[WA] Exception in connect:', err.message);
    logger.error({ err }, 'WhatsApp connect failed');
    changeStatus('FAILED');
    return res.status(500).json({ success: false, message: 'Failed to connect WhatsApp' });
  }
});

app.post('/api/whatsapp/disconnect', verifyToken, async (req, res) => {
  if (waClient) {
    await waClient.destroy();
    waClient = null;
  }
  const sessionPath = getSessionPath();
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
  changeStatus('DISCONNECTED');
  res.json({ success: true });
});

io.use(verifySocketToken);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}, token: ${socket.handshake.auth.token ? 'present' : 'missing'}`);

  socket.emit('status_change', waStatus);

  socket.on('connect_wa', async () => {
    logger.info(`connect_wa received, current waStatus: ${waStatus}, waClient exists: ${!!waClient}`);
    if (waClient) {
      logger.info('WhatsApp client already exists, skipping init');
      return;
    }
    changeStatus('CONNECTING');
    try {
      await initializeWhatsAppClient();
    } catch (err) {
      logger.error({ err }, 'Failed to initialize WhatsApp');
      changeStatus('FAILED');
    }
  });

  socket.on('disconnect_wa', async () => {
    if (waClient) {
      await waClient.destroy();
      waClient = null;
    }
    // Clear session folder to force new QR code for different number
    const sessionPath = getSessionPath();
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    changeStatus('DISCONNECTED');
  });

});

// =====================================================
// FRONTEND
// =====================================================
// Determine correct path based on environment

console.log('=== Determining Frontend Path ===');
console.log('__dirname:', __dirname);
console.log('process.resourcesPath:', process.resourcesPath);

// Check if running in packaged app (Electron)
const isPackaged = !!process.resourcesPath;

// Check if we're in Docker (has /app/client/dist)
const dockerPath = path.join(__dirname, '..', 'client', 'dist');
const packagedPath = path.join(__dirname, '..', 'dist');
const packagedPath2 = path.join(__dirname, '..', '..', 'dist');

console.log('isPackaged:', isPackaged);
console.log('dockerPath:', dockerPath, 'exists:', fs.existsSync(dockerPath));
console.log('packagedPath:', packagedPath, 'exists:', fs.existsSync(packagedPath));
console.log('packagedPath2:', packagedPath2, 'exists:', fs.existsSync(packagedPath2));

let clientBuildPath;
if (isPackaged) {
  // In packaged app: server is in app.asar.unpacked/server, dist is in app.asar.unpacked/dist
  if (fs.existsSync(packagedPath)) {
    clientBuildPath = packagedPath;
  } else if (fs.existsSync(packagedPath2)) {
    clientBuildPath = packagedPath2;
  }
} else if (fs.existsSync(dockerPath)) {
  // In Docker: server is in server/, client is in client/
  clientBuildPath = dockerPath;
} else if (fs.existsSync(packagedPath)) {
  clientBuildPath = packagedPath;
}

console.log('clientBuildPath selected:', clientBuildPath);
console.log('===========================');

if (!clientBuildPath || !fs.existsSync(clientBuildPath)) {
  console.error('ERROR: Frontend build path not found!');
} else {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}


// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
async function gracefulShutdown() {

  logger.info('Graceful shutdown initiated');

  try {
    if (waClient) {
      await waClient.destroy();
      waClient = null;
    }
  } catch (err) {
    logger.error({ err }, 'Shutdown error');
  }

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


// =====================================================
// START
// =====================================================
async function startServer() {

  await fsPromises.mkdir(getDataPath(), { recursive: true });
  await dbPromise;

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`OSDSarvaya Server v${APP_VERSION} (API ${API_VERSION}) running on port ${PORT}`);
  });
}

startServer();
