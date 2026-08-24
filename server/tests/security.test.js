const { escapeRegExp, isSafeWebhookUrl } = require('../utils/security');
const { applyTemplateVariables } = require('../utils/template');
const { createRateLimiter, getClientIp } = require('../utils/rateLimiter');

describe('escapeRegExp', () => {
    it('escapes regex metacharacters', () => {
        expect(escapeRegExp('a.b*c+d(e)[f]{g}$^|?\\')).toBe('a\\.b\\*c\\+d\\(e\\)\\[f\\]\\{g\\}\\$\\^\\|\\?\\\\');
    });

    it('leaves plain strings untouched', () => {
        expect(escapeRegExp('name')).toBe('name');
        expect(escapeRegExp('phone_number')).toBe('phone_number');
    });
});

describe('isSafeWebhookUrl', () => {
    it('accepts public http(s) URLs', () => {
        expect(isSafeWebhookUrl('https://hooks.example.com/x').ok).toBe(true);
        expect(isSafeWebhookUrl('http://hooks.example.com:8080/x').ok).toBe(true);
    });

    it('rejects invalid URLs', () => {
        expect(isSafeWebhookUrl('not-a-url').ok).toBe(false);
        expect(isSafeWebhookUrl('').ok).toBe(false);
    });

    it('rejects non-http protocols', () => {
        expect(isSafeWebhookUrl('ftp://example.com').ok).toBe(false);
        expect(isSafeWebhookUrl('file:///etc/passwd').ok).toBe(false);
    });

    it('rejects localhost and local hostnames', () => {
        expect(isSafeWebhookUrl('http://localhost:3000/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://sub.localhost/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://printer.local/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('https://svc.internal/hook').ok).toBe(false);
    });

    it('rejects private/reserved IPv4 targets', () => {
        expect(isSafeWebhookUrl('http://127.0.0.1/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://10.1.2.3/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://192.168.1.10/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://172.16.0.5/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
        expect(isSafeWebhookUrl('http://0.0.0.0/hook').ok).toBe(false);
    });

    it('accepts public IPv4 targets', () => {
        expect(isSafeWebhookUrl('http://8.8.8.8/hook').ok).toBe(true);
        expect(isSafeWebhookUrl('http://172.32.0.1/hook').ok).toBe(true);
    });

    it('rejects private/reserved IPv6 targets', () => {
        expect(isSafeWebhookUrl('http://[::1]/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://[fc00::1]/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://[fe80::1]/hook').ok).toBe(false);
        expect(isSafeWebhookUrl('http://[::ffff:127.0.0.1]/hook').ok).toBe(false);
    });

    it('rejects embedded credentials', () => {
        expect(isSafeWebhookUrl('https://user:pass@example.com/hook').ok).toBe(false);
    });
});

describe('applyTemplateVariables', () => {
    it('substitutes variables including whitespace variants', () => {
        expect(applyTemplateVariables('Hello {{name}}, bye {{ name }}!', { name: 'Sam' })).toBe('Hello Sam, bye Sam!');
    });

    it('strips unknown variables', () => {
        expect(applyTemplateVariables('Hi {{unknown}}', { name: 'Sam' })).toBe('Hi ');
    });

    it('handles null/empty input', () => {
        expect(applyTemplateVariables(null, {})).toBe('');
        expect(applyTemplateVariables('', { a: 1 })).toBe('');
    });

    it('does not throw on regex-hostile variable keys (ReDoS/injection guard)', () => {
        const hostile = {
            '(a+)+$': 'x',
            '.*': 'y',
            '[a-z': 'z',
            '{{name}}': 'w'
        };
        const msg = 'Dear {{(a+)+$}} {{.*}} {{[a-z}} {{name}}';
        expect(() => applyTemplateVariables(msg, hostile)).not.toThrow();
        // Keys are treated as literals, not patterns; '{{name}}' as a key
        // would need literal '{{{{name}}}}' in the text, so plain {{name}}
        // has no matching key and is stripped by the cleanup pass.
        expect(applyTemplateVariables(msg, hostile)).toBe('Dear x y z ');
    });

    it('ignores oversized keys safely', () => {
        const bigKey = 'k'.repeat(500);
        expect(() => applyTemplateVariables(`Hi {{${bigKey}}}`, { [bigKey]: 'v' })).not.toThrow();
    });
});

function mockReq(headers = {}, socket = {}) {
    return { headers, socket: { remoteAddress: socket.remoteAddress || '10.0.0.9' } };
}

function mockRes() {
    const res = {
        statusCode: null,
        headers: {},
        body: null,
        setHeader(k, v) { res.headers[k] = v; },
        status(code) { res.statusCode = code; return res; },
        json(payload) { res.body = payload; return res; }
    };
    return res;
}

describe('createRateLimiter', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('allows requests under the limit and returns next()', () => {
        jest.useFakeTimers();
        const limiter = createRateLimiter({ windowMs: 1000, max: 3, keyFn: getClientIp, name: 'test' });
        const next = jest.fn();
        for (let i = 0; i < 3; i++) {
            limiter(mockReq(), mockRes(), next);
        }
        expect(next).toHaveBeenCalledTimes(3);
    });

    it('blocks with 429 once limit exceeded', () => {
        jest.useFakeTimers({ now: 1_000_000 });
        const limiter = createRateLimiter({ windowMs: 1000, max: 3, keyFn: getClientIp, name: 'test' });
        const next = jest.fn();
        let blockedRes;
        for (let i = 0; i < 4; i++) {
            blockedRes = mockRes();
            limiter(mockReq(), blockedRes, next);
        }
        expect(next).toHaveBeenCalledTimes(3);
        expect(blockedRes.statusCode).toBe(429);
        expect(blockedRes.body.success).toBe(false);
        expect(blockedRes.headers['Retry-After']).toBeDefined();
    });

    it('resets after the window elapses', () => {
        jest.useFakeTimers({ now: 1_000_000 });
        const limiter = createRateLimiter({ windowMs: 1000, max: 1, keyFn: getClientIp, name: 'test' });
        const next = jest.fn();

        let res1 = mockRes(); limiter(mockReq(), res1, next);
        let res2 = mockRes(); limiter(mockReq(), res2, next);

        expect(res1.statusCode).toBeNull();
        expect(res2.statusCode).toBe(429);

        jest.setSystemTime(1_000_000 + 1500);

        let res3 = mockRes();
        limiter(mockReq(), res3, next);
        expect(res3.statusCode).toBeNull();
        expect(next).toHaveBeenCalledTimes(2);
    });

    it('tracks keys independently', () => {
        jest.useFakeTimers({ now: 2_000_000 });
        const limiter = createRateLimiter({
            windowMs: 10000, max: 1,
            keyFn: (req) => req.headers['x-key'],
            name: 'test'
        });
        const next = jest.fn();

        const r1 = mockReq({ 'x-key': 'a' }); limiter(r1, mockRes(), next);
        const r2 = mockReq({ 'x-key': 'b' }); limiter(r2, mockRes(), next);
        const r3 = mockReq({ 'x-key': 'a' }); const blocked = mockRes(); limiter(r3, blocked, next);

        expect(next).toHaveBeenCalledTimes(2);
        expect(blocked.statusCode).toBe(429);
    });
});
