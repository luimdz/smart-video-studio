import {checkCodeArtBudget} from './code-art-budget.mjs';
import {parseGeneration} from './generation-response.mjs';
export {parseGeneration} from './generation-response.mjs';
import {generationSystem as system,generationPrompt} from './generation-context.mjs';
import {buildCodeArtRequest} from './code-art-plan-request.mjs';
import {readGuides} from './code-art-pack.mjs';
import {access} from 'node:fs/promises';
import {codeArtRoot} from './code-art-resources.mjs';
import {alignedWords,validateCodeArtPlan,codeArtKinds,codeArtGenerationSchema,validateShotSubjects} from './code-art-scene.mjs';
import {processFile} from './render.mjs';
import {usesExactText,narrationText,assertCreativeNarration,isPoster} from './content.mjs';
import {generationSchema} from './gemini-schema.mjs';
import {requestText} from './text-provider.mjs';
import { sharp, z } from './deps.mjs';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const character=z.object({id:z.string(),name:z.string(),appearance:z.string(),wardrobe:z.string(),personality:z.string(),voiceDirection:z.string()});
const bible=z.object({premise:z.string(),characters:z.array(character).min(1).max(6),worldRules:z.array(z.string()).min(1),locations:z.array(z.object({id:z.string(),name:z.string(),visualDescription:z.string()})).min(1),ending:z.string()});
const outline=z.object({episodes:z.array(z.object({number:z.number().int(),title:z.string(),objective:z.string(),conflict:z.string(),resolution:z.string(),nextHook:z.string()}))});
const script=z.object({number:z.number().int(),title:z.string(),scenes:z.array(z.object({number:z.number().int(),narration:z.string(),dialogue:z.array(z.object({characterId:z.string(),text:z.string()})),characterIds:z.array(z.string()),locationId:z.string(),visual:z.string()})).min(1).max(40),continuity:z.object({events:z.array(z.string()),pending:z.array(z.string()),characterKnowledge:z.array(z.object({characterId:z.string(),knows:z.array(z.string())}))}),facebookCopy:z.string(),instagramCopy:z.string(),tiktokCopy:z.string().default(''),youtubeCopy:z.string().default(''),pinnedComment:z.string().default(''),coverTitle:z.string()});
const review=z.object({issues:z.array(z.object({episode:z.number().int(),problem:z.string(),correction:z.string()})),seasonSummary:z.string()});
export const speechText=s=>s.scenes.map(x=>[x.narration,...x.dialogue.map(d=>d.text)].filter(Boolean).join(' ')).join('\n\n');

