export const getRequest = async <T>(
  url: string,
  opts: RequestInit = {}
): Promise<T> => {
  const res = await fetch(url, opts);
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
  opts: RequestInit = {}
): Promise<U> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: JSON.stringify(body),
    ...opts
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  const data: U = await res.json();
  return data;
};
