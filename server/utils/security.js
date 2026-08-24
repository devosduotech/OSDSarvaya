const { isIP } = require('net');

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPrivateIPv4(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
}

function isPrivateIPv6(ip) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1' || lower === '::ffff:127.0.0.1') return true;
    // IPv4-mapped IPv6 (::ffff:0:0/96)
    if (lower.startsWith('::ffff:')) {
        const mapped = lower.slice(7);
        if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
        return true;
    }
    // Unique local addresses fc00::/7 and link-local fe80::/10
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
    return false;
}

// Validates a webhook destination URL to block SSRF against the host network.
// Note: this validates the URL string (protocol, host, IP literals). DNS names
// that resolve to private addresses are re-checked by the dispatcher at
// delivery time where feasible; full DNS-rebinding protection requires an
// egress proxy.
function isSafeWebhookUrl(rawUrl) {
    let url;
    try {
        url = new URL(String(rawUrl));
    } catch (e) {
        return { ok: false, reason: 'URL is not valid' };
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { ok: false, reason: 'Only http:// and https:// URLs are allowed' };
    }

    if (url.username || url.password) {
        return { ok: false, reason: 'Credentials in URL are not allowed' };
    }

    // Node's URL.hostname keeps square brackets around IPv6 literals
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');

    if (!hostname) {
        return { ok: false, reason: 'URL has no host' };
    }

    // Block obvious local/host-internal names
    if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname === 'metadata.google.internal'
    ) {
        return { ok: false, reason: 'Local/internal hostnames are not allowed' };
    }

    const ipVersion = isIP(hostname);
    if (ipVersion === 4 && isPrivateIPv4(hostname)) {
        return { ok: false, reason: 'Private/reserved IP addresses are not allowed' };
    }
    if (ipVersion === 6 && isPrivateIPv6(hostname)) {
        return { ok: false, reason: 'Private/reserved IP addresses are not allowed' };
    }

    if (url.port) {
        const port = Number(url.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return { ok: false, reason: 'Invalid port' };
        }
    }

    return { ok: true, url };
}

module.exports = { escapeRegExp, isSafeWebhookUrl };
