import { getRequest } from '../utils/http';

const PROXY_URL = 'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?';

export const getAddonConfig = async (transportUrl: string): Promise<any> => {
  const response = await getRequest(`${PROXY_URL}${transportUrl}`);

  if (response) {
    return response;
  } else {
    throw new Error('Error fetching StremThru Store manifest');
  }
};
