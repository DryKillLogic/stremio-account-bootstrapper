import { postRequest } from '../utils/http';

const stremioAPIBase = 'https://api.strem.io/api';

export const getAddonCollection = async (authKey: string): Promise<any> =>
  postRequest(`${stremioAPIBase}/addonCollectionGet`, {
    type: 'AddonCollectionGet',
    authKey,
    update: true
  });

export const setAddonCollection = async (
  addons: any[],
  authKey: string
): Promise<any> =>
  postRequest(`${stremioAPIBase}/addonCollectionSet`, {
    type: 'AddonCollectionSet',
    authKey,
    addons
  });

export const loginUser = async (
  email: string,
  password: string
): Promise<any> =>
  postRequest(`${stremioAPIBase}/login`, {
    authKey: null,
    email,
    password
  });

export const createUser = async (
  email: string,
  password: string
): Promise<any> => {
  const gdpr_consent = {
    from: 'browser',
    time: new Date().toISOString(),
    tos: true,
    privacy: true,
    marketing: true
  };
  return postRequest(`${stremioAPIBase}/register`, {
    authKey: null,
    email,
    password,
    gdpr_consent
  });
};
