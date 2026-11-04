// Lecturas largas con IA (aura profunda, interpretación de sueños) para la versión de Netlify.
// Usa la misma variable de entorno ANTHROPIC_API_KEY que el chat. Transmite la respuesta de a poco
// (streaming), así no se corta por el límite de tiempo de las funciones comunes.
export default async (request) => {
  const key = Netlify.env.get('ANTHROPIC_API_KEY');
  if (request.method === 'GET') return Response.json({ ok: !!key });
  if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  if (!key) return Response.json({ error: 'Falta configurar ANTHROPIC_API_KEY' }, { status: 503 });
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
  const prompt = String(body.prompt || '').slice(0, 14000);
  if (prompt.length < 20) return Response.json({ error: 'Pedido vacío' }, { status: 400 });
  const max = Math.min(7000, Math.max(600, parseInt(body.max, 10) || 4000));
  const up = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: max, stream: true, messages: [{ role: 'user', content: prompt }] })
  });
  if (!up.ok || !up.body) return Response.json({ error: 'La IA no respondió' }, { status: 502 });
  return new Response(up.body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' } });
};
export const config = { path: '/api/emma-long' };
