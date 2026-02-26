const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

log.info('OSDSarvaya starting...');

let serverProcess = null;
let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development';
const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

log.info('App path:', app.getAppPath());
log.info('Is packaged:', app.isPackaged);
log.info('User data path:', app.getPath('userData'));
log.info('Resources path:', process.resourcesPath);

function getAppRoot() {
  if (app.isPackaged) {
    // In packaged app, app.getAppPath() returns the asar path
    // But files in extraResources are in process.resourcesPath
    return process.resourcesPath;
  }
  return path.join(__dirname, '..');
}

function getServerPath() {
  const appRoot = getAppRoot();
  const serverPath = path.join(appRoot, 'server');
  log.info('Server path:', serverPath);
  log.info('Server exists:', fs.existsSync(serverPath));
  return serverPath;
}

function startServer() {
  try {
    const serverPath = getServerPath();
    log.info('Starting server from:', serverPath);
    
    if (!fs.existsSync(serverPath)) {
      log.error('Server directory not found!');
      return;
    }
    
    const serverFile = path.join(serverPath, 'server.js');
    if (!fs.existsSync(serverFile)) {
      log.error('server.js not found at:', serverFile);
      return;
    }
    
    // Check for production.env
    let envFile = path.join(serverPath, 'production.env');
    if (!fs.existsSync(envFile)) {
      envFile = path.join(process.resourcesPath, 'production.env');
    }
    
    log.info('Using env file:', envFile, 'exists:', fs.existsSync(envFile));
    
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString()
    };
    
    if (fs.existsSync(envFile)) {
      try {
        const envContent = fs.readFileSync(envFile, 'utf-8');
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
              const key = trimmed.substring(0, idx).trim();
              const value = trimmed.substring(idx + 1).trim();
              env[key] = value;
            }
          }
        });
        log.info('Loaded env file');
      } catch (e) {
        log.warn('Could not load env file:', e.message);
      }
    }
    
    serverProcess = spawn('node', ['server.js'], {
      cwd: serverPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env,
      detached: false,
      windowsHide: true
    });
    
    serverProcess.stdout.on('data', (data) => {
      log.info('Server:', data.toString().trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      log.error('Server error:', data.toString().trim());
    });
    
    serverProcess.on('error', (err) => {
      log.error('Server spawn error:', err.message);
    });
    
    serverProcess.on('exit', (code) => {
      log.info('Server exited with code:', code);
    });
    
    log.info('Server process started');
  } catch (err) {
    log.error('Error starting server:', err.message);
  }
}

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
    log.info('Main window shown via ready-to-show');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Content loaded successfully');
    log.info('Current URL:', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warn', 'error'];
    log.info(`Console[${levels[level]}]: ${message}`);
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load from local server in both dev and production
  // This ensures the app works properly
  mainWindow.loadURL(SERVER_URL).catch(err => {
    log.error('Failed to load URL:', err);
    // Fallback to file if server fails
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    log.info('Trying fallback to file:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(e => {
      log.error('Failed to load file:', e);
    });
  });

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
