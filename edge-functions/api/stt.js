// EdgeOne Pages Edge Function → POST /api/stt  { audio (base64 wav), mime } → { text }
// Used by the "Cloud" Hey Lustre listening engine (iPhone Home Screen apps have no browser speech recognition).
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: 'GEMINI_API_KEY is not set.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!p.audio || p.audio.length > 700000) return json({ error: 'Audio missing or too long.' }, 413);
  const model = env.GEMINI_STT_MODEL || env.GEMINI_MODEL || 'gemini-2.5-flash';
  const generationConfig = { temperature: 0, maxOutputTokens: 120 };
  if (model.includes('2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [
        { inlineData: { mimeType: p.mime || 'audio/wav', data: p.audio } },
        { text: 'Transcribe this short audio verbatim in English. Output only the spoken words, nothing else. If there is no clear speech, output nothing. The product name "Lustre" may appear.' },
      ] }],
      generationConfig,
    }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: d?.error?.message || 'Transcription failed.' }, res.status);
  const text = (d.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('').trim();
  return json({ text });
}