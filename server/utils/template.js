const { escapeRegExp } = require('./security');

const MAX_VARIABLE_KEY_LENGTH = 64;

function applyTemplateVariables(message, contact) {
    if (!message) return '';

    const keys = Object.keys(contact || {});
    for (const key of keys) {
        // Guard against pathological keys coming from external input
        // (API `variables` objects): bound the generated regex size and
        // escape regex metacharacters so keys can never alter the pattern.
        if (typeof key !== 'string' || key.length === 0 || key.length > MAX_VARIABLE_KEY_LENGTH) {
            continue;
        }
        const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'gi');
        message = message.replace(regex, contact[key] ?? '');
    }

    message = message.replace(/{{.*?}}/g, '');
    return message;
}

module.exports = { applyTemplateVariables, MAX_VARIABLE_KEY_LENGTH };
