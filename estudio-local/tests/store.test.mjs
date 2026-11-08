import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {createStore,nextAction,jobSchema} from '../store.mjs';
function fixture(t){const dir=mkdtempSync(path.join(os.tmpdir(),'smart-studio-test-'));const s=createStore(dir);t.after(()=>{s.db.close();rmSync(dir,{recursive:true,force:true});});const profile=s.addProfile({name:'Prueba',niche:'Educación',audience:'Emprendedores'});const input={profileId:profile.id,title:'Historia de prueba',topic:'Una historia educativa original.',type:'series',style:'2d',episodes:10,duration:90,maxCredits:1000,requestKey:randomUUID()};return {s,input,dir};}
test('una solicitud repetida no duplica una producción',t=>{const {s,input}=fixture(t);const a=s.addJob(input),b=s.addJob(input);assert.equal(a.id,b.id);assert.equal(s.list('jobs').length,1);});
test('las reservas impiden duplicados y respetan el máximo por producción',t=>{const {s,input}=fixture(t);const j=s.addJob(input);s.reserve(j.id,'voice',700,30000,'request-one');assert.throws(()=>s.reserve(j.id,'voice',700,30000,'request-one'));assert.throws(()=>s.reserve(j.id,'voice',301,30000,'request-two'));s.reserve(j.id,'voice',300,30000,'request-three');assert.equal(s.usage()[0].amount,1000);});
test('dos trabajos comparten el límite mensual y una reserva incierta no se libera sola',t=>{const {s,input}=fixture(t);const a=s.addJob(input),b=s.addJob({...input,requestKey:randomUUID()});s.reserve(a.id,'voice',700,1000,'one');assert.throws(()=>s.reserve(b.id,'voice',400,1000,'two'));s.settle('one');assert.equal(s.usage()[0].amount,700);s.reserve(b.id,'voice',300,1000,'three');assert.deepEqual(s.interruptedCharges(b.id).map(x=>x.id),['three']);});
test('la revisión completa y las correcciones preceden a las voces',()=>{const j={episodes:10,bible:{},outline:{},scripts:Array.from({length:10},()=>({})),corrections:[],audio:{},videos:{},reviewPassed:false};assert.equal(nextAction(j),'review');j.corrections=[{}];assert.equal(nextAction(j),'correct');j.corrections=[];j.reviewPassed=true;assert.equal(nextAction(j),'voice');j.audio=Object.fromEntries(j.scripts.map((_,i)=>[i+1,{}]));assert.equal(nextAction(j),'render');j.videos={...j.audio};assert.equal(nextAction(j),'complete');});
test('se rechazan temporadas incompletas y VSL demasiado cortas',t=>{const {input}=fixture(t);assert.throws(()=>jobSchema.parse({...input,episodes:9}));assert.throws(()=>jobSchema.parse({...input,type:'vsl',episodes:1,duration:90}));assert.equal(jobSchema.parse({...input,type:'vsl',episodes:1,duration:300}).duration,300);});
test('las claves no quedan en texto plano ni se incluyen en la configuración pública',t=>{const {s,dir}=fixture(t);s.saveSettings({monthlyCredits:30000},{elevenKey:'test-key-not-real-7856'});assert.equal(s.secrets().elevenKey,'test-key-not-real-7856');assert.equal(JSON.stringify(s.settings()).includes('test-key-not-real-7856'),false);const row=s.db.prepare("SELECT data FROM settings WHERE id='secrets'").get();assert.equal(row.data.includes('test-key-not-real-7856'),false);assert.equal(readFileSync(path.join(dir,'key')).length,32);});
test('consumo real independiente de reservas, persistente e idempotente',t=>{
 const {s,input,dir}=fixture(t),j=s.addJob(input);
 s.reserve(j.id,'voice',700,30000,'charge');
 s.recordConsumption('charge',j.id,{provider:'elevenlabs',credits:350,characters:700,estimatedCredits:350});
 s.recordConsumption('charge',j.id,{provider:'elevenlabs',credits:999});
 s.settle('charge');
 s.recordConsumption('text-charge',j.id,{provider:'gemini',usage:{promptTokenCount:90,candidatesTokenCount:30,thoughtsTokenCount:10,totalTokenCount:130}});
 const report=s.accounting();assert.equal(report.records.length,2);assert.equal(report.records[0].credits,350);assert.equal(report.reservations[0].amount,700);assert.equal(report.reservations[0].status,'settled');
 const reopened=createStore(dir);try{assert.equal(reopened.accounting().records[1].usage.totalTokenCount,130);}finally{reopened.db.close();}
});
test('perfiles guardan sin recortar textos largos en temática, audiencia y contexto',t=>{
 const {s}=fixture(t),long='Historias educativas y entretenimiento para monetizar un canal. '.repeat(2500).trim();
 const p=s.addProfile({name:'Canal educativo',niche:long,audience:long,brief:long});
 const saved=s.list('profiles').find(x=>x.id===p.id);
 for(const key of ['niche','audience','brief'])assert.equal(saved[key],long);
});
test('claves y token sobreviven reinicios y guardar campos vacíos conserva los existentes',t=>{
 const {s,dir}=fixture(t),expected={geminiKey:'fake-gemini',elevenKey:'fake-eleven',n8nToken:'fake-stable-token'};
 s.saveSettings({n8nUrl:'https://n8n.planifyx.com/webhook/test'},expected);
 s.saveSettings({monthlyCredits:25000},{geminiKey:'',elevenKey:'   ',n8nToken:''});
 const reopened=createStore(dir);
 try{
  assert.deepEqual(reopened.secrets(),expected);
  reopened.saveSettings({monthlyCredits:24000});assert.deepEqual(reopened.secrets(),expected);
  reopened.saveSettings({},{geminiKey:'replacement'});
  assert.deepEqual(reopened.secrets(),{...expected,geminiKey:'replacement'});
  assert.equal(JSON.stringify(reopened.settings()).includes('fake-'),false);
 }finally{reopened.db.close();}
});
