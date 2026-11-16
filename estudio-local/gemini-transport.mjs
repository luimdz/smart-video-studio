// Preserve local validation; reduce only Gemini's decoding grammar after a confirmed schema rejection.
export function geminiTransportSchema(value,{compact=false}={}){
 if(Array.isArray(value))return value.map(v=>geminiTransportSchema(v,{compact}));
 if(!value||typeof value!=='object')return value;
 const out={};
 for(const [key,child]of Object.entries(value)){
  if(key==='const'){out.enum=[child];continue;}
  if(compact&&['minItems','maxItems'].includes(key))continue;
  if(key==='properties'){
   out.properties=Object.fromEntries(Object.entries(child).map(([name,schema])=>{
    const converted=geminiTransportSchema(schema,{compact});
    if(compact&&name==='objects'&&schema.type==='array')converted.minItems=1;
    return [name,converted];
   }));
  }else out[key]=geminiTransportSchema(child,{compact});
 }
 return out;
}
export function isSchemaRejection(error){
 if(error.status!==400)return false;
 const detail=JSON.stringify(error.providerDetails||{});
 return /schema|response_?json_?schema|response_?schema|too many states|constrained decoding|grammar|constraint.*complex/i.test(detail);
}
export function safeProviderDetails(error,secrets=[]){
 let raw=JSON.stringify(error||{});
 for(const secret of secrets)if(typeof secret==='string'&&secret.length>5)raw=raw.split(secret).join('[clave oculta]');
 raw=raw.replace(/AIza[0-9A-Za-z_-]{15,}|sk-[0-9A-Za-z_-]+|Bearer\s+[0-9A-Za-z._-]+/g,'[clave oculta]');
 const safe=JSON.parse(raw);
 return {code:safe.code,status:safe.status,message:String(safe.message||'').slice(0,2000),details:safe.details||[]};
}
