import { getRequest, postRequest } from '../utils/http';

const API_BASE_URL = 'https://aiolists.elfhosted.com';

type aiolistsResponse = {
  success: boolean;
  configHash: string;
};

export const getAddonConfig = async (config: string): Promise<any> => {
  const response = (await postRequest(
    `${API_BASE_URL}/api/config/create`,
    config
  )) as aiolistsResponse;

  if (response.success) {
    const responseManifest = await getRequest(
      `${API_BASE_URL}/${response.configHash}/manifest.json`
    );
    if (responseManifest) {
      return {
        transportUrl: `${API_BASE_URL}/${response.configHash}/manifest.json`,
        manifest: responseManifest
      };
    } else {
      throw new Error('Error fetching AIOLists manifest');
    }
  } else {
    throw new Error('Error fetching AIOLists transport URL');
  }
};
