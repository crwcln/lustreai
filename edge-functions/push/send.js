// POST /api/push/send — called by QStash when the delay is up. Sends the Web Push to the phone.
import webpush from 'web-push';
import { json, validSubscription } from './_lib.js';

export default async function onRequest({ request }) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SECRET } = process.env;
  if (!PUSH_SECRET || request.headers.get('x-push-secret') !== PUSH_SECRET) return json({ error: 'Unauthorized' }, 401);
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return json({ error: 'VAPID keys are not set.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!validSubscription(p.subscription || {})) return json({ error: 'Invalid subscription.' }, 400);
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(p.subscription, JSON.stringify({ title: p.title, body: p.body, tag: p.tag, url: '/' }), { TTL: 600, urgency: 'high' });
    return json({ sent: true });
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) return json({ sent: false, expired: true });  // 200 so QStash doesn't retry
    return json({ error: 'Push failed', status: e.statusCode || 0 }, 500);
  }
}