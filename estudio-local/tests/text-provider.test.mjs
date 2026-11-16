import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';
import {createStore} from '../store.mjs';import {requestText,strictSchema} from '../text-provider.mjs';import {generate} from '../planner.mjs';import {z} from '../deps.mjs';
function fixture(t,{gemini=true}={}){const root=mkdtempSync(tmpdir()+'/text-provider-'),store=createStore(root);t.after(()=>{store.db.close();rmSync(root,{recursive:true,force:true});});const p=store.addProfile({name:'Canal',niche:'Educación',audience:'Hispana'}),job=store.addJob({profileId:p.id,title:'Prueba de texto',topic:'Una explicación educativa.',type:'video',style:'2d',episodes:1,duration:30,maxCredits:100,requestKey:randomUUID()});store.saveSettings({monthlyTextTokens:100000},{...(gemini?{geminiKey:'fake-gemini'}:{}),openaiKey:'fake-openai'});return {root,store,job};}
const args={system:'Guionista',prompt:'Una idea',schema:{type:'object',properties:{text:{type:'string'}},required:['text']},maxOutputTokens:100,images:[]};
const answer=(value={text:'Listo'})=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:12,output_tokens:8,total_tokens:20}})});

test('OpenAI genera texto estructurado sin clave Gemini y conserva consumo y caché tras reinicio',async t=>{
 const {root,store,job}=fixture(t,{gemini:false});store.saveSettings({textProvider:'openai',openaiTextModel:'gpt-4.1-mini'});const original=global.fetch;let calls=0;t.after(()=>global.fetch=original);
 global.fetch=async(url,opts)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(opts.body);assert.equal(body.store,false);assert.equal(body.model,'gpt-4.1-mini');assert.equal(body.text.format.strict,true);assert.equal(body.text.format.schema.additionalProperties,false);return answer();};
 const result=await generate(store,job,'Una idea',z.object({text:z.string()}),'test');assert.equal(result.text,'Listo');assert.equal(calls,1);
 await generate(store,job,'Una idea',z.object({text:z.string()}),'test');assert.equal(calls,1);assert.equal(store.consumption()[0].provider,'openai-text');assert.equal(store.usage()[0].amount,20);
 const reopened=createStore(root);assert.equal(reopened.usage()[0].amount,20);reopened.db.close();
});
test('tres rechazos Gemini 503 activan OpenAI, liberan sus reservas y guardan un solo resultado',async t=>{
 const {store,job}=fixture(t),original=global.fetch;let gemini=0,openai=0;t.after(()=>global.fetch=original);
 global.fetch=async url=>{if(String(url).includes('googleapis')){gemini++;return {ok:false,status:503,json:async()=>({error:{message:'saturado'}})};}openai++;return answer();};
 const response=await requestText(store,job,job.id+':text:test',args,{wait:async()=>{}});
 assert.equal(response._provider,'openai');assert.equal(gemini,3);assert.equal(openai,1);assert.equal(store.interruptedCharges(job.id).length,0);assert.equal(store.usage()[0].amount,20);assert.ok(job.events.some(e=>e.message.includes('Continuando esta etapa con OpenAI')));
});
test('fallos de red, permisos y cuota no cambian silenciosamente de proveedor',async t=>{
 const {store,job}=fixture(t),original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return {ok:false,status:403,json:async()=>({})};};await assert.rejects(requestText(store,job,job.id+':text:permissions',args),/permisos/);assert.equal(calls,1);
 global.fetch=async()=>{calls++;throw Error('network');};await assert.rejects(requestText(store,job,job.id+':text:network',args),/network/);assert.equal(calls,2);
 store.saveSettings({textProvider:'openai'});await assert.rejects(requestText(store,job,job.id+':text:switch',args),/incierto/);assert.equal(calls,2);
});
test('desactivar respaldo impide enviar a OpenAI después de 503',async t=>{
 const {store,job}=fixture(t);store.saveSettings({textFallback:false});const original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return {ok:false,status:503};};await assert.rejects(requestText(store,job,job.id+':text:test',args,{wait:async()=>{}}),/503/);assert.equal(calls,3);
});
test('un rechazo o JSON inválido de OpenAI queda cacheado y no vuelve a consumir',async t=>{
 const {store,job}=fixture(t);store.saveSettings({textProvider:'openai'});const original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}],usage:{total_tokens:12}})};};
 await assert.rejects(generate(store,job,'Petición',z.object({text:z.string()}),'refusal'),/OpenAI/);await assert.rejects(generate(store,job,'Petición',z.object({text:z.string()}),'refusal'),/OpenAI/);assert.equal(calls,1);assert.equal(store.interruptedCharges(job.id).length,0);
});
test('OpenAI recibe las referencias como imágenes y respeta el presupuesto común',async t=>{
 const {store,job}=fixture(t);store.saveSettings({textProvider:'openai'});const original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async(url,opts)=>{calls++;const b=JSON.parse(opts.body);assert.deepEqual(b.input[0].content[1],{type:'input_image',image_url:'data:image/jpeg;base64,AAAA'});return answer();};
 await requestText(store,job,job.id+':text:vision',{...args,images:['AAAA']});assert.equal(calls,1);
 store.saveSettings({monthlyTextTokens:20});await assert.rejects(requestText(store,job,job.id+':text:over-budget',args),/Presupuesto local de texto/);assert.equal(calls,1);
});
test('el esquema estricto conserva referencias y exige las propiedades anidadas',()=>{
 const schema=strictSchema({type:'object',properties:{nested:{type:'object',properties:{label:{type:'string',default:''}}}},required:[]});assert.deepEqual(schema.required,['nested']);assert.deepEqual(schema.properties.nested.required,['label']);assert.equal(schema.properties.nested.additionalProperties,false);assert.equal(schema.properties.nested.properties.label.default,undefined);
});

