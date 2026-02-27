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

let mainWindow = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getUnpackedPath(relativePath) {
  // In packaged app, unpacked files are in app.asar.unpacked
  // In development, files are directly accessible
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
  }
  return path.join(__dirname, '..', relativePath);
}

function startServer() {
  const serverPath = getUnpackedPath('server');
  const serverFile = path.join(serverPath, 'server.js');
  
  log.info('Server path:', serverPath);
  log.info('Server file exists:', fs.existsSync(serverFile));
  
  if (!fs.existsSync(serverFile)) {
    log.error('Server file NOT found at:', serverFile);
    return false;
  }
  
  // Add server node_modules
  const serverNodeModules = path.join(serverPath, 'node_modules');
  if (fs.existsSync(serverNodeModules)) {
    module.paths.unshift(serverNodeModules);
    log.info('Added server node_modules');
  }

  try {
    // Load environment
    const envPath = path.join(serverPath, 'production.env');
    if (!fs.existsSync(envPath)) {
      // Try resources path for production.env
      const prodEnvPath = path.join(process.resourcesPath, 'production.env');
      if (fs.existsSync(prodEnvPath)) {
        require('dotenv').config({ path: prodEnvPath });
        log.info('Loaded production.env from resources');
      }
    } else {
      require('dotenv').config({ path: envPath });
      log.info('Loaded production.env from server folder');
    }
    
    // Load server
    require(serverFile);
    log.info('Server started successfully');
    return true;
  } catch (err) {
    log.error('Failed to start server:', err.message);
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
    // Fallback to file
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
