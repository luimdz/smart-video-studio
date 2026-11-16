export function parseGeneration(body,schema,step){
 const provider=body._provider==='openai'?'OpenAI':'Gemini';const c=body.candidates?.[0];if(!c||c.finishReason==='MAX_TOKENS')throw new Error(`${provider} devolvió una respuesta incompleta o rechazó la solicitud. La respuesta se conservó para revisarla antes de volver a consumir tokens.`);
 let value;try{value=JSON.parse((c.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''));}catch{throw new Error(`${provider} devolvió un JSON incompleto. La respuesta se conservó; no se repetirá el cobro automáticamente.`);}
 if(Array.isArray(value)){
   if(step==='outline'&&value.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&'number' in x))value={episodes:value};
   else if(value.length===1&&value[0]&&typeof value[0]==='object'&&!Array.isArray(value[0]))value=value[0];
 }
 const result=schema.safeParse(value);if(!result.success){const issue=result.error.issues[0],where=issue.path?.join('.')||'raíz';throw new Error(`La respuesta de ${provider} para ${step.split(':')[0]} no tiene el formato requerido (${where}). Se conservó para revisarla sin repetir la llamada.`);}
 return result.data;
}
