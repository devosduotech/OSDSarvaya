const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'machine_id.json');

function getWindowsMachineId() {
    try {
        const output = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 5000 });
        const lines = output.trim().split('\n');
        if (lines.length >= 2) {
            const uuid = lines[1].trim();
            if (uuid && uuid !== 'UUID' && uuid.length > 10) {
                return uuid.toUpperCase();
            }
        }
    } catch (e) {
        console.error('Failed to get Windows UUID:', e.message);
    }
    return null;
}

function getLinuxMachineId() {
    const possiblePaths = [
        '/etc/machine-id',
        '/var/lib/dbus/machine-id'
    ];
    
    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8').trim();
                if (content && content.length > 10) {
                    return content;
                }
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

function getMacAddress() {
    try {
        const output = execSync('ip link show', { encoding: 'utf8', timeout: 5000 });
        const macMatch = output.match(/([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/);
        if (macMatch) {
            return macMatch[0].replace(/[:-]/g, '').toUpperCase();
        }
    } catch (e) {
        console.error('Failed to get MAC address:', e.message);
    }
    return null;
}

function getCpuInfo() {
    try {
        if (process.platform === 'win32') {
            const output = execSync('wmic cpu get ProcessorId', { encoding: 'utf8', timeout: 5000 });
            const lines = output.trim().split('\n');
            if (lines.length >= 2) {
                return lines[1].trim();
            }
        } else {
            const output = execSync('cat /proc/cpuinfo | grep -i "serial" | head -1', { encoding: 'utf8', timeout: 5000 });
            const match = output.match(/:\s*(.+)/);
            if (match) {
                return match[1].trim();
            }
        }
    } catch (e) {
        console.error('Failed to get CPU info:', e.message);
    }
    return null;
}

function generateMachineId() {
    const dataDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    let machineId = null;

    if (process.platform === 'win32') {
        machineId = getWindowsMachineId() || getCpuInfo() || getMacAddress();
    } else {
        machineId = getLinuxMachineId() || getCpuInfo() || getMacAddress();
    }

    if (!machineId) {
        const fallback = crypto.randomBytes(16).toString('hex').toUpperCase();
        console.warn('Could not get hardware ID, using random fallback');
        machineId = fallback;
    }

    const hash = crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32).toUpperCase();

    return hash;
}

function getMachineId() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return data.machineId;
        }
    } catch (e) {
        console.error('Failed to read cached machine ID:', e.message);
    }

    const machineId = generateMachineId();

    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ machineId, generatedAt: new Date().toISOString() }));
    } catch (e) {
        console.error('Failed to cache machine ID:', e.message);
    }

    return machineId;
}

module.exports = { getMachineId };
