import {createProductionQueue} from './production-queue.mjs';
import {needsReviewRecovery,reopenReview,editScriptText} from './recovery.mjs';
import {romanticNote} from './static-design.mjs';
import {ensureCodeArt} from './code-art-resources.mjs';
import http from 'node:http';
import {usesExactText} from './content.mjs';
import {listVoices,resolveLibraryVoice} from './voices.mjs';
import { revision } from './revision.mjs';
const runningRevision=await revision();
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, readdir, realpath, access, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createStore, nextAction } from './store.mjs';
import { planningStep, voiceStep, codeArtPlanningStep } from './planner.mjs';
import { renderEpisode, storageStatus, requireStorage, processFile, letterOverlay } from './render.mjs';
import { z, sharp } from './deps.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const stateDir=process.env.STUDIO_STATE_DIR||path.join(here,'.state');
const store=createStore(stateDir);store.resetDrafts();
const port=Number(process.env.STUDIO_PORT||4317),origin=`http://127.0.0.1:${port}`,session=randomBytes(32).toString('hex');
const active=new Set(),pauses=new Set();let admitting=false;
const queue=createProductionQueue({run,onError:(id,error)=>{const j=store.getJob(id);j.status='failed';j.error=error.message;record(j,j.error);}});
const defaults=store.settings();if(!defaults.storageRoot){const root=path.join(here,'outputs');await mkdir(root,{recursive:true});store.saveSettings({storageRoot:root,useN8n:true});}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req){let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>25*1024*1024)throw new Error('El archivo supera el límite de 25 MB.');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString()||'{}');}
function record(j,message){j.events.unshift({at:new Date().toISOString(),message});j.events=j.events.slice(0,100);store.saveJob(j);}
function view(j){return {id:j.id,title:j.title,type:j.type,style:j.style,episodes:j.episodes,duration:j.duration,status:j.status,progress:j.progress,error:j.error,profileId:j.profileId,createdAt:j.createdAt,updatedAt:j.updatedAt,maxCredits:j.maxCredits,stage:j.stage||'',pauseRequested:pauses.has(j.id),demo:!!j.demo,scriptCount:j.scripts.length,audioCount:Object.keys(j.audio).length,videos:Object.fromEntries(Object.entries(j.videos).map(([n,v])=>[n,{duration:v.duration,bytes:v.bytes,width:v.width,height:v.height}]))};}
async function state(){const c=store.settings(),s=store.secrets();return {profiles:store.list('profiles'),music:store.listMusic(),jobs:store.list('jobs').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(view),settings:c,connections:{gemini:!!s.geminiKey,elevenlabs:!!s.elevenKey,n8nToken:!!s.n8nToken,n8n:!!(s.n8nToken&&c.n8nUrl)},usage:store.usage(),accounting:store.accounting(),storage:await storageStatus(c.storageRoot),active:active.size,queued:queue.pending};}
async function coordinate(j){
  const c=store.settings(),s=store.secrets();if(!c.useN8n)throw new Error('Conecta n8n para coordinar la producción.');
  const u=new URL(c.n8nUrl);if(u.protocol!=='https:'||u.hostname!=='n8n.planifyx.com')throw new Error('La dirección debe pertenecer a tu instancia n8n.planifyx.com y usar HTTPS.');
  const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':s.n8nToken},body:JSON.stringify({productionId:j.id,totalEpisodes:j.episodes,hasBible:!!j.bible,hasOutline:!!j.outline,writtenEpisodes:j.scripts.length,correctionPending:!!j.corrections.length,reviewPassed:j.reviewPassed,voicedEpisodes:Object.keys(j.audio).length,renderedEpisodes:Object.keys(j.videos).length}),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`n8n respondió ${r.status}. Comprueba publicación y credencial de entrada.`);
  const raw=await r.json(),result=Array.isArray(raw)?raw[0]:raw;
  if(result.productionId!==j.id||result.protocolVersion!==1||result.action!==nextAction(j))throw new Error('n8n devolvió una instrucción fuera del contrato esperado.');return result.action;
}
async function preflight(j){if(j.style==='2d')await ensureCodeArt();const c=store.settings(),s=store.secrets(),p=store.list('profiles').find(p=>p.id===j.profileId);await requireStorage(c.storageRoot);for(const image of [...(j.referenceImages||[]),...(j.productionImages||[]),...(j.useLogo&&j.logo?[j.logo]:[]),...(j.useMusic&&j.music?[j.music]:[])]){try{await access(image.file);}catch{throw new Error('No se encuentra una imagen adjunta. Conecta el disco donde la guardaste antes de producir.');}}if(j.style==='static'&&usesExactText(j)){if(j.staticDesign==='romantic-note')romanticNote(j.staticText);else letterOverlay(j.staticText);}if(!s.geminiKey)throw new Error('Configura la clave de Gemini.');if(j.narrationEnabled!==false&&!s.elevenKey)throw new Error('Configura la clave de ElevenLabs.');if(j.narrationEnabled!==false&&!p?.voiceId)throw new Error('Selecciona una voz para este perfil.');if(!c.n8nUrl||!s.n8nToken)throw new Error('Configura el workflow coordinador de n8n.');if(store.interruptedCharges(j.id).length)throw new Error('Hay una llamada de resultado incierto. Revisa el proveedor antes de repetir; la aplicación no volverá a cobrarla automáticamente.');}
async function run(id){let j=store.getJob(id);active.add(id);pauses.delete(id);try{
  j.status='running';j.root=j.root||await requireStorage(store.settings().storageRoot);record(j,j.narrationEnabled===false?'Producción sin narración iniciada. No se consumen créditos de ElevenLabs.':'Producción iniciada. Las voces se generan después de revisar todos los guiones.');
  while(true){if(pauses.has(id)){j.status='paused';record(j,'Pausada después de guardar la etapa actual.');break;}
    const action=await coordinate(j);j.stage=action;store.saveJob(j);
    if(action==='complete'){j.status='ready';j.progress=100;record(j,'Todos los videos y copies están guardados localmente. Publicación Meta pendiente de conectar.');break;}
    if(['bible','outline','script','correct','review'].includes(action))j=await planningStep(store,j,action);
    else if(action==='voice')j=await voiceStep(store,j,j.root);
    else if(action==='render'){const n=j.scripts.findIndex((_,i)=>!j.videos[i+1])+1;const profile=store.list('profiles').find(p=>p.id===j.profileId);if(j.style==='2d')j=await codeArtPlanningStep(store,j,n);j.videos[n]=await renderEpisode(j,profile,n,j.root);}
    j.progress=Math.round((Number(!!j.bible)+Number(!!j.outline)+j.scripts.length+Number(j.reviewPassed)+Object.keys(j.audio).length+Object.keys(j.videos).length)/(3+3*j.episodes)*100);record(j,`Etapa guardada: ${action}.`);
    await writeFile(path.join(j.root,'productions',j.id+'.json'),JSON.stringify(j,null,2)).catch(async e=>{if(e.code!=='ENOENT')throw e;await mkdir(path.join(j.root,'productions'),{recursive:true});await writeFile(path.join(j.root,'productions',j.id+'.json'),JSON.stringify(j,null,2));});
  }
 }catch(error){j.status='failed';j.error=error.issues?.[0]?.message||error.message;record(j,'La producción se detuvo: '+j.error);}finally{active.delete(id);pauses.delete(id);store.saveJob(j);}}
