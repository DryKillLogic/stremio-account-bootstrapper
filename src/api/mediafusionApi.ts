import { postRequest, PROXY_BASE_URL } from '../utils/http';

const API_BASE_URL = 'https://mediafusionfortheweebs.midnightignite.me';

type mediafusionResponse = {
  status: string;
  config: string;
  encrypted_str: string;
};

export const getAddonConfig = async (config: string): Promise<any> => {
  try {
    const response = (await postRequest(
      `${PROXY_BASE_URL}${API_BASE_URL}/encrypt-user-data`,
      config
    )) as mediafusionResponse | null | undefined;

    if (
      !response ||
      typeof response !== 'object' ||
      typeof response.status !== 'string'
    ) {
      console.error('Invalid response from MediaFusion API', response);
      return null;
    }

    if (response.status === 'success' && response.encrypted_str) {
      return `${API_BASE_URL}/${response.encrypted_str}/manifest.json`;
    } else {
      console.error(
        'MediaFusion returned error status or missing encrypted_str',
        response
      );
      return null;
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch MediaFusion transport URL:', message);
    return null;
  }
};
