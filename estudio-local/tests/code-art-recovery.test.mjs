import test from 'node:test';import assert from 'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{randomUUID}from'node:crypto';
import{createStore}from'../store.mjs';import{buildCodeArtRequest}from'../code-art-plan-request.mjs';import{codeArtPlanningStep,parseGeneration}from'../planner.mjs';import{codeArtBudget}from'../code-art-budget.mjs';
async function fixture(t){const root=await mkdtemp(tmpdir()+'/visual-recovery-'),s=createStore(root);t.after(async()=>{s.db.close();await rm(root,{recursive:true,force:true});});const p=s.addProfile({name:'Canal',niche:'Educación',audience:'Hispana'}),j=s.addJob({profileId:p.id,title:'Equipo de protección personal',topic:'El documento conserva la evidencia.',type:'video',style:'2d',episodes:1,duration:60,maxCredits:1000,requestKey:randomUUID()});
 const text=Array.from({length:8},()=> 'El documento conserva la evidencia y la fotografía muestra cada detalle.').join(' '),characters=Array.from(text);j.scripts=[{number:1,scenes:[{narration:text,dialogue:[]}]}];j.audio={1:{file:'already-paid.mp3',duration:60,text,alignment:{characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*60),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*60)}}};s.saveSettings({monthlyTextTokens:500000},{geminiKey:'fake'});
 const request=await buildCodeArtRequest(j,1,{guidance:''}),good={unsupported:[],shots:request.windows.map(w=>({startWord:w.startWord,world:'studio',transition:'cut',background:'#173f68',cameraFrom:[0,0,12],cameraTo:[0,0,12],target:[0,0,0],objects:[{id:'doc',kind:'paper',position:[0,0,0],size:3,color:'#ffeecc',action:'hold',actionWord:w.startWord}]}))};
 const bad=structuredClone(good);bad.shots[3].objects=[];return {s,j,request,good,bad,base:j.id+':text:code-art:1:v6'};}
