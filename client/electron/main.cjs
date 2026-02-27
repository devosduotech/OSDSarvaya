const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');
log.info('App is packaged:', app.isPackaged);
log.info('Resources path:', process.resourcesPath);
log.info('App path:', app.getAppPath());

// Preload server dependencies to make them available in server process
const preloadServerDeps = () => {
  log.info('Preloading server dependencies...');
  
  const deps = [
    'dotenv', 'express', 'http', 'https', 'path', 'fs', 'url',
    'util', 'crypto', 'events', 'stream', 'buffer', 'querystring',
    'cors', 'helmet', 'jsonwebtoken', 'socket.io',
    'puppeteer', 'whatsapp-web.js', 'qrcode'
  ];
  
  deps.forEach(dep => {
    try {
      require(dep);
    } catch (e) {
      // Silently skip if not found - some may be optional
    }
  });
  
  log.info('Dependencies preloaded');
};

let mainWindow = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getUnpackedPath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
  }
  return path.join(__dirname, '..', relativePath);
}

function startServer() {
  // Preload client dependencies
  preloadServerDeps();
  
  const serverPath = getUnpackedPath('server');
  const serverFile = path.join(serverPath, 'server.js');
  const serverNodeModules = path.join(serverPath, 'node_modules');
  
  log.info('Server path:', serverPath);
  log.info('Server file exists:', fs.existsSync(serverFile));
  log.info('Server node_modules exists:', fs.existsSync(serverNodeModules));
  
  if (!fs.existsSync(serverFile)) {
    log.error('Server file NOT found at:', serverFile);
    return false;
  }
  
  // CRITICAL: Change working directory to server path BEFORE anything else
  // This makes relative requires work correctly
  try {
    process.chdir(serverPath);
    log.info('Changed working directory to:', process.cwd());
  } catch (err) {
    log.error('Failed to chdir:', err.message);
  }
  
  // Add server node_modules to the front of module paths
  if (fs.existsSync(serverNodeModules)) {
    module.paths = [serverNodeModules, ...module.paths];
    log.info('Updated module paths');
  }

  try {
    // Load environment
    const envPath = path.join(serverPath, 'production.env');
    if (!fs.existsSync(envPath)) {
      const prodEnvPath = path.join(process.resourcesPath, 'production.env');
      if (fs.existsSync(prodEnvPath)) {
        require('dotenv').config({ path: prodEnvPath });
      }
    } else {
      require('dotenv').config({ path: envPath });
    }
    
    // Now require the server
    require(serverFile);
    log.info('Server started successfully');
    return true;
  } catch (err) {
    log.error('Failed to start server:', err.message);
    log.error('Error stack:', err.stack);
    return false;
  }
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

  // Try server URL first
  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = getUnpackedPath('dist/index.html');
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
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
