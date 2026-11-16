import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {installCodeArtPack,resourceStatus} from '../code-art-pack.mjs';
import {phraseWindows,codeArtKinds,validateCodeArtPlan} from '../code-art-scene.mjs';
import {codeArtSoundEvents} from '../code-art-sound.mjs';import {descriptions} from '../deliverables.mjs';
const manifest=JSON.parse(await readFile(new URL('../code-art-pack-manifest.json',import.meta.url),'utf8'));
test('el manifiesto reconstruye kit, librerías, tres fuentes y 31 sonidos sin incluir claves',()=>{
 const names=Object.keys(manifest.files);assert.equal(names.filter(n=>n.startsWith('motor/kit/')).length,10);assert.equal(names.filter(n=>n.startsWith('motor/lib/')).length,11);assert.equal(names.filter(n=>/^sonidos\/.+\.(mp3|wav)$/.test(n)).length,31);assert.equal(names.filter(n=>/^letra\/.+\.ttf$/.test(n)).length,3);assert.ok(names.includes('letra/OFL.txt'));assert.ok(!names.some(n=>n.endsWith('.env')||n.includes('PEGA-AQUI')));
});
test('el importador rechaza rutas ajenas, paquetes parciales e integridad alterada',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pack-negative-'));try{
  await assert.rejects(installCodeArtPack({format:'smart-studio-code-art',version:1,files:[]},root),/incompleto/);
  const files=Object.keys(manifest.files).map(name=>({path:name,data:''}));files[0].path='../fuera.js';await assert.rejects(installCodeArtPack({format:'smart-studio-code-art',version:1,files},root),/ruta/);
  files[0].path=Object.keys(manifest.files)[0];await assert.rejects(installCodeArtPack({format:'smart-studio-code-art',version:1,files},root),/integridad/);
  const state=await resourceStatus(root);assert.equal(state.runtimeReady,false);assert.equal(state.sounds.length,0);assert.ok(state.missing.includes('motor/kit/index.js'));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('los cortes respetan frases completas y permiten un recorrido continuo de más de 8 segundos',()=>{
 const words=Array.from({length:12},(_,i)=>({texto:'palabra',inicio:i,fin:i+.8,frase:i<9?1:2}));assert.deepEqual(phraseWindows(words,12),[0,9]);
 const plan={shots:[{startWord:0,world:'studio',transition:'cut',background:'#173f68',cameraFrom:[0,0,12],cameraTo:[0,0,12],target:[0,0,0],objects:[{id:'button',kind:'button',position:[0,0,0],size:3,color:'#ff3b30',action:'press',actionWord:2,label:'COMPRAR'}]}]};
 assert.equal(validateCodeArtPlan(plan,words,12).shots.length,1);
});
test('nuevas piezas se limitan al tema, sus acciones tienen sonido y se pueden silenciar',()=>{
 assert.ok(codeArtKinds({scenes:[{narration:'Pulsa el botón de comprar y revisa la captura.',dialogue:[]}]}).includes('button'));
 const words=[{inicio:0},{inicio:1}],shots=[{from:0,to:3,cameraFrom:[0,0,12],cameraTo:[0,0,12],objects:[{id:'b',kind:'button',action:'press',actionWord:0},{id:'p',kind:'paper',action:'arrive',actionWord:1}]}];
 assert.deepEqual(codeArtSoundEvents(shots,words,3).map(e=>e.sonido),['aprieta','papel']);assert.deepEqual(codeArtSoundEvents(shots,words,3,{enabled:false}),[]);
 assert.ok(codeArtSoundEvents(shots,words,3).every(e=>e.t>.09&&e.corta===3));
});
test('las entregas incluyen cuatro redes y comentario sin inventar textos antiguos',()=>{
 const text=descriptions({title:'Video',instagramCopy:'IG',facebookCopy:'FB',tiktokCopy:'TT',youtubeCopy:'YT',pinnedComment:'Pregunta'});for(const name of ['Instagram Reels','Facebook Reels','TikTok','YouTube Shorts','Comentario fijado'])assert.ok(text.includes(name));
 assert.ok(descriptions({}).includes('No generado en esta versión'));
});
