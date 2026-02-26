const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const log = require('electron-log');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');

let mainWindow = null;

const SERVER_URL = 'http://localhost:3001';

log.info('App path:', app.getAppPath());
log.info('Is packaged:', app.isPackaged);

function createWindow() {
  log.info('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OSDSarvaya',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: true
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window shown');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Content loaded:', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Load failed:', errorCode, errorDescription);
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Try to load from local server first, then fallback to file
  mainWindow.loadURL(SERVER_URL).catch(() => {
    log.info('Server not available, loading from file...');
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(htmlPath).catch(e => {
      log.error('Failed to load file:', e.message);
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