test('un 400 de esquema permite una sola adaptación y conserva el diagnóstico',async t=>{
 const {store,job}=fixture(t),original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 const schema={type:'object',properties:{shots:{type:'array',minItems:4,maxItems:4,items:{type:'object',properties:{objects:{type:'array',minItems:1,maxItems:12,items:{type:'string',const:'helmet'}}}}}}};
 const initial=JSON.stringify(schema);
 global.fetch=async(url,opts)=>{calls++;const sent=JSON.parse(opts.body).generationConfig.responseJsonSchema;
  if(calls===1){assert.equal(sent.properties.shots.maxItems,4);return {ok:false,status:400,json:async()=>({error:{message:'Response schema has too many states fake-gemini',status:'INVALID_ARGUMENT'}})};}
  assert.equal(sent.properties.shots.maxItems,undefined);assert.equal(sent.properties.shots.items.properties.objects.minItems,1);assert.deepEqual(sent.properties.shots.items.properties.objects.items.enum,['helmet']);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"text":"Listo"}'}]}}],usageMetadata:{totalTokenCount:20}})};
 };
 await requestText(store,job,job.id+':code-art:400',{...args,schema});assert.equal(calls,2);assert.equal(JSON.stringify(schema),initial);assert.equal(store.interruptedCharges(job.id).length,0);
 assert.ok(Object.values(job.geminiSchemaModes).includes('compact'));
 const details=store.db.prepare('SELECT data FROM generation_error_details').all();assert.equal(details.length,1);assert.ok(!details[0].data.includes('fake-gemini'));
});
test('un 400 ajeno al esquema muestra su causa sin repetir ni cambiar proveedor',async t=>{
 const {store,job}=fixture(t),original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return {ok:false,status:400,json:async()=>({error:{message:'Invalid maxOutputTokens; key=fake-gemini'}})};};
 await assert.rejects(requestText(store,job,job.id+':400',args),e=>e.message.includes('Invalid maxOutputTokens')&&!e.message.includes('fake-gemini'));assert.equal(calls,1);
});
test('otro 400 después de compactar se detiene sin bucles y recuerda la adaptación',async t=>{
 const {store,job}=fixture(t),original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return {ok:false,status:400,json:async()=>({error:{message:'Response schema unsupported'}})};};
 const id=job.id+':400-repeat';await assert.rejects(requestText(store,job,id,args),/schema unsupported/);assert.equal(calls,2);
 await assert.rejects(requestText(store,job,id,args),/schema unsupported/);assert.equal(calls,3);assert.equal(store.interruptedCharges(job.id).length,0);
});
