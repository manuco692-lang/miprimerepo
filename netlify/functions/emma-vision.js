// Lecturas con foto (velas, manos, rostro): manda la imagen a Claude con visión.
// Requiere la variable de entorno ANTHROPIC_API_KEY en Netlify. La foto no se guarda: se usa solo para esta respuesta.
exports.handler = async function(event){
  const headers = {'Content-Type':'application/json'};
  if(event.httpMethod !== 'POST') return {statusCode:405, headers, body:JSON.stringify({error:'Método no permitido'})};
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key) return {statusCode:503, headers, body:JSON.stringify({error:'Falta configurar ANTHROPIC_API_KEY'})};
  let body;
  try{ body = JSON.parse(event.body || '{}'); }catch(e){ return {statusCode:400, headers, body:JSON.stringify({error:'JSON inválido'})}; }
  const system = String(body.system || '').slice(0, 6000);
  const prompt = String(body.prompt || 'Hacé la lectura de esta foto.').slice(0, 1200);
  const image = String(body.image || '');
  const mediaType = ['image/jpeg','image/png','image/webp'].includes(body.mediaType) ? body.mediaType : 'image/jpeg';
  if(!image || image.length > 6_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) return {statusCode:400, headers, body:JSON.stringify({error:'Imagen inválida'})};
  try{
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-5-5', max_tokens:1800, system, messages:[{role:'user', content:[
        {type:'image', source:{type:'base64', media_type:mediaType, data:image}},
        {type:'text', text:prompt}
      ]}]})
    });
    const data = await r.json();
    if(!r.ok) return {statusCode:502, headers, body:JSON.stringify({error:(data && data.error && data.error.message) || 'Error del modelo'})};
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return {statusCode:200, headers, body:JSON.stringify({text})};
  }catch(e){
    return {statusCode:500, headers, body:JSON.stringify({error:'No se pudo contactar al modelo'})};
  }
};
