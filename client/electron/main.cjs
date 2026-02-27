const { app, BrowserWindow } = require('electron');
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
log.info('App is packaged:', app.isPackaged);
log.info('Resources path:', process.resourcesPath);

let mainWindow = null;
let serverProcess = null;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getUnpackedPath(relativePath) {
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
  
  // Use Electron's Node.js - process.execPath
  const nodeExec = process.execPath;
  log.info('Using Node from:', nodeExec);
  
  // Spawn server as child process
  serverProcess = spawn(nodeExec, ['server.js'], {
    cwd: serverPath,
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PATH: process.env.PATH
    },
    windowsHide: true,
    shell: false
  });
  
  serverProcess.on('error', (err) => {
    log.error('Server process error:', err.message);
  });
  
  serverProcess.on('exit', (code) => {
    log.info('Server process exited with code:', code);
  });
  
  serverProcess.stdout.on('data', (data) => {
    log.info('Server:', data.toString().trim());
  });
  
  serverProcess.stderr.on('data', (data) => {
    log.error('Server error:', data.toString().trim());
  });
  
  log.info('Server process started');
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

  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = getUnpackedPath('dist/index.html');
    log.info('Falling back to:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => log.error('Error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  startServer();
  
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
