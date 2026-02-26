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
log.info('User data path:', app.getPath('userData'));

let serverProcess = null;
let mainWindow = null;

const isDev = !app.isPackaged;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getServerPath() {
  if (app.isPackaged) {
    const serverPath = path.join(process.resourcesPath, 'server');
    if (fs.existsSync(serverPath)) {
      log.info(`Server found at: ${serverPath}`);
      return serverPath;
    }
    const altPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server');
    if (fs.existsSync(altPath)) {
      log.info(`Server found at: ${altPath}`);
      return altPath;
    }
    log.error(`Server not found at: ${serverPath}`);
    return serverPath;
  }
  return path.join(__dirname, '..', 'server');
}

function startServer() {
  const serverPath = getServerPath();
  
  log.info(`Starting server from: ${serverPath}`);
  log.info(`Server path exists: ${fs.existsSync(serverPath)}`);
  
  let envFile = path.join(serverPath, 'production.env');
  if (!fs.existsSync(envFile)) {
    envFile = path.join(process.resourcesPath, 'production.env');
  }
  if (!fs.existsSync(envFile) && !app.isPackaged) {
    envFile = path.join(__dirname, '..', 'production.env');
  }
  
  log.info('Looking for env file at:', envFile);
  
  let envArgs = [];
  
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
    
    Object.assign(process.env, envVars);
    log.info('Loaded environment from production.env');
  }
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: serverPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT
    },
    shell: true,
    windowsHide: true
  });

  serverProcess.on('error', (err) => {
    log.error('Server error:', err);
  });

  serverProcess.on('exit', (code) => {
    log.info(`Server exited with code: ${code}`);
  });
}

function createWindow() {
  let htmlPath;
  
  if (isDev) {
    htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
  } else {
    htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
  }
  
  log.info('Loading HTML from:', htmlPath);
  log.info('App path:', app.getAppPath());
  log.info('Resources path:', process.resourcesPath);
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OSDSarvaya',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window shown via ready-to-show');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Content loaded successfully');
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(SERVER_URL);
  } else {
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  
  let retries = 0;
  const maxRetries = 30;
  
  const checkServer = () => {
    const http = require('http');
    const req = http.get(SERVER_URL, (res) => {
      if (res.statusCode === 200) {
        log.info('Server is ready, creating window');
        createWindow();
      } else {
        retry();
      }
    });
    req.on('error', () => retry());
  };
  
  const retry = () => {
    retries++;
    if (retries >= maxRetries) {
      log.error('Server failed to start after max retries');
      createWindow();
    } else {
      log.info(`Waiting for server... (${retries}/${maxRetries})`);
      setTimeout(checkServer, 1000);
    }
  };
  
  setTimeout(checkServer, 2000);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});
