const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');
log.info('App path:', app.getAppPath());
log.info('Is packaged:', app.isPackaged);
log.info('Resources path:', process.resourcesPath);

let mainWindow = null;
let serverProcess = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function startServer() {
  // Try multiple paths for server
  const possiblePaths = app.isPackaged ? [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'server'),
    path.join(process.resourcesPath, 'server'),
    path.join(app.getAppPath(), 'server')
  ] : [
    path.join(__dirname, '..', 'server')
  ];

  let serverPath = null;
  for (const p of possiblePaths) {
    const serverFile = path.join(p, 'server.js');
    log.info('Checking:', serverFile, 'exists:', fs.existsSync(serverFile));
    if (fs.existsSync(serverFile)) {
      serverPath = p;
      break;
    }
  }

  if (!serverPath) {
    log.error('Server not found!');
    return false;
  }

  log.info('Starting server from:', serverPath);

  // Set up environment
  const env = { ...process.env, NODE_ENV: 'production', PORT: PORT.toString() };

  // Try to load env file
  const envFile = path.join(serverPath, 'production.env');
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf-8');
      content.split('\n').forEach(line => {
        const t = line.trim();
        if (t && !t.startsWith('#')) {
          const i = t.indexOf('=');
          if (i > 0) env[t.substring(0, i).trim()] = t.substring(i + 1).trim();
        }
      });
      log.info('Loaded env file');
    } catch (e) {
      log.warn('Could not load env:', e.message);
    }
  }

  // Start server
  serverProcess = spawn('node', ['server.js'], {
    cwd: serverPath,
    stdio: 'ignore',
    env: env,
    detached: true,
    windowsHide: true
  });

  serverProcess.on('error', (err) => log.error('Server error:', err.message));
  serverProcess.on('exit', (code) => log.info('Server exit:', code));

  log.info('Server started');
  return true;
}

function createWindow() {
  log.info('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OSDSarvaya',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Window shown');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Loaded:', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log.error('Load failed:', code, desc);
  });

  mainWindow.setMenuBarVisibility(false);

  // Try server URL first, then file
  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    log.info('Falling back to:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => log.error('Error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  startServer();
  
  // Wait for server to start
  setTimeout(() => {
    createWindow();
  }, 5000);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch(e) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
