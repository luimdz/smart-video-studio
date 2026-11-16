import test from 'node:test';import assert from 'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{randomUUID}from'node:crypto';
import{createStore}from'../store.mjs';import{buildCodeArtRequest}from'../code-art-plan-request.mjs';import{codeArtBudget,checkCodeArtBudget}from'../code-art-budget.mjs';import{codeArtPlanningStep,voiceStep}from'../planner.mjs';
async function fixture(t){const root=await mkdtemp(tmpdir()+'/text-budget-'),store=createStore(root);t.after(async()=>{store.db.close();await rm(root,{recursive:true,force:true});});const p=store.addProfile({name:'Canal',niche:'Educación',audience:'Hispana',voiceId:'fake-voice'}),job=store.addJob({profileId:p.id,title:'Equipo de protección personal',topic:'El documento conserva la evidencia.',type:'video',style:'2d',episodes:1,duration:60,maxCredits:3000,requestKey:randomUUID()});
 const narration=Array.from({length:8},()=> 'El documento conserva la evidencia y la fotografía muestra cada detalle.').join(' ');job.scripts=[{number:1,title:job.title,scenes:[{number:1,narration,dialogue:[],visual:'Documento y evidencia'}]}];const characters=Array.from(narration),duration=60;job.audio={1:{file:root+'/existing-voice.mp3',duration,text:narration,alignment:{characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*duration),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*duration)}}};store.saveSettings({monthlyTextTokens:500000},{geminiKey:'fake',elevenKey:'fake'});return {root,store,job};}
const guidance='Guía de dibujo, luz y sonido. '.repeat(140).slice(0,4200);
function response(plan){return {candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(plan)}]}}],usageMetadata:{totalTokenCount:100}};}
test('regresión 465093/500000: el plan compacto cabe y reutiliza la voz sin ampliar el límite',async t=>{
 const {store,job}=await fixture(t);store.reserve(job.id,'text',465093,500000,'history');store.settle('history',465093);
 assert.throws(()=>store.reserve(job.id,'text',57356,500000,'old'),e=>e.code==='TEXT_BUDGET_EXCEEDED'&&e.budget.available===34907);
 const request=await buildCodeArtRequest(job,1,{guidance}),estimate=await checkCodeArtBudget(store,job,1,{guidance});assert.ok(estimate.required<34907);assert.ok(request.maxOutputTokens<24000);
 const audio=structuredClone(job.audio),plan={unsupported:[],shots:request.windows.map(w=>({startWord:w.startWord,world:'studio',transition:'cut',background:'#173f68',cameraFrom:[0,0,12],cameraTo:[0,0,12],target:[0,0,0],objects:[{id:'document',kind:'paper',position:[0,0,0],size:3,color:'#ffeecc',action:'hold',actionWord:w.startWord}]}))};
 const original=global.fetch;t.after(()=>global.fetch=original);let calls=0;global.fetch=async(url,opts)=>{calls++;assert.ok(String(url).includes(':generateContent'));const body=JSON.parse(opts.body);assert.equal(body.generationConfig.maxOutputTokens,request.maxOutputTokens);assert.equal(body.contents[0].parts.length,1);return {ok:true,json:async()=>response(plan)};};
 await codeArtPlanningStep(store,job,1,{guidance});assert.equal(calls,1);assert.deepEqual(job.audio,audio);assert.equal(store.settings().monthlyTextTokens,500000);assert.equal(store.textBudget().accounted,465193);
 assert.equal((await codeArtBudget(store,job,1,{guidance})).required,0);await codeArtPlanningStep(store,job,1,{guidance});assert.equal(calls,1);
 console.log('Reserva compacta de la regresión:',estimate.required,'disponibles:',34907);
});
test('sin presupuesto para el plan, no se llama a ElevenLabs ni se reserva voz',async t=>{
 const {store,job,root}=await fixture(t);job.audio={};store.reserve(job.id,'text',499999,500000,'history');store.settle('history',499999);
 const original=global.fetch;t.after(()=>global.fetch=original);global.fetch=()=>{throw Error('No debe gastarse voz');};
 await assert.rejects(voiceStep(store,job,root,{guidance}),e=>e.code==='TEXT_BUDGET_EXCEEDED'&&e.budget.available===1);assert.equal(store.usage().some(r=>r.kind==='voice'),false);assert.deepEqual(job.audio,{});
});
test('el presupuesto separa contabilizados y reservas inciertas sin borrar historial',async t=>{
 const {store,job}=await fixture(t);store.reserve(job.id,'text',200,500000,'settled');store.settle('settled',100);store.reserve(job.id,'text',250,500000,'uncertain');
 assert.deepEqual(store.textBudget(499700),{limit:500000,accounted:100,reserved:250,used:350,available:499650,required:499700,shortfall:50});
 assert.throws(()=>store.assertTextBudget(499700),e=>e.code==='TEXT_BUDGET_EXCEEDED'&&e.message.includes('Gemini y OpenAI'));assert.deepEqual(store.interruptedCharges(job.id).map(r=>r.id),['uncertain']);assert.equal(store.settings().monthlyTextTokens,500000);
});
test('el contexto de identidad crece con la paleta, no con todos los planes anteriores',async t=>{
 const {job}=await fixture(t),older={shots:Array.from({length:50},()=>({objects:[{id:'paper',kind:'paper',color:'#ffeecc',label:'contenido '.repeat(100)}]}))};job.codeArtPlans=Object.fromEntries(Array.from({length:24},(_,i)=>[i+1,older]));job.scripts[24]=job.scripts[0];job.audio[25]=job.audio[1];
 const request=await buildCodeArtRequest(job,25,{guidance});assert.ok(request.prompt.length<16000);assert.ok(!request.prompt.includes('contenido contenido'));assert.ok(request.prompt.includes('"id":"paper"'));
});