const raw=plan=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(plan)}]}}],usageMetadata:{totalTokenCount:100}});
const mock=(t,callback)=>{const original=global.fetch;t.after(()=>global.fetch=original);global.fetch=callback;};
test('regresión shots.3.objects: el preflight estima reparación y solo corrige el recibo inválido guardado',async t=>{
 const {s,j,request,good,bad,base}=await fixture(t),receipt=raw(bad),audio=structuredClone(j.audio);s.saveGenerationResponse(base,receipt);
 assert.throws(()=>parseGeneration(receipt,request.schema,'code-art'),e=>e.code==='GENERATION_SCHEMA_INVALID'&&e.validationIssues[0].path==='shots.3.objects');
 const budget=await codeArtBudget(s,j,1,{guidance:''});assert.ok(budget.required>0);let calls=0;mock(t,async(url,opts)=>{calls++;const body=JSON.parse(opts.body);assert.ok(body.contents[0].parts[0].text.includes('shots.3.objects'));assert.equal(body.generationConfig.responseJsonSchema.properties.shots.items.properties.objects.minItems,1);assert.equal(body.generationConfig.responseJsonSchema.properties.shots.items.properties.objects.maxItems,12);return {ok:true,json:async()=>raw(good)};});
 await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,1);assert.deepEqual(j.audio,audio);assert.deepEqual(s.generationResponse(base),receipt);assert.ok(s.generationResponse(base+':repair1'));assert.equal((await codeArtBudget(s,j,1,{guidance:''})).required,0);
});
test('la primera respuesta inválida de una producción nueva entra en la corrección acotada',async t=>{
 const {s,j,good,bad}=await fixture(t);let calls=0;mock(t,async()=>({ok:true,json:async()=>raw(++calls===1?bad:good)}));await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,2);assert.equal(j.codeArtPlans[1].shots[3].objects.length,1);
});
test('objetos ausentes, null o con tipo incorrecto tienen recuperación y no se dibujan como válidos',async t=>{
 for(const invalid of [null,undefined,{}]){const {s,j,good,bad,base}=await fixture(t);bad.shots[3].objects=invalid;s.saveGenerationResponse(base,raw(bad));let calls=0;mock(t,async()=>{calls++;return {ok:true,json:async()=>raw(good)};});await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,1);assert.equal(j.codeArtPlans[1].shots[3].objects[0].kind,'paper');}
});
test('dos planes inválidos se detienen para revisión; Producir no repite cargos',async t=>{
 const {s,j,bad,base}=await fixture(t);s.saveGenerationResponse(base,raw(bad));let calls=0;mock(t,async()=>{calls++;return {ok:true,json:async()=>raw(bad)};});
 await assert.rejects(codeArtPlanningStep(s,j,1,{guidance:''}),e=>e.code==='CODE_ART_REVIEW_REQUIRED'&&e.visualReview.episode===1);assert.equal(calls,1);
 for(let i=0;i<3;i++){await assert.rejects(codeArtPlanningStep(s,j,1,{guidance:''}),e=>e.code==='CODE_ART_REVIEW_REQUIRED');await assert.rejects(codeArtBudget(s,j,1,{guidance:''}),e=>e.code==='CODE_ART_REVIEW_REQUIRED');}assert.equal(calls,1);assert.equal(s.consumption().length,1);
});
test('una corrección explícita usa otro ciclo y conserva ambas respuestas rechazadas',async t=>{
 const {s,j,good,bad,base}=await fixture(t);s.saveGenerationResponse(base,raw(bad));s.saveGenerationResponse(base+':repair1',raw(bad));j.codeArtRepairCycles={1:1};let calls=0;mock(t,async()=>{calls++;return {ok:true,json:async()=>raw(good)};});await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,1);assert.ok(s.generationResponse(base+':repair1:cycle:1'));assert.deepEqual(s.generationResponse(base+':repair1'),raw(bad));
});
test('una reparación válida ya conservada recupera un plan guardado inválido sin APIs',async t=>{
 const {s,j,good,bad,base}=await fixture(t);s.saveGenerationResponse(base,raw(bad));s.saveGenerationResponse(base+':repair1',raw(good));j.codeArtPlans={1:bad};j.codeArtPlanVersions={1:'semantic-v6'};mock(t,()=>{throw Error('No debe llamar al proveedor');});assert.equal((await codeArtBudget(s,j,1,{guidance:''})).required,0);await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(j.codeArtPlans[1].shots[3].objects.length,1);
});
test('presupuesto insuficiente y llamadas inciertas no se eluden para reparar',async t=>{
 const {s,j,bad,base}=await fixture(t);s.saveGenerationResponse(base,raw(bad));s.saveSettings({monthlyTextTokens:1});mock(t,()=>{throw Error('No debe llamar');});await assert.rejects(codeArtPlanningStep(s,j,1,{guidance:''}),e=>e.code==='TEXT_BUDGET_EXCEEDED');
 s.saveSettings({monthlyTextTokens:500000});s.reserve(j.id,'text',100,500000,'uncertain');await assert.rejects(codeArtPlanningStep(s,j,1,{guidance:''}),/incierto/);assert.equal(s.interruptedCharges(j.id).length,1);
});
test('JSON incompleto en caché también entra a corrección sin regenerar el original',async t=>{
 const {s,j,good,base}=await fixture(t),receipt={candidates:[{finishReason:'STOP',content:{parts:[{text:'{"shots":['}]}}]};s.saveGenerationResponse(base,receipt);let calls=0;mock(t,async()=>{calls++;return {ok:true,json:async()=>raw(good)};});assert.ok((await codeArtBudget(s,j,1,{guidance:''})).required>0);await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,1);assert.deepEqual(s.generationResponse(base),receipt);
});


test('el esquema enviado conserva listas no vacías y vectores de tres coordenadas',async t=>{
 const {s,j,good}=await fixture(t);let calls=0;mock(t,async(url,opts)=>{calls++;const schema=JSON.parse(opts.body).generationConfig.responseJsonSchema,shot=schema.properties.shots.items;assert.equal(schema.properties.shots.minItems,good.shots.length);assert.equal(schema.properties.shots.maxItems,good.shots.length);assert.equal(shot.properties.objects.minItems,1);assert.equal(shot.properties.objects.maxItems,12);assert.equal(shot.properties.cameraFrom.minItems,3);assert.equal(shot.properties.cameraFrom.maxItems,3);return {ok:true,json:async()=>raw(good)};});await codeArtPlanningStep(s,j,1,{guidance:''});assert.equal(calls,1);
});
