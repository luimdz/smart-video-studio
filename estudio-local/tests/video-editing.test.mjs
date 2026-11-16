import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {captionCues, backgroundFilter, sceneWindow} from '../video-editing.mjs';
import {createStore} from '../store.mjs';
import {prepareReexport, reexportSaved} from '../reexport.mjs';
import {renderEpisode, processFile} from '../render.mjs';
import {sharp} from '../deps.mjs';

function alignment(text, duration) {
  const characters=Array.from(text);
  return {characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*duration),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*duration)};
}

test('subtítulos conservan toda la narración en bloques legibles, con o sin alineación',()=>{
  const text='Una historia completa necesita conservar cada palabra, incluso después de cambiar de imagen. La música acompaña y la voz cuenta lo que sucede.';
  for(const audio of [{text,duration:18},{text,duration:18,alignment:alignment(text,18)}]) {
    const cues=captionCues(audio);
    assert.equal(cues.map(c=>c.text).join(' '),text);
    assert.equal(cues[0].start,0);assert.equal(cues.at(-1).end,18);
    for(const [i,c] of cues.entries()) {assert.ok(c.end>c.start);assert.ok(c.text.length<=63);if(i)assert.equal(c.start,cues[i-1].end);}
  }
});

test('el acercamiento conserva el tiempo de escena entre subtítulos; predeterminado sin movimiento',()=>{
  const timeline=[{start:0,end:8},{start:8,end:15}],w=sceneWindow(5,15,2,timeline);
  assert.deepEqual(w,{index:0,start:0,end:8});
  assert.equal(backgroundFilter({style:'motion'},{duration:8,offset:5}),'[0:v]null');
  const filter=backgroundFilter({style:'motion',cameraMotion:'gentle'},{duration:w.end-w.start,offset:5-w.start});
  assert.ok(filter.includes('(on+150)/240'));assert.ok(!filter.includes('sin('));assert.ok(!filter.includes('cos('));
  assert.equal(backgroundFilter({style:'static',cameraMotion:'gentle'},{duration:8}),'[0:v]null');
});

test('música en narración y opciones de montaje persisten; 2D informa su límite',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'editing-store-')),store=createStore(root);
  try {
    const p=store.addProfile({name:'Marca',niche:'Educación',audience:'Hispana'}),musicId=store.addMedia({kind:'music',file:'/fixture/music.wav'});
    const input={profileId:p.id,title:'Video narrado',topic:'Una explicación educativa completa',type:'video',style:'motion',episodes:1,duration:30,maxCredits:100,requestKey:randomUUID(),useMusic:true,musicId};
    const j=store.addJob(input);assert.equal(j.cameraMotion,'none');assert.equal(j.subtitlesEnabled,true);assert.equal(j.music.kind,'music');
    assert.throws(()=>store.addJob({...input,requestKey:randomUUID(),style:'2d'}),/2D/);
  } finally {store.db.close();await rm(root,{recursive:true,force:true});}
});

test('reexportación reutiliza los medios, sin proveedores ni consumo, y exige todos los audios',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'editing-reexport-')),store=createStore(root),original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('La reexportación no debe llamar a proveedores');};
  try {
    const p=store.addProfile({name:'Marca',niche:'Educación',audience:'Hispana'}),j=store.addJob({profileId:p.id,title:'Video narrado',topic:'Una explicación educativa completa',type:'video',style:'motion',episodes:1,duration:30,maxCredits:100,requestKey:randomUUID()});
    j.root=root;j.status='ready';j.scripts=[{scenes:[]}];
    await assert.rejects(prepareReexport(store,j,{}),/audios/);
    j.audio[1]={file:new URL('../README.md',import.meta.url).pathname,duration:2};j.generatedImages={1:[{file:'image.png'}]};
    const updated=await prepareReexport(store,j,{cameraMotion:'gentle',subtitlesEnabled:false});
    let calls=0;await reexportSaved(store,updated,p,{render:async(job,profile,n,library)=>{calls++;assert.deepEqual(job.audio,j.audio);assert.deepEqual(job.generatedImages,j.generatedImages);assert.equal(job.cameraMotion,'gentle');return {file:'new.mp4'};}});
    assert.equal(calls,1);assert.equal(store.getJob(j.id).status,'ready');assert.deepEqual(store.usage(),[]);assert.equal(store.getJob(j.id).renderOnly,false);
  } finally {globalThis.fetch=original;store.db.close();await rm(root,{recursive:true,force:true});}
});

test('FFmpeg exporta escenas estables con subtítulos, voz y música sin llamadas externas',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'editing-render-')),original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('No se permiten proveedores');};
  try {
    const a=path.join(root,'red.png'),b=path.join(root,'blue.png'),voice=path.join(root,'voice.wav'),music=path.join(root,'music.wav');
    await sharp({create:{width:108,height:192,channels:3,background:'#ee2222'}}).png().toFile(a);
    await sharp({create:{width:108,height:192,channels:3,background:'#2222ee'}}).png().toFile(b);
    await processFile('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=400:duration=2','-c:a','pcm_s16le',voice],root);
    await processFile('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=900:duration=1','-c:a','pcm_s16le',music],root);
    const text='Primera escena. Segunda escena.',audio={file:voice,text,duration:2,alignment:alignment(text,2)};
    const job={id:'fixture',title:'Prueba técnica de montaje',style:'motion',cameraMotion:'none',subtitlesEnabled:true,useMusic:true,music:{file:music},musicVolume:50,audio:{1:audio},productionImages:[{file:a},{file:b}],scripts:[{title:'Prueba técnica',scenes:[]}]};
    const out=await renderEpisode(job,{name:'Prueba',color:'#22d3ee'},1,root,{width:270,height:480});
    assert.ok(out.bytes>0);assert.ok(Math.abs(out.duration-2)<.15);
    for(const [time,channel] of [[.3,0],[1.5,2]]) {
      const file=path.join(root,`frame-${time}.png`);await processFile('ffmpeg',['-v','error','-y','-ss',String(time),'-i',out.file,'-frames:v','1',file],root);
      const pixel=await sharp(file).extract({left:30,top:30,width:1,height:1}).removeAlpha().raw().toBuffer();assert.ok(pixel[channel]>180);
    }
    const pcm=path.join(root,'mixed.pcm');await processFile('ffmpeg',['-v','error','-y','-i',out.file,'-vn','-ac','1','-ar','8000','-f','s16le',pcm],root);
    const samples=await readFile(pcm),power=f=>{let re=0,im=0;for(let i=4000;i<10000;i++){const v=samples.readInt16LE(i*2);re+=v*Math.cos(2*Math.PI*f*i/8000);im+=v*Math.sin(2*Math.PI*f*i/8000);}return Math.hypot(re,im);};
    assert.ok(power(400)>power(1700)*10);assert.ok(power(900)>power(1700)*10);
    job.cameraMotion='gentle';job.subtitlesEnabled=false;job.useMusic=false;
    const gentle=await renderEpisode(job,{name:'Prueba',color:'#22d3ee'},1,root,{width:270,height:480});assert.ok(gentle.bytes>0);
  } finally {globalThis.fetch=original;await rm(root,{recursive:true,force:true});}
});
