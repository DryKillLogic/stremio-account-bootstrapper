import { getRequest, postRequest } from '../utils/http';

const API_BASE_URL = 'https://aiometadata.elfhosted.com';

type AIOMetadataResponse = {
  success: boolean;
  installUrl?: string;
};

export const getAddonConfig = async (config: object): Promise<any> => {
  const response = (await postRequest(
    `${API_BASE_URL}/api/config/save`,
    config
  )) as AIOMetadataResponse | null | undefined;

  if (
    !response ||
    typeof response !== 'object' ||
    typeof response.success !== 'boolean'
  ) {
    throw new Error('Invalid response from AIOMetadata API');
  }

  if (!response.success || !response.installUrl) {
    throw new Error('AIOMetadata returned an error or missing install URL');
  }

  const responseManifest = await getRequest(response.installUrl);

  if (!responseManifest) {
    throw new Error('AIOMetadata manifest request returned no data');
  }

  return {
    transportUrl: response.installUrl,
    manifest: responseManifest
  };
};
