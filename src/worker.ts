import { NUVIO_BASE_URL, NUVIO_PROXY_PREFIX } from './config/nuvio';

type AssetFetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

interface Env {
  NUVIO_API_KEY?: string;
  ASSETS: AssetFetcher;
}

const proxyNuvioRequest = async (
  request: Request,
  env: Env,
  url: URL
): Promise<Response> => {
  if (!env.NUVIO_API_KEY) {
    return new Response(
      JSON.stringify({ error: { message: 'Missing NUVIO_API_KEY' } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const upstreamPath = url.pathname.slice(NUVIO_PROXY_PREFIX.length) || '/';
  const upstreamUrl = `${NUVIO_BASE_URL}${upstreamPath}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set('apikey', env.NUVIO_API_KEY);

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith(`${NUVIO_PROXY_PREFIX}/`)) {
      return proxyNuvioRequest(request, env, url);
    }

    const response = await env.ASSETS.fetch(request);

    // SPA fallback: if an asset route is missing, serve index.html.
    if (response.status === 404 && request.method === 'GET') {
      const url = new URL(request.url);
      const acceptsHtml = request.headers.get('accept')?.includes('text/html');
      const isFilePath = /\.[a-zA-Z0-9]+$/.test(url.pathname);

      if (acceptsHtml && !isFilePath) {
        const indexRequest = new Request(new URL('/index.html', url), request);
        return env.ASSETS.fetch(indexRequest);
      }
    }

    return response;
  }
};
