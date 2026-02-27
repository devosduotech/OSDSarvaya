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

let mainWindow = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getDistPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
  }
  return path.join(__dirname, '..', 'dist');
}

function getDataPath() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'OSDSarvaya', 'data');
  }
  if (process.platform === 'darwin' && process.env.HOME) {
    return path.join(process.env.HOME, 'Library', 'Application Support', 'OSDSarvaya', 'data');
  }
  return path.join(process.env.HOME || '', '.osdsarvaya', 'data');
}

async function startServer() {
  const dataPath = getDataPath();
  
  log.info('Data path:', dataPath);
  
  // Ensure data directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    log.info('Created data directory:', dataPath);
  }
  
  // Set environment
  process.env.NODE_ENV = 'production';
  process.env.OSDSARVAYA_DATA = dataPath;
  process.env.PORT = PORT.toString();
  
  try {
    // Start the Express server in Electron's process
    // This uses Electron's bundled Node.js - no external Node needed!
    const serverPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server')
      : path.join(__dirname, '..', 'server');
    
    log.info('Loading server from:', serverPath);
    
    // Add server node_modules to module search paths
    const serverNodeModules = path.join(serverPath, 'node_modules');
    if (fs.existsSync(serverNodeModules)) {
      module.paths.unshift(serverNodeModules);
    }
    
    // Load and start the server
    const initializeDb = require(path.join(serverPath, 'database.js'));
    const serverModule = require(path.join(serverPath, 'server.js'));
    
    log.info('Server modules loaded');
    return true;
  } catch (err) {
    log.error('Failed to start server:', err.message);
    log.error(err.stack);
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
    icon: path.join(__dirname, '..', 'public', 'icon.ico'),
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

  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = path.join(getDistPath(), 'index.html');
    log.info('Fallback to:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => log.error('Error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(async () => {
  await startServer();
  setTimeout(() => createWindow(), 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
