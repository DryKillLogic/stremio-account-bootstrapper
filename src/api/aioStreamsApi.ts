import { getRequest, postRequest, PROXY_BASE_URL } from '../utils/http';

const API_BASE_URL = 'https://aiostreamsfortheweebs.midnightignite.me';
const P2P_TEMPLATE_URL =
  'https://raw.githubusercontent.com/Tam-Taro/SEL-Filtering-and-Sorting/refs/heads/main/AIOStreams%20Templates/Tamtaro-complete-setup-P2P-template.json';
const DEBRID_TEMPLATE_URL =
  'https://raw.githubusercontent.com/Tam-Taro/SEL-Filtering-and-Sorting/refs/heads/main/AIOStreams%20Templates/Tamtaro-complete-setup-template.json';

type AIOStreamsResponse = {
  success: boolean;
  data?: {
    encryptedPassword: string;
    uuid: string;
  };
};

export const getAddonConfig = async (config: object): Promise<any> => {
  try {
    const response = (await postRequest(
      `${PROXY_BASE_URL}${API_BASE_URL}/api/v1/user`,
      config
    )) as AIOStreamsResponse | null | undefined;

    if (
      !response ||
      typeof response !== 'object' ||
      typeof response.success !== 'boolean'
    ) {
      console.error('Invalid response from AIOStreams API', response);
      return null;
    }

    if (!response.success || !response.data) {
      console.error('AIOStreams returned error or missing data', response);
      return null;
    }

    const manifestUrl = `${API_BASE_URL}/stremio/${response.data.uuid}/${response.data.encryptedPassword}/manifest.json`;

    const responseManifest = await getRequest(manifestUrl);

    if (!responseManifest) {
      console.error('Error fetching AIOStreams manifest');
      return null;
    }

    return {
      transportUrl: manifestUrl,
      manifest: responseManifest
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch AIOStreams transport URL:', message);
    return null;
  }
};

export const getTemplate = async (type: 'p2p' | 'debrid'): Promise<any> => {
  const url = type === 'p2p' ? P2P_TEMPLATE_URL : DEBRID_TEMPLATE_URL;
  try {
    const template = await getRequest(url);
    if (!template) {
      console.error('Error fetching AIOStreams template');
      return null;
    }
    return template;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch AIOStreams template:', message);
    return null;
  }
};
