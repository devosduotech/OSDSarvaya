const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../logger');

const UPDATES_DIR = path.join(__dirname, '..', 'updates');
const UPDATES_JSON = path.join(UPDATES_DIR, 'updates.json');

const APP_VERSION = '1.0.1';

function ensureUpdatesDir() {
    if (!fs.existsSync(UPDATES_DIR)) {
        fs.mkdirSync(UPDATES_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPDATES_JSON)) {
        const defaultManifest = {
            latest: APP_VERSION,
            minVersion: APP_VERSION,
            updates: []
        };
        fs.writeFileSync(UPDATES_JSON, JSON.stringify(defaultManifest, null, 2));
    }
}

function getUpdatesManifest() {
    ensureUpdatesDir();
    try {
        return JSON.parse(fs.readFileSync(UPDATES_JSON, 'utf8'));
    } catch (err) {
        logger.error({ err }, 'Failed to read updates.json');
        return { latest: APP_VERSION, minVersion: APP_VERSION, updates: [] };
    }
}

function saveUpdatesManifest(manifest) {
    ensureUpdatesDir();
    fs.writeFileSync(UPDATES_JSON, JSON.stringify(manifest, null, 2));
}

router.get('/check', (req, res) => {
    try {
        const manifest = getUpdatesManifest();
        const clientVersion = req.query.version || '0.0.0';
        
        const currentVersion = manifest.latest;
        const minVersion = manifest.minVersion || '1.0.0';
        
        const isUpdateAvailable = compareVersions(clientVersion, currentVersion) < 0;
        const isMinVersionOk = compareVersions(clientVersion, minVersion) >= 0;
        
        let updateInfo = null;
        
        if (isUpdateAvailable) {
            const update = manifest.updates.find(u => u.version === currentVersion);
            if (update) {
                updateInfo = {
                    version: update.version,
                    downloadUrl: update.downloadUrl,
                    changelog: update.changelog,
                    releaseDate: update.releaseDate,
                    mandatory: update.mandatory || false
                };
            }
        }

        res.json({
            success: true,
            currentVersion: currentVersion,
            updateAvailable: isUpdateAvailable,
            minVersionOk: isMinVersionOk,
            update: updateInfo
        });
    } catch (err) {
        logger.error({ err }, 'Failed to check for updates');
        res.status(500).json({ success: false, message: 'Failed to check for updates' });
    }
});

router.get('/download/:version', (req, res) => {
    try {
        const { version } = req.params;
        const manifest = getUpdatesManifest();
        
        const update = manifest.updates.find(u => u.version === version);
        
        if (!update || !update.filename) {
            return res.status(404).json({ success: false, message: 'Update not found' });
        }

        const filePath = path.join(UPDATES_DIR, update.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Update file not found on server' });
        }

        res.download(filePath, update.filename, (err) => {
            if (err) {
                logger.error({ err }, 'Failed to download update');
            }
        });
    } catch (err) {
        logger.error({ err }, 'Failed to download update');
        res.status(500).json({ success: false, message: 'Failed to download update' });
    }
});

router.get('/latest', (req, res) => {
    try {
        const manifest = getUpdatesManifest();
        res.json({
            success: true,
            version: manifest.latest,
            minVersion: manifest.minVersion
        });
    } catch (err) {
        logger.error({ err }, 'Failed to get latest version');
        res.status(500).json({ success: false, message: 'Failed to get latest version' });
    }
});

router.get('/info/:version', (req, res) => {
    try {
        const { version } = req.params;
        const manifest = getUpdatesManifest();
        
        const update = manifest.updates.find(u => u.version === version);
        
        if (!update) {
            return res.status(404).json({ success: false, message: 'Version not found' });
        }

        res.json({ success: true, ...update });
    } catch (err) {
        logger.error({ err }, 'Failed to get version info');
        res.status(500).json({ success: false, message: 'Failed to get version info' });
    }
});

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    
    return 0;
}

module.exports = router;
