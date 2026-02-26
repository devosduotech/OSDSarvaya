const { execSync } = require('child_process');

let version = process.env.APP_VERSION || '1.0.0';

if (!process.env.APP_VERSION) {
  try {
    version = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch (e) {
    // Use default version if git describe fails
  }
}

module.exports = { APP_VERSION: version };