async function demo(){if(active.size)throw new Error('Espera a que termine la exportación actual.');let profile=store.list('profiles')[0];if(!profile)profile=store.addProfile({name:'Prueba local',niche:'Demostración del estudio',audience:'Propietario',brief:'Perfil de prueba creado al solicitar el render de demostración.'});
  const j=store.addJob({profileId:profile.id,title:'Tu estudio, en movimiento',topic:'Prueba local de exportación, sin IA ni voz de proveedor.',type:'video',style:'motion',episodes:1,duration:30,maxCredits:100,requestKey:randomUUID()});j.demo=true;j.status='running';j.root=await requireStorage(store.settings().storageRoot);j.scripts=[{number:1,title:j.title,coverTitle:'Tu estudio, en movimiento',scenes:[],facebookCopy:'Demostración técnica. Sin voz de ElevenLabs.',instagramCopy:'Demostración técnica. Sin voz de ElevenLabs.'}];j.bible={characters:[{id:'demo-presenter'}]};active.add(j.id);store.saveJob(j);
  void(async()=>{try{const dir=path.join(j.root,'productions',j.id);await mkdir(dir,{recursive:true});const file=path.join(dir,'test-tone.wav');await processFile('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=8','-af','volume=0.025',file],dir);j.audio[1]={file,duration:8,text:'Prueba de render local. Este video no utiliza voces ni créditos de ElevenLabs.'};j.videos[1]=await renderEpisode(j,profile,1,j.root,{width:720,height:1280});j.status='ready';j.progress=100;record(j,'MP4 de prueba de 8 segundos generado y verificado. Audio: tono de prueba. No hubo llamadas a IA.');}catch(e){j.status='failed';j.error=e.message;record(j,j.error);}finally{active.delete(j.id);store.saveJob(j);}})();return j;
}
const server=http.createServer(async(req,res)=>{try{
  if(req.headers.host!==`127.0.0.1:${port}`){json(res,403,{error:'Host no permitido.'});return;}
  const url=new URL(req.url,origin);
  if(req.method==='GET'&&['/','/app.js','/style.css','/theme.css'].includes(url.pathname)){
    const filename={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/theme.css':'theme.css'}[url.pathname];res.writeHead(200,{'Content-Type':filename.endsWith('.js')?'text/javascript; charset=utf-8':filename.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Set-Cookie':`studio_session=${session}; HttpOnly; SameSite=Strict; Path=/`,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'});res.end(await readFile(path.join(here,'public',filename)));return;
  }
  if(!req.headers.cookie?.split(';').some(x=>x.trim()===`studio_session=${session}`)){json(res,401,{error:'Abre el estudio en este equipo para iniciar la sesión local.'});return;}
  if(req.method==='POST'&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))){json(res,403,{error:'Origen no permitido.'});return;}
  if(req.method==='GET'&&url.pathname==='/api/runtime'){json(res,200,{revision:runningRevision,active:active.size||Number(admitting)});return;}
  if(req.method==='POST'&&url.pathname==='/api/restart'){if(active.size||admitting)throw new Error('Hay una producción en curso. Termínala o páusala antes de actualizar.');json(res,200,{restarting:true});server.close(()=>process.exit(0));return;}
  if(req.method==='GET'&&url.pathname==='/api/state'){json(res,200,await state());return;}
  if(req.method==='GET'&&url.pathname==='/api/volumes'){let names=[];try{names=await readdir('/Volumes');}catch{}json(res,200,{volumes:await Promise.all(names.filter(n=>n!=='Recovery').map(n=>storageStatus(path.join('/Volumes',n))))});return;}
  if(req.method==='GET'&&url.pathname.startsWith('/api/jobs/')){const id=url.pathname.split('/')[3],j=store.getJob(id);json(res,200,{...j,pauseRequested:pauses.has(j.id),audio:Object.fromEntries(Object.entries(j.audio).map(([k,a])=>[k,{duration:a.duration,voiceId:a.voiceId,model:a.model}])),root:j.root});return;}
  if(req.method==='GET'&&url.pathname.startsWith('/image/')){const [, ,id,n]=url.pathname.split('/'),v=store.getJob(id).videos[n];if(!v?.image)throw new Error('Imagen no encontrada.');await access(v.image);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});createReadStream(v.image).pipe(res);return;}
  if(req.method==='GET'&&url.pathname.startsWith('/video/')){const [, ,id,n]=url.pathname.split('/'),j=store.getJob(id),v=j.videos[n];if(!v)throw new Error('Video no encontrado.');const info=await stat(v.file),range=req.headers.range;const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-store'};if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416);res.end();return;}const start=Number(match[1]),end=Math.min(Number(match[2]||info.size-1),info.size-1);if(start>end){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${info.size}`});createReadStream(v.file,{start,end}).pipe(res);}else{res.writeHead(200,{...headers,'Content-Length':info.size});createReadStream(v.file).pipe(res);}return;}
  if(req.method==='POST'){
    const data=await body(req);
    if(url.pathname==='/api/profiles')store.addProfile(data);
    else if(url.pathname==='/api/jobs'){if(data.style==='static'&&usesExactText(data)){if(data.staticDesign==='romantic-note')romanticNote(data.staticText);else letterOverlay(data.staticText);}store.addJob(data);}
    else if(url.pathname==='/api/settings'){
      const config=z.object({storageRoot:z.string().min(1).max(1000),voiceModel:z.enum(['eleven_flash_v2_5','eleven_multilingual_v2']),monthlyCredits:z.number().int().min(100).max(30000),monthlyTextTokens:z.number().int().min(1000).max(100000000).default(500000),n8nUrl:z.union([z.literal(''),z.string().url()]),useN8n:z.boolean().default(true)}).parse(data);
      if(active.size)throw new Error('Espera a que termine el trabajo antes de cambiar la configuración.');
      if(config.n8nUrl){const u=new URL(config.n8nUrl);if(u.protocol!=='https:'||u.hostname!=='n8n.planifyx.com')throw new Error('Usa la URL HTTPS de tu instancia n8n.planifyx.com.');}
      const selected=path.resolve(config.storageRoot);if(selected===path.parse(selected).root)throw new Error('Selecciona una carpeta de biblioteca, no la raíz del disco.');await access(path.dirname(selected));await mkdir(selected,{recursive:true});config.storageRoot=await requireStorage(selected);store.saveSettings(config,data.secrets||{});
    }
    else if(url.pathname==='/api/pricing'){
      const pricing=z.object({voicePerThousand:z.number().min(0).max(10000).nullable(),inputPerMillion:z.number().min(0).max(10000).nullable(),outputPerMillion:z.number().min(0).max(10000).nullable(),creditsPerCharacter:z.number().min(0.01).max(100),wordsPerMinute:z.number().min(60).max(250),charactersPerWord:z.number().min(2).max(15)}).parse(data);store.saveSettings({pricing});
    }
    else if(url.pathname==='/api/sync-credits'){
      const key=store.secrets().elevenKey;if(!key)throw new Error('Configura la clave de ElevenLabs.');
      const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000),redirect:'error'});
      if(!r.ok)throw new Error(`No se pudo consultar el saldo de ElevenLabs (${r.status}). Revisa el permiso de lectura de la clave.`);
      const b=await r.json();if(!Number.isFinite(b.character_count)||!Number.isFinite(b.character_limit))throw new Error('El proveedor no devolvió un saldo válido.');
      store.saveSettings({elevenSubscription:{used:b.character_count,limit:b.character_limit,reset:b.next_character_count_reset_unix||null,at:new Date().toISOString()}});
    }
    else if(url.pathname==='/api/pairing-token'){let token=store.secrets().n8nToken;if(!token){token=randomBytes(32).toString('hex');store.saveSettings({},{n8nToken:token});}json(res,200,{token});return;}
    else if(url.pathname==='/api/voices'){
      const key=store.secrets().elevenKey;if(!key)throw new Error('Guarda primero la clave de ElevenLabs.');
      const query=z.object({source:z.enum(['account','library']).default('library'),region:z.enum(['all','latam','es-MX','es-CO','es-AR','es-CL','es-PE','es-ES']).default('latam'),search:z.string().max(200).default(''),page:z.number().int().min(0).max(10000).default(0),cursor:z.string().max(2000).default('')}).parse(data);
      json(res,200,await listVoices(key,query));return;
    }
    else if(url.pathname==='/api/profile-voice'){
      const p=store.list('profiles').find(p=>p.id===data.id);if(!p)throw new Error('Perfil no encontrado.');
      let voiceId=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).parse(data.voiceId),voiceName=z.string().max(500).default('').parse(data.voiceName);
      if(data.source==='library'){
        const ownerId=z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).parse(data.ownerId),key=store.secrets().elevenKey;
        if(!key)throw new Error('Guarda primero la clave de ElevenLabs.');
        const chosen=await resolveLibraryVoice(key,{voiceId,ownerId,name:voiceName});voiceId=chosen.id;voiceName=chosen.name;
      }
      store.assignVoice(p.id,voiceId,voiceName);
    }
    else if(url.pathname==='/api/music'){
      const name=z.string().trim().min(1).max(200).parse(data.name),encoded=z.string().max(24000000).parse(data.audio),match=/^data:audio\/[A-Za-z0-9.+-]+;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(encoded);if(!match)throw new Error('Carga una pista MP3 o WAV válida.');const root=await requireStorage(store.settings().storageRoot),folder=path.join(root,'music');await mkdir(folder,{recursive:true});const file=path.join(folder,randomUUID()+'.audio');await writeFile(file,Buffer.from(match[1],'base64'));
      try{const probe=JSON.parse(await processFile('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],folder)),duration=Number(probe.format?.duration);if(!Number.isFinite(duration)||duration<=0||duration>1800||!probe.streams.some(s=>s.codec_type==='audio')||probe.streams.some(s=>s.codec_type==='video'&&!s.disposition?.attached_pic))throw new Error('La pista debe contener solo audio y durar hasta 30 minutos.');const id=store.addMedia({kind:'music',file,name:path.basename(name),duration});json(res,200,{id,name,duration});return;}catch(e){await rm(file,{force:true});throw e;}
    }
    else if(url.pathname==='/api/media'){
      const kind=z.enum(['logo','reference','production']).parse(data.kind),image=z.string().max(24000000).parse(data.image),match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image);
      if(!match)throw new Error('Adjunta una imagen PNG, JPG o WebP.');
      const buffer=Buffer.from(match[2],'base64'),decoder=sharp(buffer,{limitInputPixels:40000000}),meta=await decoder.metadata();
      if(!['png','jpeg','webp'].includes(meta.format)||(kind==='logo'&&meta.format!=='png'))throw new Error('El logo debe ser un PNG válido. Para referencias usa PNG, JPG o WebP.');
      const root=await requireStorage(store.settings().storageRoot),folder=path.join(root,'assets');await mkdir(folder,{recursive:true});const file=path.join(folder,randomUUID()+'.png');
      await decoder.rotate().resize({width:kind==='logo'?800:1920,height:kind==='logo'?800:1920,fit:'inside',withoutEnlargement:true}).png().toFile(file);
      json(res,200,{id:store.addMedia({kind,file})});return;
    }
    else if(url.pathname==='/api/assets'){const p=store.list('profiles').find(p=>p.id===data.profileId);if(!p)throw new Error('Perfil no encontrado.');if((p.assets||[]).length>=30)throw new Error('Este perfil ya tiene 30 imágenes.');const image=z.string().max(24000000).parse(data.image),match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image);if(!match)throw new Error('Usa una imagen PNG, JPG o WebP.');const root=await requireStorage(p.assetsRoot||store.settings().storageRoot),folder=path.join(root,'assets');await mkdir(folder,{recursive:true});const buffer=Buffer.from(match[2],'base64'),decoder=sharp(buffer,{limitInputPixels:40000000}),metadata=await decoder.metadata();if(!['png','jpeg','webp'].includes(metadata.format))throw new Error('El archivo no es una imagen PNG, JPG o WebP válida.');const name=randomUUID()+'.png';await decoder.resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).png().toFile(path.join(folder,name));p.assets=[...(p.assets||[]),name];p.assetsRoot=root;store.db.prepare('UPDATE profiles SET data=? WHERE id=?').run(JSON.stringify(p),p.id);}
    else if(url.pathname==='/api/run'){
      if(admitting)throw new Error('Se está guardando otra solicitud. Intenta de nuevo en un momento.');admitting=true;
      try{const j=store.getJob(data.id);if(j.status==='ready')throw new Error('Este trabajo ya terminó.');if(active.has(j.id)||queue.current===j.id||queue.pending.includes(j.id))throw new Error('Este trabajo ya está en producción o en cola.');await preflight(j);
        if(needsReviewRecovery(j)){reopenReview(j);j.events.unshift({at:new Date().toISOString(),message:'Nueva ronda de recuperación iniciada con las observaciones pendientes. Se conservan ficha, plan y guiones.'});}
        j.error=null;j.status='queued';pauses.delete(j.id);record(j,'Añadida a la cola de producción.');queue.enqueue(j.id);
      }finally{admitting=false;}
    }
    else if(url.pathname==='/api/pause'){
      const j=store.getJob(data.id);if(j.status==='ready')throw new Error('Este trabajo ya terminó.');
      if(active.has(j.id)){pauses.add(j.id);record({...j},'Pausa solicitada; se aplicará al terminar la etapa en curso.');}
      else{queue.remove(j.id);pauses.delete(j.id);j.status='paused';record(j,'Pausada. Los avances se conservan y no bloquea las demás producciones.');}
    }
    else if(url.pathname==='/api/job-script'){
      const j=store.getJob(data.id);if(active.has(j.id)||queue.current===j.id||queue.pending.includes(j.id))throw new Error('Pausa este trabajo antes de editar el guion.');
      const episodes=z.array(z.object({number:z.number().int().min(1),scenes:z.array(z.object({number:z.number().int().min(1),text:z.string().trim().min(1).max(30000)})).min(1).max(40)})).min(1).max(25).parse(data.episodes);
      editScriptText(j,episodes);record(j,'Guion corregido y guardado. Al continuar se hará una revisión nueva antes de generar voz.');
    }
    else if(url.pathname==='/api/demo'){if(active.size||admitting||queue.pending.length||queue.current)throw new Error('Hay una exportación activa o en cola.');admitting=true;try{await demo();}finally{admitting=false;}}
    else throw new Error('Acción no encontrada.');
    json(res,200,await state());return;
  }
  json(res,404,{error:'Ruta no encontrada.'});
}catch(error){json(res,400,{error:error.issues?.[0]?.message||error.message||'No se pudo completar la operación.'});}});
server.listen(port,'127.0.0.1',()=>console.log(`Smart Studio: ${origin}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const id of active){const j=store.getJob(id);j.status='paused';j.error='El servicio se detuvo; revisa la etapa y reservas antes de continuar.';store.saveJob(j);}server.close(()=>process.exit(0));});
