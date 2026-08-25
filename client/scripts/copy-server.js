import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname, '..');
const serverDir = path.join(clientDir, '..', 'server');
const targetDir = path.join(clientDir, 'server');

const dirsToCopy = ['routes', 'middleware', 'services', 'utils', 'database.js', 'server.js', 'logger.js', 'ecosystem.config.js', 'version.js'];
const filesToCopy = ['package.json', 'package-lock.json'];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureEnvFile() {
  const envExample = path.join(serverDir, '.env.example');
  const envTarget = path.join(targetDir, '.env');
  const envProduction = path.join(clientDir, '..', 'production.env');
  
  if (!fs.existsSync(envTarget)) {
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envTarget);
    }
  }
  
  if (fs.existsSync(envProduction) && !fs.existsSync(path.join(targetDir, 'production.env'))) {
    fs.copyFileSync(envProduction, path.join(targetDir, 'production.env'));
  }
}

function copyClientPackageJson() {
  const clientPackageJson = path.join(clientDir, 'package.json');
  const targetPackageJson = path.join(targetDir, 'client-package.json');

  if (fs.existsSync(clientPackageJson)) {
    fs.copyFileSync(clientPackageJson, targetPackageJson);
    console.log('Copied client package.json for versioning');
  }
}

function installServerDependencies() {
  const nodeModules = path.join(targetDir, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    console.log('server/node_modules already present, skipping install');
    return;
  }

  console.log('Installing server production dependencies...');
  execSync('npm ci --omit=dev', { cwd: targetDir, stdio: 'inherit' });
}

console.log('Copying server files to client...');

if (fs.existsSync(serverDir)) {
  copyDir(serverDir, targetDir);
  ensureEnvFile();
  copyClientPackageJson();

  // Remove .env file in packaged app - we use production.env instead
  const envFile = path.join(targetDir, '.env');
  if (fs.existsSync(envFile)) {
    fs.unlinkSync(envFile);
    console.log('Removed .env file (using production.env instead)');
  }

  // Never ship runtime data or tests inside the packaged app
  const runtimeDataDir = path.join(targetDir, 'data');
  if (fs.existsSync(runtimeDataDir)) {
    fs.rmSync(runtimeDataDir, { recursive: true, force: true });
    console.log('Removed runtime data directory from packaged server');
  }
  const testsDir = path.join(targetDir, 'tests');
  if (fs.existsSync(testsDir)) {
    fs.rmSync(testsDir, { recursive: true, force: true });
    console.log('Removed tests directory from packaged server');
  }

  installServerDependencies();

  console.log('Server files copied successfully!');
} else {
  console.error('Server directory not found!');
  process.exit(1);
}
