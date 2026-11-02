// Shared helpers for the push functions. Files starting with "_" are not routed by EdgeOne.
export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// Only real browser push services are allowed, so this API can't be used to make your server call arbitrary URLs.
const PUSH_HOSTS = /(^|\.)(googleapis\.com|push\.apple\.com|mozilla\.com|windows\.com)$/;
export function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname) && s.keys?.p256dh && s.keys?.auth;
  } catch { return false; }
}