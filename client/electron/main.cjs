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

let mainWindow = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function startServer() {
  // Get paths
  const appPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname, '..');
  
  const serverPath = path.join(appPath, 'server');
  const distPath = path.join(appPath, 'dist');
  
  log.info('App path:', appPath);
  log.info('Server path:', serverPath, 'exists:', fs.existsSync(serverPath));
  log.info('Dist path:', distPath, 'exists:', fs.existsSync(distPath));
  
  // Add server's node_modules to module paths
  const serverNodeModules = path.join(serverPath, 'node_modules');
  if (fs.existsSync(serverNodeModules)) {
    module.paths.unshift(serverNodeModules);
    log.info('Added server node_modules to path');
  }
  
  // Also add client node_modules for any shared deps
  const clientNodeModules = path.join(__dirname, '..', 'node_modules');
  if (fs.existsSync(clientNodeModules)) {
    module.paths.unshift(clientNodeModules);
  }

  try {
    // Change to server directory and require
    process.chdir(serverPath);
    
    // Load environment
    const envPath = path.join(serverPath, 'production.env');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
    
    // Load the server
    require(path.join(serverPath, 'server.js'));
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
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    log.info('Falling back to:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => log.error('Error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  startServer();
  
  // Wait for server to be ready
  setTimeout(() => {
    createWindow();
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
