import { getRequest } from '../utils/http';

const PROXY_URL = 'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?';

export const getAddonConfig = async (transportUrl: string): Promise<any> => {
  try {
    const response = await getRequest(`${PROXY_URL}${transportUrl}`);

    if (!response) {
      console.error('Error fetching StremThru Store manifest', transportUrl);
      return null;
    }

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch StremThru Store manifest:', message);
    return null;
  }
};
