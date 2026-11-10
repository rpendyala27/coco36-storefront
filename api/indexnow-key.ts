import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleKeyRequest } from '../server/indexnow.js';

/**
 * `/{INDEXNOW_KEY}.txt` via the vercel.json rewrite (above the HTML catch-all).
 * The body is the key when the filename matches INDEXNOW_KEY exactly.
 * Unset, preview, local, and CI always 404. robots.txt is not served here.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const out = handleKeyRequest(req.url, req.method, process.env);
  res.statusCode = out.status;
  for (const [key, value] of Object.entries(out.headers)) res.setHeader(key, value);
  res.end(req.method === 'HEAD' ? undefined : out.body);
}
