const OPUS_BASE = 'https://api.opus.pro';
const API_KEY = process.env.OPUS_API_KEY || '';
const ORG_ID = process.env.OPUS_ORG_ID || '';

export interface OpusResponse {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

export async function opusFetch(
  path: string,
  options: { method?: string; body?: any; query?: Record<string, string> } = {}
): Promise<OpusResponse> {
  const { method = 'GET', body, query } = options;

  let url = `${OPUS_BASE}${path}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (ORG_ID) headers['x-opus-org-id'] = ORG_ID;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }

    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

export function ok(data: any): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}

export function err(msg: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: `❌ Error: ${msg}` }] };
}

export function fmtDuration(ms: number): string {
  const secs = Math.round(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
