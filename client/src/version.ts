let version = '1.0.0';

export const getVersion = () => version;

export const setVersion = (v: string) => {
  version = v;
};

export const APP_VERSION = version;
