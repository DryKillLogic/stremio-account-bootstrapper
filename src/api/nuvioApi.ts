import { postRequest, getRequest } from '../utils/http';
import { NUVIO_BASE_URL, NUVIO_PROXY_PREFIX } from '../config/nuvio';

const nuvioDevApiKey = import.meta.env.VITE_NUVIO_API_KEY;
const useDirectNuvio = import.meta.env.DEV;
const nuvioApiBase = useDirectNuvio ? NUVIO_BASE_URL : NUVIO_PROXY_PREFIX;

const withNuvioHeaders = (opts: RequestInit = {}): RequestInit => ({
  ...opts,
  headers: {
    ...(useDirectNuvio && nuvioDevApiKey ? { apikey: nuvioDevApiKey } : {}),
    ...(opts.headers || {})
  }
});

const nuvioPostRequest = <T, U>(
  url: string,
  body: T,
  opts: RequestInit = {}
): Promise<U> => postRequest<T, U>(url, body, withNuvioHeaders(opts));

const nuvioGetRequest = <U>(url: string, opts: RequestInit = {}): Promise<U> =>
  getRequest<U>(url, withNuvioHeaders(opts));

const mapAddons = (addons: any[] = []) =>
  addons
    .map((addon, index) => ({
      url: addon?.transportUrl || addon?.url || '',
      name: addon?.manifest?.name || addon?.name || 'Addon',
      enabled: addon?.enabled ?? true,
      sort_order: addon?.sort_order ?? index
    }))
    .filter((addon) => Boolean(addon.url));

export const getAddonCollection = async (authKey: string): Promise<any> =>
  nuvioGetRequest(
    `${nuvioApiBase}/rest/v1/addons?select=*&profile_id=eq.1&order=sort_order`,
    {
      headers: {
        Authorization: `Bearer ${authKey}`
      }
    }
  );

export const setAddonCollection = async (
  addons: any[],
  authKey: string
): Promise<any> =>
  nuvioPostRequest(
    `${nuvioApiBase}/rest/v1/rpc/sync_push_addons`,
    {
      p_profile_id: 1,
      p_addons: mapAddons(addons)
    },
    {
      headers: {
        Authorization: `Bearer ${authKey}`
      }
    }
  );

export const loginUser = async (
  email: string,
  password: string
): Promise<any> =>
  nuvioPostRequest(`${nuvioApiBase}/auth/v1/token?grant_type=password`, {
    authKey: null,
    email,
    password
  });

export const createUser = async (
  email: string,
  password: string
): Promise<any> => {
  return nuvioPostRequest(`${nuvioApiBase}/auth/v1/signup`, {
    email,
    password
  });
};
