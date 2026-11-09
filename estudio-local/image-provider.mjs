import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {sharp} from './deps.mjs';
export const imageModel=provider=>provider==='openai'?'gpt-image-2':'gemini-nano-banana-2.1';
export function extractImage(body,provider){
 if(provider==='openai')return body.data?.find(d=>d.b64_json)?.b64_json;
 // Only final outputs, never interim thinking images.
 if(body.output_image?.data)return body.output_image.data;
 const outputs=(body.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).filter(c=>c.type==='image'&&c.data);return outputs.at(-1)?.data;
}
export async function generateImage(store,j,{prompt,references=[],episode=1,scene=1,library=j.root}){
 const provider=j.imageProvider||'gemini',model=imageModel(provider),quality=j.imageQuality||'high',refs=references.slice(0,provider==='openai'?16:14);
 const images=await Promise.all(refs.map(async r=>{const data=await sharp(await readFile(r.file),{limitInputPixels:40000000}).rotate().resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer();return {data,hash:createHash('sha256').update(data).digest('hex')};}));
 const hash=createHash('sha256').update(JSON.stringify({prompt,provider,model,quality,refs:images.map(i=>i.hash)})).digest('hex'),baseId=`${j.id}:image:${episode}:${scene}:${hash}`,cached=store.generationResponse(baseId);
 if(cached){if(cached.error)throw Error(cached.error);try{await access(cached.file);}catch{const meta=await sharp(cached.raw,{limitInputPixels:50000000}).metadata();if(meta.width>=meta.height)throw Error('La imagen conservada no es vertical. Cambia la dirección visual para generar otra versión.');await sharp(cached.raw,{limitInputPixels:50000000}).rotate().resize(1080,1920,{fit:'contain',background:'#111827'}).png().toFile(cached.file);}return cached;}
 const key=store.secrets()[provider==='openai'?'openaiKey':'geminiKey'];if(!key)throw Error(provider==='openai'?'Guarda la clave de OpenAI en Configuración para usar GPT Image 2.':'Guarda la clave de Gemini para usar Nano Banana.');
 const charge=store.reserve(j.id,'image',1,store.settings().monthlyImages??100,store.generationCharge(baseId));
 let url,options;
 if(provider==='gemini'){
  url='https://generativelanguage.googleapis.com/v1beta/interactions';options={method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key,'Api-Revision':'2026-05-20'},body:JSON.stringify({model,store:false,input:[{type:'text',text:prompt},...images.map(i=>({type:'image',mime_type:'image/jpeg',data:i.data.toString('base64')}))],response_format:{type:'image',mime_type:'image/jpeg',aspect_ratio:'9:16',image_size:quality==='high'?'2K':'1K'}})};
 }else{
  const fields={model,prompt,n:1,size:'1152x2048',quality,output_format:'png'};url='https://api.openai.com/v1/images/'+(images.length?'edits':'generations');
  if(images.length){const form=new FormData();for(const [k,v]of Object.entries(fields))form.set(k,String(v));images.forEach((i,n)=>form.append('image[]',new Blob([i.data],{type:'image/jpeg'}),`reference-${n+1}.jpg`));options={method:'POST',headers:{Authorization:`Bearer ${key}`},body:form};}
  else options={method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(fields)};
 }
 // No automatic retries of image calls: uncertain results must not be charged twice.
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(240000),redirect:'error'});
 if(!response.ok){const failure=await response.json().catch(()=>null);const safe=JSON.stringify(failure).split(key).join('[clave oculta]');store.db.prepare('INSERT OR REPLACE INTO generation_error_details VALUES(?,?)').run(charge,safe);if([400,401,403,404,422,429,503].includes(response.status))store.releaseRejected(charge);const detail=String(failure?.error?.message||'').split(key).join('[clave oculta]').replace(/AIza[\w-]+|sk-[\w-]+/g,'[clave oculta]').slice(0,500);throw Error(`${provider==='openai'?'GPT Image 2':'Nano Banana'} respondió ${response.status}. ${response.status===429?'Revisa la cuota y facturación del proyecto de imágenes.':response.status===401||response.status===403?'Revisa acceso y permisos de la clave.':detail||'El proveedor no pudo generar la imagen.'}`);}
 const body=await response.json(),data=extractImage(body,provider),usage=body.usage||null;
 store.recordConsumption(charge,j.id,{provider:provider+'-image',category:'image',model,episode,scene,images:data?1:0,usage});store.settle(charge,data?1:0);
 if(!data){const error='El proveedor respondió sin una imagen final. La respuesta está registrada y no se repetirá automáticamente.';store.saveGenerationResponse(baseId,{error});throw Error(error);}
 const dir=path.join(library,'generated-images',j.id);await mkdir(dir,{recursive:true});const raw=path.join(dir,hash+'.original'),file=path.join(dir,hash+'.png');await writeFile(raw,Buffer.from(data,'base64'));
 // Cache receipt before decoding so a local processing failure cannot repeat billing.
 const result={file,raw,hash,provider,model,quality,episode,scene,usage};store.saveGenerationResponse(baseId,result);
 const meta=await sharp(raw,{limitInputPixels:50000000}).metadata();if(meta.width>=meta.height)throw Error('La imagen del proveedor no es vertical. Se conservó el original; no se usará una ilustración de reemplazo.');await sharp(raw,{limitInputPixels:50000000}).rotate().resize(1080,1920,{fit:'contain',background:'#111827'}).png().toFile(file);return result;
}
