// POST /api/push/schedule { subscription, title, body, tag, seconds } → { id }
// Hands the notification to Upstash QStash, which calls /api/push/send after the delay.
import { json, validSubscription } from './_lib.js';

export default async function onRequest({ request }) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const { QSTASH_TOKEN, PUSH_SECRET } = process.env;
  if (!QSTASH_TOKEN || !PUSH_SECRET) return json({ error: 'Push is not configured on the server.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!validSubscription(p.subscription || {})) return json({ error: 'Invalid subscription.' }, 400);
  const seconds = Math.min(14400, Math.max(1, Math.round(+p.seconds || 0)));   // 1 second to 4 hours
  const payload = {
    subscription: p.subscription,
    title: String(p.title || 'Lustre').slice(0, 80),
    body: String(p.body || '').slice(0, 160),
    tag: String(p.tag || 'lustre-alert').slice(0, 40),
  };
  const dest = `${new URL(request.url).origin}/api/push/send`;
  const r = await fetch(`https://qstash.upstash.io/v2/publish/${dest}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Delay': `${seconds}s`,
      'Upstash-Retries': '2',
      'Upstash-Forward-X-Push-Secret': PUSH_SECRET,
    },
    body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: d.error || 'Scheduler rejected the request.' }, 502);
  return json({ id: d.messageId });
}