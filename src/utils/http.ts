const DEFAULT_TIMEOUT = 15000;

const extractErrorMessage = (
  rawText: string,
  status: number,
  statusText: string
): string => {
  if (!rawText) {
    return `HTTP ${status} ${statusText}`;
  }

  try {
    const parsed = JSON.parse(rawText) as {
      message?: string;
      msg?: string;
      detail?: string | null;
      error?: { message?: string } | null;
    };

    const baseMessage =
      parsed.error?.message || parsed.detail || parsed.message || parsed.msg;
    if (baseMessage) {
      return baseMessage;
    }

    return `HTTP ${status} ${statusText}`;
  } catch {
    return rawText;
  }
};

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
  const res = await fetchWithTimeout(
    url,
    {
      ...opts,
      headers: { ...(opts.headers || {}) }
    },
    timeout
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(extractErrorMessage(txt, res.status, res.statusText));
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
      body: JSON.stringify(body),
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    },
    timeout
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(extractErrorMessage(txt, res.status, res.statusText));
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as U;
};

export const PROXY_BASE_URL =
  'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?';
