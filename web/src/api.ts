export type ApiResult = {
  status: number;
  body: unknown;
};

export async function callApi(baseUrl: string, path: string, body?: unknown): Promise<ApiResult> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  } else {
    parsed = null;
  }
  return { status: response.status, body: parsed };
}

export function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : null;
}
