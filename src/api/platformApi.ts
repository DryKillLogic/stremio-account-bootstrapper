import * as stremioApi from './stremioApi';
import * as nuvioApi from './nuvioApi';

export type Platform = 'stremio' | 'nuvio';

const apiByPlatform = {
  stremio: stremioApi,
  nuvio: nuvioApi
};

const getApi = (platform: Platform) => apiByPlatform[platform] || stremioApi;

const normalizePlatformResponse = (payload: any): any => {
  if (payload === null || payload === undefined) {
    return { result: { success: true } };
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  if (payload?.result?.authKey || payload?.error?.message) {
    return payload;
  }

  if (payload?.access_token) {
    return {
      result: {
        authKey: payload.access_token
      }
    };
  }

  if (Array.isArray(payload)) {
    return { result: { addons: payload } };
  }

  if (Array.isArray(payload?.addons)) {
    return {
      result: {
        addons: payload.addons
      }
    };
  }

  if (typeof payload?.success === 'boolean') {
    return {
      result: {
        success: payload.success,
        error: payload.error || payload.msg
      }
    };
  }

  if (payload?.msg) {
    return {
      error: {
        message: payload.msg,
        code: payload.error_code || payload.code
      }
    };
  }

  return payload;
};

export const getAddonCollection = async (
  platform: Platform,
  authKey: string
): Promise<any> =>
  normalizePlatformResponse(await getApi(platform).getAddonCollection(authKey));

export const setAddonCollection = async (
  platform: Platform,
  addons: any[],
  authKey: string
): Promise<any> =>
  normalizePlatformResponse(
    await getApi(platform).setAddonCollection(addons, authKey)
  );

export const loginUser = async (
  platform: Platform,
  email: string,
  password: string
): Promise<any> =>
  normalizePlatformResponse(await getApi(platform).loginUser(email, password));

export const createUser = async (
  platform: Platform,
  email: string,
  password: string
): Promise<any> =>
  normalizePlatformResponse(await getApi(platform).createUser(email, password));
