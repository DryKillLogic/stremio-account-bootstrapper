import { getRequest, postRequest, PROXY_BASE_URL } from '../utils/http';

const API_BASE_URL = 'https://aiostreamsfortheweebs.midnightignite.me';
const TEMPLATE_URL =
  'https://raw.githubusercontent.com/Tam-Taro/SEL-Filtering-and-Sorting/f8f60711549de651221493abcc72b22dc4e36309/AIOStreams%20Templates/Tamtaro-complete-setup-template.json'; // v2.6.1

type AIOStreamsResponse = {
  success: boolean;
  data?: {
    encryptedPassword: string;
    uuid: string;
  };
};

export const getAddonConfig = async (config: object): Promise<any> => {
  const response = (await postRequest(
    `${PROXY_BASE_URL}${API_BASE_URL}/api/v1/user`,
    config
  )) as AIOStreamsResponse | null | undefined;

  if (
    !response ||
    typeof response !== 'object' ||
    typeof response.success !== 'boolean'
  ) {
    throw new Error('Invalid response from AIOStreams API');
  }

  if (!response.success || !response.data) {
    throw new Error(
      'AIOStreams returned an error or missing credentials payload'
    );
  }

  const manifestUrl = `${API_BASE_URL}/stremio/${response.data.uuid}/${response.data.encryptedPassword}/manifest.json`;

  const responseManifest = await getRequest(manifestUrl);

  if (!responseManifest) {
    throw new Error('AIOStreams manifest request returned no data');
  }

  return {
    transportUrl: manifestUrl,
    manifest: responseManifest
  };
};

export const getTemplate = async (): Promise<any> => {
  const template = await getRequest(TEMPLATE_URL);

  if (!template) {
    throw new Error('Error fetching AIOStreams template');
  }

  return template;
};
