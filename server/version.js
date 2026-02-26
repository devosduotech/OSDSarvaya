const { execSync } = require('child_process');

let version = '1.0.0';
try {
  version = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
} catch (e) {
  // Use default version if git describe fails
}

module.exports = { APP_VERSION: version };