function references(s,j,n){const ids=new Set(j.bible.characters.map(c=>c.id)),places=new Set(j.bible.locations.map(c=>c.id));if(s.number!==n||s.scenes.some((x,i)=>x.number!==i+1||!places.has(x.locationId)||x.characterIds.some(id=>!ids.has(id))||x.dialogue.some(d=>!ids.has(d.characterId)))||s.continuity.characterKnowledge.some(x=>!ids.has(x.characterId)))throw new Error('El guion contiene referencias de continuidad inválidas.');}
export async function generate(store,j,prompt,schema,step,maxOutputTokens=8000,visionFiles=null){
 const baseId=`${j.id}:text:${step}`,cached=store.generationResponse(baseId);
 if(cached)return parseGeneration(cached,schema,step);
 const responseJsonSchema=generationSchema(z.toJSONSchema(schema));
 const images=await Promise.all((visionFiles||j.referenceImages||[]).map(async ref=>(await sharp(await readFile(ref.file),{limitInputPixels:40000000}).rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:75}).toBuffer()).toString('base64')));
 const body=await requestText(store,j,baseId,{system,prompt:generationPrompt(prompt),schema:responseJsonSchema,maxOutputTokens,images});
 return parseGeneration(body,schema,step);
}
export async function planningStep(store,j,action){
  const reviewKey=j.reviewCycle?`:cycle:${j.reviewCycle}`:'';
  const profile=store.list('profiles').find(p=>p.id===j.profileId);
  const editorialReferences=await readGuides(['guia/guion.md','aprendido.md','plantillas.md','packs/captions.md'],undefined,16000);
  const context=JSON.stringify({editorialReferences,title:j.title,topic:j.topic,type:j.type,episodes:j.episodes,durationSeconds:j.duration,style:j.style,contentFormat:j.contentFormat,staticDesign:j.staticDesign,narrationEnabled:j.narrationEnabled!==false,textMode:j.textMode||'generate',creativeInstructions:usesExactText(j)?undefined:j.staticText,exactText:usesExactText(j)?j.staticText:undefined,profile});
  if(action==='bible')j.bible=await generate(store,j,`Crea una ficha permanente. Esquema: {premise,characters:[{id,name,appearance,wardrobe,personality,voiceDirection}],worldRules:[string],locations:[{id,name,visualDescription}],ending}. Solo acciones sencillas para ilustración 2D por capas. Contexto: ${context}`,bible,'bible');
  if(action==='outline'){
    const o=await generate(store,j,`Planifica exactamente ${j.episodes} capítulos numerados desde 1. Esquema {episodes:[{number,title,objective,conflict,resolution,nextHook}]}. Cada capítulo aporta valor propio y el último cierra la temporada. Contexto ${context}. Ficha ${JSON.stringify(j.bible)}`,outline,'outline');
    if(o.episodes.length!==j.episodes||o.episodes.some((e,i)=>e.number!==i+1))throw new Error('El plan no contiene todos los capítulos en orden.');j.outline=o;
  }
  if(action==='script'||action==='correct'){
    const correction=action==='correct'?j.corrections[0]:null,n=correction?.episode??j.scripts.length+1;
    const contentRule=usesExactText(j)?'Usa exactText literalmente como narración, sin añadir diálogo.':'Crea contenido ORIGINAL dirigido a la audiencia. topic y creativeInstructions son indicaciones para ti, NO texto para leer. Transforma la intención en narración final; nunca copies frases del briefing como «la idea es transmitir» o «el mensaje debe». Para una carta, escribe con cercanía y termina con una frase memorable.';
    const artRule=j.style==='2d'?'CODE ART: ilustraciones grandes con materiales, luz, profundidad y movimiento motivado por la narración; cada escena muestra lo que dice. Sin presentador genérico ni diagramas planos. Español latinoamericano.':'';
    const instruction=`${artRule} Respeta profile.preferences, su variante profile.locale y añade profile.closingLine literalmente al cierre del contenido generado; no añadas el cierre si textMode es verbatim. Usa los usuarios de redes del perfil solo si están definidos. Devuelve {number,title,scenes:[{number,narration,dialogue:[{characterId,text}],characterIds:[string],locationId,visual}],continuity:{events:[string],pending:[string],characterKnowledge:[{characterId,knows:[string]}]},facebookCopy,instagramCopy,tiktokCopy,youtubeCopy,pinnedComment,coverTitle}. Referencias solo de la ficha. Escenas consecutivas; gancho concreto desde la primera frase, una idea visible por escena, comparación cotidiana, remate y cierre del perfil. Descripciones diferenciadas para Facebook, Instagram, TikTok y YouTube Shorts, sin prometer resultados ni inventar datos. TikTok breve; YouTube incluye título y #Shorts. ${isPoster(j)?'Una sola lámina fija con carta o poesía ORIGINAL; el texto final será visible y, si se activó, narrado. Máximo 90 palabras para legibilidad. Tono íntimo y natural, remate memorable, respeta la guía editorial del perfil. Si staticDesign=romantic-note no escribas el nombre de la marca dentro del poema y termina con 🌟. No describas decoración ni instrucciones dentro de la poesía.':''} ${contentRule} Aproximadamente ${Math.min(isPoster(j)?90:1000,Math.round(j.duration/60*140))} palabras en total. Capítulo ${n}.`;

    const s=await generate(store,j,`${instruction} Contexto ${context}. Ficha ${JSON.stringify(j.bible)}. Arco ${JSON.stringify(j.outline)}. Memoria ${JSON.stringify(j.scripts.map(s=>({number:s.number,continuity:s.continuity})))}. ${j.rejectedScript?'El intento anterior fue rechazado por estas observaciones: '+JSON.stringify(j.reviewFindings||j.reviewHistory?.at(-1)?.findings)+'. Reescribe este candidato: '+JSON.stringify(j.rejectedScript):''}. ${correction?'Corrige: '+JSON.stringify(correction)+'. Guion: '+JSON.stringify(j.scripts[n-1]):''}`,script,`${action}:${n}:${j.reviewPass}${reviewKey}`);
    try{references(s,j,n);assertCreativeNarration(j,s);}catch(error){j.reviewPassed=false;j.reviewFindings=[{episode:n,problem:error.message,correction:'Corrige el guion: solo palabras pronunciables en narration y dialogue.text; acciones en visual y referencias del canon válidas.'}];j.rejectedScript=s;throw error;}delete j.rejectedScript;if(correction){j.scripts[n-1]=s;j.corrections.shift();}else j.scripts.push(s);
  }
  if(action==='review'){
    if(j.type!=='series'&&isPoster(j)){
      if(j.scripts.length!==1||!j.scripts[0].scenes.length)throw new Error('Falta el guion de la lámina estática.');
      const script=j.scripts[0],scene=script.scenes[0];
      if(usesExactText(j))script.scenes=[{...scene,number:1,narration:j.staticText,dialogue:[]}];references(script,j,1);assertCreativeNarration(j,script);if(narrationText(j,script).split(/\s+/).length>180)throw new Error('El poema es demasiado extenso para una sola imagen legible. Divide el texto en varias publicaciones.');
      j.corrections=[];j.reviewPassed=true;j.reviewMode=usesExactText(j)?'original-static-text':'generated-static-text';j.seasonSummary='Lámina individual validada: estructura, legibilidad y texto final. No se aplica continuidad de temporada a una carta individual.';
      return j;
    }
    if(j.reviewPass>=3)throw new Error('La revisión agotó dos rondas de corrección y una verificación final. Hay observaciones pendientes que requieren revisar el guion.');
    const r=await generate(store,j,`Revisa ${j.type==='series'?'la continuidad de la temporada completa':'solo este video individual; no lo conviertas en una serie'}. Reporta únicamente contradicciones concretas, referencias inválidas, incumplimientos del objetivo solicitado o afirmaciones inventadas. Las preferencias estéticas y posibles expansiones no son errores. No exijas convertir elementos decorativos o de marca en protagonistas ni modificar el texto original del usuario. Esquema {issues:[{episode,problem,correction}],seasonSummary}. Revisa conocimientos, promesas y cierre. Ficha ${JSON.stringify(j.bible)}. Arco ${JSON.stringify(j.outline)}. Guiones ${JSON.stringify(j.scripts)}`,review,`review:${j.reviewPass}${reviewKey}`);
    j.reviewPass++;for(const x of r.issues)if(x.episode<1||x.episode>j.episodes)throw new Error('La revisión menciona un capítulo inexistente.');
    if(j.reviewPass===3&&r.issues.length){j.reviewFindings=r.issues;j.corrections=[];throw new Error('La verificación final mantiene observaciones: '+r.issues.map(x=>x.problem).join(' ').slice(0,1000));}
    const grouped=new Map();for(const x of r.issues){const old=grouped.get(x.episode);grouped.set(x.episode,old?{...x,correction:old.correction+'; '+x.correction}:x);}j.corrections=[...grouped.values()];j.reviewPassed=!r.issues.length;j.seasonSummary=r.seasonSummary;
  }
  return j;
}
export async function voiceStep(store,j,root,budgetOptions={}){
  const index=j.scripts.findIndex((_,i)=>!j.audio[i+1]),number=index+1,s=j.scripts[index];
  if(isPoster(j)&&j.narrationEnabled===false){const dir=path.join(root,'productions',j.id,`episode-${String(number).padStart(2,'0')}`);await mkdir(dir,{recursive:true});const file=path.join(dir,'sin-narracion.wav');await processFile('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t',String(j.duration),file],dir);j.audio[number]={file,duration:j.duration,text:narrationText(j,s),narrationEnabled:false,provider:null};return j;}
  const profile=store.list('profiles').find(p=>p.id===j.profileId),config=store.settings(),key=store.secrets().elevenKey;
  assertCreativeNarration(j,s);if(j.style==='2d'){const kinds=codeArtKinds(s);codeArtGenerationSchema(kinds);if(kinds.includes('screenshot')&&!j.productionImages?.length)throw new Error('Adjunta una captura real como imagen de producción antes de generar voz.');if(kinds.includes('button')){try{await access(path.join(codeArtRoot,'piezas/boton-comprar.js'));}catch{throw new Error('Importa el paquete CODE ART para habilitar el botón de compra antes de generar voz.');}}}
  if(!key||!profile.voiceId)throw new Error('Configura ElevenLabs y selecciona la voz del perfil.');
  const visibleText=narrationText(j,s),text=isPoster(j)&&j.staticDesign==='romantic-note'?visibleText.replace(/🌟/gu,''):visibleText,hash=createHash('sha256').update(JSON.stringify({voice:profile.voiceId,model:config.voiceModel,text})).digest('hex');
  const dir=path.join(root,'voices');await mkdir(dir,{recursive:true});const file=path.join(dir,hash+'.mp3'),manifest=path.join(dir,hash+'.json');
  try{const cached=JSON.parse(await readFile(manifest,'utf8'));await readFile(file);j.audio[number]={...cached,file};return j;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(j.style==='2d')await checkCodeArtBudget(store,j,number,budgetOptions);
  const charge=store.reserve(j.id,'voice',text.length,config.monthlyCredits,`${j.id}:voice:${number}:${hash}`);
  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':key},body:JSON.stringify({text,model_id:config.voiceModel}),signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!r.ok){if([400,401,403,404,422,429].includes(r.status))store.releaseRejected(charge);throw new Error(`ElevenLabs devolvió ${r.status}. Revisa la clave, permisos o cuota antes de continuar.`);}
  const reported=r.headers.get('character-cost'),credit=reported!==null&&Number.isFinite(Number(reported))&&Number(reported)>=0?Number(reported):null;
  store.recordConsumption(charge,j.id,{provider:'elevenlabs',model:config.voiceModel,episode:number,characters:text.length,credits:credit,estimatedCredits:text.length*(config.pricing?.creditsPerCharacter??(config.voiceModel==='eleven_flash_v2_5'?0.5:1))});
  const result=await r.json();if(!result.audio_base64||!result.alignment?.character_end_times_seconds?.length)throw new Error('ElevenLabs devolvió voz sin tiempos válidos.');
  const duration=result.alignment.character_end_times_seconds.at(-1);if(!Number.isFinite(duration)||duration<=0)throw new Error('Duración de voz inválida.');
  await writeFile(file,Buffer.from(result.audio_base64,'base64'));const meta={text,alignment:result.alignment,duration,voiceId:profile.voiceId,model:config.voiceModel};await writeFile(manifest,JSON.stringify(meta));store.settle(charge,credit);j.audio[number]={...meta,file};
  if(duration>j.duration*1.2)throw new Error('La voz supera la duración objetivo por más de 20 %. Se conservó para corregir sin repetir el cobro.');
  return j;
}

