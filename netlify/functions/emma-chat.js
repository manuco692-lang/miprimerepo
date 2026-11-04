// Chat con Emma: conecta la burbuja de la app con Claude (Anthropic).
// Requiere la variable de entorno ANTHROPIC_API_KEY en Netlify.
exports.handler = async function(event){
  const headers = {'Content-Type':'application/json'};
  if(event.httpMethod !== 'POST') return {statusCode:405, headers, body:JSON.stringify({error:'Método no permitido'})};
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key) return {statusCode:503, headers, body:JSON.stringify({error:'Falta configurar ANTHROPIC_API_KEY'})};
  let body;
  try{ body = JSON.parse(event.body || '{}'); }catch(e){ return {statusCode:400, headers, body:JSON.stringify({error:'JSON inválido'})}; }
  const system = String(body.system || '').slice(0, 4000);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-14).map(m => ({role:m.role, content:m.content.slice(0, 2500)}));
  if(!messages.length || messages[messages.length-1].role !== 'user') return {statusCode:400, headers, body:JSON.stringify({error:'Mensaje vacío'})};
  try{
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-5-5', max_tokens:700, system, messages})
    });
    const data = await r.json();
    if(!r.ok) return {statusCode:502, headers, body:JSON.stringify({error:(data && data.error && data.error.message) || 'Error del modelo'})};
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return {statusCode:200, headers, body:JSON.stringify({text})};
  }catch(e){
    return {statusCode:500, headers, body:JSON.stringify({error:'No se pudo contactar al modelo'})};
  }
};
