// EdgeOne Pages Edge Function → POST /api/tts  { text, voice } → { pcm (base64 16-bit mono), rate }
const VOICES = ['Kore', 'Charon', 'Puck', 'Aoede', 'Fenrir', 'Zephyr'];
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: 'GEMINI_API_KEY is not set.' }, 500);
  let p; try { p = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const text = String(p.text || '').slice(0, 700);
  if (!text) return json({ error: 'No text.' }, 400);
  const voice = VOICES.includes(p.voice) ? p.voice : 'Kore';
  const model = env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say this clearly, calmly and confidently, like a trusted shop mentor: ' + text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    }),
  });
  const d = await res.json();
  if (!res.ok) return json({ error: d?.error?.message || 'TTS failed.' }, res.status);
  const part = d.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
  if (!part) return json({ error: 'No audio returned.' }, 502);
  const rate = +(/rate=(\d+)/.exec(part.inlineData.mimeType || '') || [])[1] || 24000;
  return json({ pcm: part.inlineData.data, rate });
}