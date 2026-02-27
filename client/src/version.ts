import packageJson from '../package.json';

const version = packageJson.version || '1.0.6';

export const getVersion = () => version;

export const APP_VERSION = version;
