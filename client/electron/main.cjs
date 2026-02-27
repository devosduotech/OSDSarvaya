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

function getDistPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
  }
  return path.join(__dirname, '..', 'dist');
}

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'server');
  }
  return path.join(__dirname, '..', 'server');
}

function findNode() {
  const pathEnv = process.env.PATH || '';
  const paths = pathEnv.split(path.delimiter);
  
  for (const p of paths) {
    const nodePath = path.join(p, 'node.exe');
    if (fs.existsSync(nodePath)) return nodePath;
    const nodeCmd = path.join(p, 'node.cmd');
    if (fs.existsSync(nodeCmd)) return nodeCmd;
  }
  
  const commonPaths = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    process.env.LOCALAPPDATA + '\\Programs\\node\\node.exe',
    process.env.APPDATA + '\\nvm\\current\\node.exe'
  ];
  
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  
  return null;
}

function startServer() {
  const serverPath = getServerPath();
  const serverFile = path.join(serverPath, 'server.js');
  
  log.info('Server path:', serverPath);
  log.info('Server exists:', fs.existsSync(serverFile));
  
  if (!fs.existsSync(serverFile)) {
    log.error('Server not found at:', serverFile);
    return false;
  }
  
  const nodePath = findNode();
  log.info('Node path:', nodePath);
  
  if (!nodePath) {
    log.error('Node.js not found! Please install Node.js from https://nodejs.org');
    return false;
  }
  
  const serverNodeModules = path.join(serverPath, 'node_modules');
  const env = { 
    ...process.env, 
    NODE_ENV: 'production',
    NODE_PATH: serverNodeModules
  };
  
  log.info('Using NODE_PATH:', serverNodeModules);
  
  serverProcess = spawn(nodePath, ['server.js'], {
    cwd: serverPath,
    stdio: 'pipe',
    env: env,
    windowsHide: true,
    shell: false
  });
  
  serverProcess.on('error', (err) => {
    log.error('Server error:', err.message);
  });
  
  serverProcess.on('exit', (code) => {
    log.info('Server exited:', code);
  });
  
  serverProcess.stdout.on('data', (data) => {
    log.info('Server:', data.toString().trim());
  });
  
  serverProcess.stderr.on('data', (data) => {
    log.error('Server err:', data.toString().trim());
  });
  
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

  mainWindow.loadURL(SERVER_URL).catch(() => {
    const htmlPath = path.join(getDistPath(), 'index.html');
    log.info('Fallback to:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => log.error('Error:', e.message));
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  startServer();
  setTimeout(() => createWindow(), 5000);
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
