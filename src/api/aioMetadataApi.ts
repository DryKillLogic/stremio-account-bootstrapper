import { getRequest, postRequest } from '../utils/http';

const API_BASE_URL = 'https://aiometadata.elfhosted.com';

type AIOMetadataResponse = {
  success: boolean;
  installUrl?: string;
};

export const getAddonConfig = async (config: object): Promise<any> => {
  try {
    const response = (await postRequest(
      `${API_BASE_URL}/api/config/save`,
      config
    )) as AIOMetadataResponse | null | undefined;

    if (
      !response ||
      typeof response !== 'object' ||
      typeof response.success !== 'boolean'
    ) {
      console.error('Invalid response from AIOMetadata API', response);
      return null;
    }

    if (!response.success || !response.installUrl) {
      console.error(
        'AIOMetadata returned error or missing install URL',
        response
      );
      return null;
    }

    const responseManifest = await getRequest(response.installUrl);

    if (!responseManifest) {
      console.error('Error fetching AIOMetadata manifest');
      return null;
    }

    return {
      transportUrl: response.installUrl,
      manifest: responseManifest
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch AIOMetadata transport URL:', message);
    return null;
  }
};
