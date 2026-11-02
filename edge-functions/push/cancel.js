// POST /api/push/cancel { id } → cancels a scheduled notification
import { json } from './_lib.js';

export default async function onRequest({ request }) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const { QSTASH_TOKEN } = process.env;
  if (!QSTASH_TOKEN) return json({ error: 'Push is not configured on the server.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const id = String(p.id || '');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return json({ error: 'Invalid id.' }, 400);
  const r = await fetch(`https://qstash.upstash.io/v2/messages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${QSTASH_TOKEN}` } });
  return json({ ok: r.ok || r.status === 404 });   // 404 = already sent or gone
}