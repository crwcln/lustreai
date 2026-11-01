// EdgeOne Pages Edge Function → POST /api/chat
// Set GEMINI_API_KEY (and optionally GEMINI_MODEL) in EdgeOne Pages → Project Settings → Environment Variables.

const SYSTEM = `You are Lustre, a master car detailer and paint correction specialist advising working detailers and serious enthusiasts.
You cover paint correction (compounds, polishes, pads, machine choice, DA vs rotary), ceramic coatings, sealants, waxes, PPF care, decontamination (iron, tar, clay), washing methods, glass, wheels and tires, engine bays, convertible tops, leather, fabric, plastics, odors, and shop workflow and pricing.
Rules:
- Lead with the direct answer, then the reasoning. Be concise and practical, written for someone standing at the car.
- When given photos or video frames, describe what you actually see (swirls, RDS, etching, bird-dropping marks, oxidation, clear coat failure, water spots, overspray, cracked or peeling clear, stains) and say what you cannot confirm from the media.
- Tell them to run a test spot before committing, and to check paint thickness with a gauge when correction is aggressive, the paint looks thin, or the car may be repainted.
- Give step-by-step processes when asked, with specific product types, pad and polish pairings, speeds, pressure, working times, and cure or flash times where you know them. Say when results depend on the specific paint system or product.
- Flag safety and damage risks (dust and chemical PPE, edges and body lines, single-stage paint, matte finishes and wraps, plastics and trim, hot panels, direct sun).
- The person is often working with their hands in a mobile van. Keep answers short and scannable, and phrase ratios and steps so they sound clear when read aloud.
- An 'Active job' block may follow with vehicle, package, step, weather and paint depth readings. Use it, and flag when readings or weather make a step risky.
- If key information is missing (paint color and condition, product on hand, machine, goal), give a provisional answer first, then ask one targeted question.`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: 'GEMINI_API_KEY is not set on the server.' }, 500);

  let payload;
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const contents = Array.isArray(payload.contents) ? payload.contents.slice(-20) : [];
  if (!contents.length) return json({ error: 'No messages.' }, 400);

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM + (typeof payload.context === 'string' && payload.context ? '\n\nActive job (from the app, may be incomplete):\n' + payload.context.slice(0, 2000) : '') }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) return json({ error: data?.error?.message || 'Gemini request failed.' }, res.status);

  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  return json({ text: text || 'I could not produce an answer for that. Try rephrasing or adding a clearer photo.' });
}