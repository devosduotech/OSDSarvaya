const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CHROME_VERSION = '145.0.7632.159';
const CLIENT_DIR = path.join(__dirname, '..');
const CHROME_DIR = path.join(CLIENT_DIR, 'chrome-win64');
const ZIP_PATH = path.join(CLIENT_DIR, 'chrome-win64.zip');

console.log('Downloading Chrome for Windows build...');
console.log('Version:', CHROME_VERSION);

// Chrome download URL for Windows 64-bit
const chromeUrl = `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/win64/chrome-win64.zip`;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('Downloading from:', url);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;
      
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}%`);
        }
      });
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve();
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

async function main() {
  try {
    // Check if Chrome already extracted
    if (fs.existsSync(CHROME_DIR) && fs.existsSync(path.join(CHROME_DIR, 'chrome.exe'))) {
      console.log('Chrome already downloaded and extracted.');
      process.exit(0);
    }
    
    // Download Chrome
    if (!fs.existsSync(ZIP_PATH)) {
      console.log('Downloading Chrome...');
      await downloadFile(chromeUrl, ZIP_PATH);
    } else {
      console.log('Chrome zip already exists.');
    }

    // Extract Chrome
    console.log('Extracting Chrome...');
    if (fs.existsSync(CHROME_DIR)) {
      fs.rmSync(CHROME_DIR, { recursive: true, force: true });
    }
    
    try {
      execSync('unzip -o chrome-win64.zip', { stdio: 'inherit', cwd: CLIENT_DIR });
    } catch (e) {
      // Fallback to powershell on Windows
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${CLIENT_DIR}' -Force"`, { 
          stdio: 'inherit',
          cwd: CLIENT_DIR
        });
      } catch (e2) {
        console.log('Extraction failed with both methods');
      }
    }
    
    if (fs.existsSync(CHROME_DIR)) {
      console.log('Chrome extracted successfully to:', CHROME_DIR);
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    // Don't fail the build if Chrome download fails
    console.log('Continuing without bundled Chrome...');
  }
}

main();
