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
    // Determine paths based on whether app is packaged
    let serverPath;
    let serverNodeModules;
    
    if (app.isPackaged) {
      // Server files are in app.asar.unpacked
      serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server');
      // node_modules is in extraResources
      serverNodeModules = path.join(process.resourcesPath, 'server', 'node_modules');
    } else {
      serverPath = path.join(__dirname, '..', 'server');
      serverNodeModules = path.join(serverPath, 'node_modules');
    }
    
    log.info('Server path:', serverPath);
    log.info('Server node_modules:', serverNodeModules);
    log.info('node_modules exists:', fs.existsSync(serverNodeModules));
    
    // Add server node_modules to module search paths
    if (fs.existsSync(serverNodeModules)) {
      module.paths.unshift(serverNodeModules);
    }
    
    // Also add to require cache resolution
    require('module')._initPaths();
    
    // Load and start the server
    const serverEntry = path.join(serverPath, 'server.js');
    log.info('Loading server from:', serverEntry);
    
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(serverEntry)];
    
    const serverModule = require(serverEntry);
    
    log.info('Server modules loaded successfully');
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
