const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const log = require('electron-log');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');

let mainWindow = null;
let serverProcess = null;

const SERVER_URL = 'http://localhost:3001';

function getAppRoot() {
  if (app.isPackaged) {
    return path.dirname(app.getAppPath());
  }
  return path.join(__dirname, '..');
}

function startServer() {
  const serverPath = path.join(getAppRoot(), 'server');
  log.info('Server path:', serverPath);
  
  const serverFile = path.join(serverPath, 'server.js');
  if (!require('fs').existsSync(serverFile)) {
    log.error('Server file not found:', serverFile);
    return false;
  }
  
  const envFile = path.join(serverPath, 'production.env');
  const prodEnvFile = path.join(getAppRoot(), 'production.env');
  
  const env = { ...process.env, NODE_ENV: 'production', PORT: '3001' };
  
  try {
    const fs = require('fs');
    let envPath = envFile;
    if (!fs.existsSync(envPath)) {
      envPath = prodEnvFile;
    }
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const t = line.trim();
        if (t && !t.startsWith('#')) {
          const i = t.indexOf('=');
          if (i > 0) env[t.substring(0, i).trim()] = t.substring(i + 1).trim();
        }
      });
    }
  } catch (e) {
    log.warn('Could not read env file:', e.message);
  }
  
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

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Loaded:', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log.error('Load failed:', code, desc);
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(htmlPath).catch(e => log.error('Load file error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  startServer();
  
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
