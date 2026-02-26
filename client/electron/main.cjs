const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');
log.info('App path:', app.getAppPath());
log.info('Is packaged:', app.isPackaged);

let serverProcess = null;
let mainWindow = null;

const isDev = !app.isPackaged;
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

function getServerPath() {
  const resourcesPath = process.resourcesPath;
  
  if (app.isPackaged) {
    const serverPath = path.join(resourcesPath, 'server');
    
    if (fs.existsSync(serverPath)) {
      log.info(`Server found at: ${serverPath}`);
      return serverPath;
    }
    
    log.error(`Server not found at: ${serverPath}`);
  }
  
  if (isDev) {
    return path.join(__dirname, '..', 'server');
  }
  
  return path.join(__dirname, '..', 'server');
}

function startServer() {
  const serverPath = getServerPath();
  
  log.info(`Starting server from: ${serverPath}`);
  log.info(`Server path exists: ${fs.existsSync(serverPath)}`);
  
  const envFile = path.join(serverPath, 'production.env');
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
  const iconPath = isDev 
    ? path.join(__dirname, '..', 'public', 'favicon.ico')
    : path.join(app.getAppPath(), 'dist', 'favicon.ico');
  
  const htmlPath = isDev
    ? path.join(__dirname, '..', 'dist', 'index.html')
    : path.join(app.getAppPath(), 'dist', 'index.html');
  
  log.info('Loading HTML from:', htmlPath);
  log.info('HTML path exists:', fs.existsSync(htmlPath));
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OSDSarvaya',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window shown');
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
  
  setTimeout(() => {
    createWindow();
  }, 3000);
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
