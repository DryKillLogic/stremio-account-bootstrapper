import { postRequest } from '../utils/http';

const API_BASE_URL = 'https://mediafusionfortheweebs.midnightignite.me';
const PROXY_BASE_URL =
  'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?';

type mediafusionResponse = {
  status: string;
  config: string;
  encrypted_str: string;
};

export const getAddonConfig = async (config: string): Promise<any> => {
  const response = (await postRequest(
    `${PROXY_BASE_URL}${API_BASE_URL}/encrypt-user-data`,
    config
  )) as mediafusionResponse;

  if (response.status === 'success') {
    return `${API_BASE_URL}/${response.encrypted_str}/manifest.json`;
  } else {
    throw new Error('Error fetching MediaFusion transport URL');
  }
};
