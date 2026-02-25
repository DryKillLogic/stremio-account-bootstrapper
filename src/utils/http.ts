const DEFAULT_TIMEOUT = 15000;

const fetchWithTimeout = async (
  url: string,
  opts: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...opts,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
};

export const getRequest = async <T>(
  url: string,
  opts: RequestInit = {},
  timeout?: number
): Promise<T> => {
  const res = await fetchWithTimeout(url, opts, timeout);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  const data: T = await res.json();
  return data;
};

export const postRequest = async <T, U>(
  url: string,
  body: T,
  opts: RequestInit = {},
  timeout?: number
): Promise<U> => {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify(body),
      ...opts
    },
    timeout
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  const data: U = await res.json();
  return data;
};

export const PROXY_BASE_URL =
  'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?';