export async function codeArtPlanningStep(store,j,number,options={}){
 const words=alignedWords(j.audio[number]);if(j.codeArtPlans?.[number]&&j.codeArtPlanVersions?.[number]==='semantic-v6'){codeArtGenerationSchema(codeArtKinds(j.scripts[number-1])).parse({...j.codeArtPlans[number],unsupported:[]});validateCodeArtPlan(j.codeArtPlans[number],words,j.audio[number].duration);return j;}
 const {prompt,schema,windows,guideHash,maxOutputTokens}=await buildCodeArtRequest(j,number,options);
 let plan=await generate(store,j,prompt,schema,`code-art:${number}:v6`,maxOutputTokens,[]);
 const check=p=>{if(p.unsupported.length)throw new Error('CODE ART necesita piezas para: '+p.unsupported.join('; '));if(p.shots.length!==windows.length||p.shots.some((shot,i)=>shot.startWord!==windows[i].startWord))throw new Error('El plan no respetó las ventanas de narración.');validateShotSubjects(p,windows);validateCodeArtPlan(p,words,j.audio[number].duration);};
 try{check(plan);}catch(error){plan=await generate(store,j,prompt+' Corrige este plan sin inventar objetos ni cambiar la narración. Error: '+error.message+'. Plan: '+JSON.stringify(plan),schema,`code-art:${number}:v6:repair1`,maxOutputTokens,[]);check(plan);}
 j.codeArtGuideHash=guideHash;
 validateShotSubjects(plan,windows);validateCodeArtPlan(plan,words,j.audio[number].duration);j.codeArtPlans||={};j.codeArtPlans[number]=plan;j.codeArtPlanVersions||={};j.codeArtPlanVersions[number]='semantic-v6';store.saveJob(j);return j;
}
