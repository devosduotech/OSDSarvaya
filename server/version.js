const fs = require('fs');
const path = require('path');

function getVersion() {
  // Try to read from client-package.json (copied during build)
  const buildPackageJson = path.join(__dirname, 'client-package.json');
  
  // Try to read from package.json in the same directory (for development)
  const localPackageJson = path.join(__dirname, 'package.json');
  
  // Try to read from client/package.json (development)
  const clientPackageJson = path.join(__dirname, '..', 'client', 'package.json');
  
  let packageJsonPath = null;
  
  if (fs.existsSync(buildPackageJson)) {
    packageJsonPath = buildPackageJson;
  } else if (fs.existsSync(localPackageJson)) {
    packageJsonPath = localPackageJson;
  } else if (fs.existsSync(clientPackageJson)) {
    packageJsonPath = clientPackageJson;
  }
  
  if (packageJsonPath) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.version) {
        return packageJson.version;
      }
    } catch (e) {
      // Fall through to default
    }
  }
  
  // Fallback: try git tag
  try {
    const { execSync } = require('child_process');
    const version = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return version.replace(/^v/, '');
  } catch (e) {
    return '1.1.0';
  }
}

module.exports = { APP_VERSION: getVersion() };
