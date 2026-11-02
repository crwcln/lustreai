// GET /api/push/key → { key } so the VAPID public key lives in env vars, not in index.html
import { json } from './_lib.js';
export default function onRequest() {
  return json({ key: process.env.VAPID_PUBLIC_KEY || '' });
}