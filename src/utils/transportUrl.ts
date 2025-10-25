import { Buffer } from 'buffer';

interface TransportUrl {
  domain: string;
  data: object;
  manifest: string;
}

export const decodeDataFromTransportUrl = (data: string): unknown =>
  JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));

export const encodeDataFromTransportUrl = (data: unknown): string =>
  Buffer.from(JSON.stringify(data)).toString('base64');

export const getDataTransportUrl = (
  url: string,
  base64: boolean = true
): TransportUrl => {
  const parsedUrl = url.match(
    /(https?:\/\/[^\/]+(?:\/[^\/]+)*\/)([^\/=]+={0,2})(\/manifest\.json)$/
  );
  if (!parsedUrl) throw new Error('Invalid transport URL');
  return {
    domain: parsedUrl[1]!,
    data: base64
      ? decodeDataFromTransportUrl(parsedUrl[2]!)
      : JSON.parse(decodeURIComponent(parsedUrl[2]!)),
    manifest: parsedUrl[3]!
  };
};

export const getUrlTransportUrl = (
  url: TransportUrl,
  data: unknown,
  base64: boolean = true
): string =>
  url.domain +
  (base64
    ? encodeDataFromTransportUrl(data)
    : encodeURIComponent(JSON.stringify(data))) +
  url.manifest;

interface UpdateTransportUrlParams {
  presetConfig: any;
  serviceKey: string;
  manifestNameSuffix?: string;
  updateData: (data: any) => any;
  base64?: boolean;
}

export const updateTransportUrl = ({
  presetConfig,
  serviceKey,
  manifestNameSuffix,
  updateData,
  base64 = true
}: UpdateTransportUrlParams) => {
  const service = presetConfig[serviceKey];
  if (service && service.transportUrl) {
    const transportUrl = getDataTransportUrl(service.transportUrl, base64);
    if (manifestNameSuffix && service.manifest && service.manifest.name) {
      service.manifest.name += ` | ${manifestNameSuffix}`;
    }
    service.transportUrl = getUrlTransportUrl(
      transportUrl,
      updateData(transportUrl.data),
      base64
    );
  }
};
