import {textReservation} from './text-budget.mjs';
import {requestGeneration} from './gemini-http.mjs';

export function strictSchema(value) {
  if (Array.isArray(value)) return value.map(strictSchema);
  if (!value || typeof value !== 'object') return value;
  const out=Object.fromEntries(Object.entries(value).filter(([k])=>!['$schema','default','format'].includes(k)).map(([k,v])=>[k,strictSchema(v)]));
  if(out.type==='object'||out.properties){out.additionalProperties=false;out.required=Object.keys(out.properties||{});}
  return out;
}
export function textSettings(config,secrets) {
  const provider=config.textProvider||'gemini';
  return {provider,model:provider==='openai'?(config.openaiTextModel||'gpt-4.1-mini'):(config.geminiModel||'gemini-3.1-flash-lite'),
    key:provider==='openai'?secrets.openaiKey:secrets.geminiKey};
}
export async function requestText(store,job,baseId,{system,prompt,schema,maxOutputTokens,images},options={}) {
  const config=store.settings(),secrets=store.secrets(),selected=textSettings(config,secrets);
  async function call(provider) {
    const model=provider==='openai'?(config.openaiTextModel||'gpt-4.1-mini'):(config.geminiModel||'gemini-3.1-flash-lite');
    const key=provider==='openai'?secrets.openaiKey:secrets.geminiKey;
    if(!key)throw new Error(`Configura la clave de ${provider==='openai'?'OpenAI':'Gemini'} para generar texto.`);
    const requestId=provider==='gemini'?baseId:`${baseId}:openai:${model}`;
    // A different provider must not bypass an uncertain, potentially paid request.
    if(store.interruptedCharges(job.id).length)throw new Error('Hay una llamada de resultado incierto. Revisa el proveedor antes de continuar.');
    const reservation=textReservation({system,prompt,schema:provider==='openai'?strictSchema(schema):schema,maxOutputTokens,images},provider),reserve=reservation.required;
    const request=()=> provider==='gemini'
      ? fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt},...images.map(data=>({inlineData:{mimeType:'image/jpeg',data}}))]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens,temperature:0.7}}),signal:AbortSignal.timeout(90000),redirect:'error'})
      : fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,store:false,instructions:system,input:[{role:'user',content:[{type:'input_text',text:prompt},...images.map(data=>({type:'input_image',image_url:`data:image/jpeg;base64,${data}`}))]}],text:{format:{type:'json_schema',name:'studio_generation',strict:true,schema:strictSchema(schema)}},max_output_tokens:maxOutputTokens}),signal:AbortSignal.timeout(120000),redirect:'error'});
    const {response,charge}=await requestGeneration(store,job,requestId,reserve,request,{...options,provider:provider==='openai'?'OpenAI':'Gemini',onRetry:async({attempt,delay})=>{
      job.events.unshift({at:new Date().toISOString(),message:`${provider==='openai'?'OpenAI':'Gemini'} está saturado (503). Intento ${attempt} de 3 en ${Math.ceil(delay/1000)} segundos; se conservan los avances.`});store.saveJob(job);
      await options.onRetry?.({attempt,delay});
    }});
    const raw=await response.json();
    const usage=provider==='gemini'?raw.usageMetadata:raw.usage;
    const body=provider==='gemini'?raw:{candidates:[{finishReason:raw.status==='completed'?'STOP':'MAX_TOKENS',content:{parts:[{text:(raw.output||[]).filter(o=>o.type==='message').flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')}]}}]};
    body._provider=provider;body._model=model;
    // Save receipt before validation, so a refusal or malformed JSON is never billed again silently.
    store.saveGenerationResponse(baseId,body);
    store.recordConsumption(charge,job.id,{provider:provider==='gemini'?'gemini':'openai-text',model,step:baseId.split(':text:')[1],reservation,usage:usage||null});
    store.settle(charge,provider==='gemini'?usage?.totalTokenCount:usage?.total_tokens);
    return body;
  }
  try{return await call(selected.provider);}catch(error){
    if(selected.provider!=='gemini'||error.status!==503||config.textFallback===false||!secrets.openaiKey)throw error;
    job.events.unshift({at:new Date().toISOString(),message:'Gemini rechazó los tres intentos (503). Continuando esta etapa con OpenAI; se conservan los avances.'});store.saveJob(job);
    return call('openai');
  }
}
