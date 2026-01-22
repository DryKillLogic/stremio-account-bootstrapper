import { getRequest, postRequest } from '../utils/http';

const API_BASE_URL = 'https://aiolistsfortheweebs.midnightignite.me';

type aiolistsResponse = {
  success: boolean;
  configHash: string;
};

export const getAddonConfig = async (config: string): Promise<any> => {
  try {
    const response = (await postRequest(
      `${API_BASE_URL}/api/config/create`,
      config
    )) as aiolistsResponse | null | undefined;

    if (
      !response ||
      typeof response !== 'object' ||
      typeof response.success !== 'boolean'
    ) {
      console.error('Invalid response from AIOLists API', response);
      return null;
    }

    if (!response.success || !response.configHash) {
      console.error('AIOLists returned error or missing configHash', response);
      return null;
    }

    const responseManifest = await getRequest(
      `${API_BASE_URL}/${response.configHash}/manifest.json`
    );

    if (!responseManifest) {
      console.error('Error fetching AIOLists manifest', response.configHash);
      return null;
    }

    return {
      transportUrl: `${API_BASE_URL}/${response.configHash}/manifest.json`,
      manifest: responseManifest
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    console.error('Failed to fetch AIOLists transport URL:', message);
    return null;
  }
};
