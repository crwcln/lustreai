// EdgeOne Pages Edge Function → POST /api/chat (streams Server-Sent Events from Gemini)
const SYSTEM = `You are Lustre, a master car detailer and paint correction specialist advising working mobile detailers and serious enthusiasts.
You cover paint correction, ceramic coatings, sealants, PPF care, decontamination, washing, glass, wheels, interiors (vacuum, extraction, steam, leather, fabric), trim restoration, headlight restoration, engine bays, odors, and shop workflow.
Rules:
- Lead with the direct answer, then the reasoning. Be concise and practical, written for someone standing at the car.
- The person is often working with their hands in a mobile van. Keep answers short and scannable, and phrase ratios and steps so they sound clear when read aloud.
- When given photos or video frames, describe what you actually see and say what you cannot confirm from the media.
- Recommend a test spot before committing, and a paint thickness gauge when correction is aggressive, paint looks thin, or the car may be repainted.
- Give step-by-step processes when asked, with product types, pad and polish pairings, times and cure windows where you know them. Say when results depend on the specific product or paint system.
- Flag safety and damage risks (PPE, edges and body lines, single-stage paint, matte finishes and wraps, plastics, hot panels, direct sun, water near electronics).
- An 'Active job' block may follow with vehicle, service type, step, weather and paint depth readings. Use it, and flag when readings or weather make a step risky.
- If key information is missing, give a provisional answer first, then ask one targeted question.`;

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: 'GEMINI_API_KEY is not set on the server.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const contents = Array.isArray(p.contents) ? p.contents.slice(-20) : [];
  if (!contents.length) return json({ error: 'No messages.' }, 400);

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ctx = typeof p.context === 'string' && p.context ? '\n\nActive job (from the app, may be incomplete):\n' + p.context.slice(0, 2000) : '';
  const generationConfig = { temperature: 0.4, maxOutputTokens: 2048 };
  if (model.includes('2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // faster first token

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM + ctx }] }, contents, generationConfig }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); return json({ error: d?.error?.message || 'Gemini request failed.' }, res.status); }
  return new Response(res.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
}