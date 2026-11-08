import test from 'node:test';import assert from 'node:assert/strict';
import {voiceInfo,listVoices} from '../voices.mjs';
test('acentos latinos se identifican por idioma y metadatos, no por el nombre',()=>{
 assert.equal(voiceInfo({voice_id:'1',name:'Latin english',labels:{language:'en',accent:'american'}}).latam,false);
 assert.equal(voiceInfo({voice_id:'2',labels:{language:'es',accent:'mexican'}}).latam,true);
 assert.equal(voiceInfo({voice_id:'3',labels:{language:'es',accent:'castilian'}}).latam,false);
 assert.equal(voiceInfo({voice_id:'4',labels:{language:'en',accent:'american'},verified_languages:[{language:'es',locale:'es-MX',accent:'mexican'}]}).latam,true);
 assert.equal(voiceInfo({voice_id:'5',labels:{language:'es'}}).latam,false);
});
test('biblioteca consulta español y excluye tarifas especiales, con paginación',async()=>{
 let url;const request=async u=>{url=u;return {ok:true,json:async()=>({voices:[{voice_id:'mx',name:'Uno',language:'es',accent:'mexican',public_owner_id:'owner'},{voice_id:'sp',name:'Dos',language:'es',accent:'castilian'}],has_more:true})};};
 const b=await listVoices('fake',{source:'library',region:'latam',page:2},request);
 assert.equal(url.searchParams.get('language'),'es');assert.equal(url.searchParams.get('include_custom_rates'),'false');assert.equal(url.searchParams.get('page'),'2');assert.deepEqual(b.voices.map(v=>v.id),['mx']);assert.equal(b.hasMore,true);assert.equal(b.voices[0].ownerId,'owner');
});
test('mis voces incluye variantes verificadas en español y conserva cursor',async()=>{
 const b=await listVoices('fake',{source:'account',region:'all',cursor:'next'},async url=>{assert.equal(url.searchParams.get('next_page_token'),'next');return {ok:true,json:async()=>({voices:[{voice_id:'v',labels:{language:'en'},verified_languages:[{language:'es',accent:'colombian'}]}],has_more:false})};});assert.equal(b.voices.length,1);assert.equal(b.voices[0].latam,true);
});
