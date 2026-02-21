import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname, '..');
const serverDir = path.join(clientDir, '..', 'server');
const targetDir = path.join(clientDir, 'server');

const dirsToCopy = ['routes', 'middleware', 'database.js', 'server.js', 'logger.js', 'ecosystem.config.js'];
const filesToCopy = ['package.json'];

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

console.log('Copying server files to client...');

if (fs.existsSync(serverDir)) {
  copyDir(serverDir, targetDir);
  ensureEnvFile();
  console.log('Server files copied successfully!');
} else {
  console.error('Server directory not found!');
  process.exit(1);
}
