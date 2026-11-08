import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';import {z} from '../deps.mjs';import {createStore} from '../store.mjs';import {parseGeneration,planningStep} from '../planner.mjs';
const response=value=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}],usageMetadata:{totalTokenCount:100}});
test('se aceptan listas de capítulos y objetos envueltos sin perder elementos',()=>{const chapter=z.object({number:z.number(),title:z.string()}),schema=z.object({episodes:z.array(chapter)}),episodes=[{number:1,title:'Inicio'},{number:2,title:'Final'}];assert.deepEqual(parseGeneration(response(episodes),schema,'outline'),{episodes});assert.deepEqual(parseGeneration(response([{episodes}]),schema,'outline'),{episodes});assert.throws(()=>parseGeneration(response([{title:'Uno'},{title:'Dos'}]),z.object({title:z.string()}),'bible'),/formato requerido/);});
test('reintento conserva cargos anteriores; respuesta cacheada evita nuevas llamadas',async t=>{
 const dir=mkdtempSync(tmpdir()+'/studio-planner-'),s=createStore(dir);t.after(()=>{s.db.close();rmSync(dir,{recursive:true,force:true});});
 const p=s.addProfile({name:'Canal',niche:'Educación',audience:'Hispana'}),j=s.addJob({profileId:p.id,title:'Prueba de formato',topic:'Una historia educativa.',type:'video',style:'2d',episodes:1,duration:45,maxCredits:1000,requestKey:randomUUID()});j.bible={premise:'Prueba'};s.saveSettings({},{geminiKey:'fake'});
 const base=j.id+':text:outline';s.reserve(j.id,'text',100,500000,base);s.settle(base);
 let calls=0;const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async(url,opts)=>{calls++;const b=JSON.parse(opts.body);assert.equal(b.generationConfig.responseJsonSchema.type,'object');assert.equal(b.generationConfig.responseJsonSchema.properties.episodes.type,'array');return {ok:true,json:async()=>response([{number:1,title:'Historia',objective:'Educar',conflict:'Duda',resolution:'Aprende',nextHook:'Cierre'}])};};
 await planningStep(s,j,'outline');assert.equal(j.outline.episodes.length,1);assert.equal(calls,1);assert.equal(s.db.prepare('SELECT count(*) AS n FROM charges WHERE job_id=?').get(j.id).n,2);
 j.outline=null;await planningStep(s,j,'outline');assert.equal(calls,1);assert.equal(j.outline.episodes[0].number,1);
 const reopened=createStore(dir);try{assert.ok(reopened.generationResponse(base));}finally{reopened.db.close();}
 s.reserve(j.id,'text',10,500000,'uncertain');assert.throws(()=>s.generationCharge('uncertain'),/incierto/);
});
