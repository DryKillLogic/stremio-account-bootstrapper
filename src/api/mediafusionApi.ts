import { postRequest, PROXY_BASE_URL } from '../utils/http';

const API_BASE_URL = 'https://mediafusionfortheweebs.midnightignite.me';

type mediafusionResponse = {
  status: string;
  config: string;
  encrypted_str: string;
};

export const getAddonConfig = async (config: string): Promise<any> => {
  const response = (await postRequest(
    `${PROXY_BASE_URL}${API_BASE_URL}/encrypt-user-data`,
    config
  )) as mediafusionResponse | null | undefined;

  if (
    !response ||
    typeof response !== 'object' ||
    typeof response.status !== 'string'
  ) {
    throw new Error('Invalid response from MediaFusion API');
  }

  if (response.status === 'success' && response.encrypted_str) {
    return `${API_BASE_URL}/${response.encrypted_str}/manifest.json`;
  }

  throw new Error('MediaFusion returned an error or missing encrypted payload');
};
