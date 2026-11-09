import {alignedWords} from './code-art-scene.mjs';
import {fileURLToPath} from 'node:url';
import {ensureCodeArt} from './code-art-resources.mjs';
import {narrationText,usesExactText,isPoster} from './content.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, statfs, realpath, access, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { sharp } from './deps.mjs';
export const escapeXml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const words=(s,width)=>{const lines=[];let line='';for(const w of String(s).split(/\s+/)){if((line+' '+w).length>width&&line){lines.push(line);line=w;}else line+=(line?' ':'')+w;}if(line)lines.push(line);return lines;};
export async function processFile(command,args,cwd){return await new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});let output='',error='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>error=(error+d).slice(-6000));p.on('error',reject);p.on('close',c=>c===0?resolve(output):reject(new Error(`${path.basename(command)} no completó la operación (${c}). ${error.slice(-500)}`)));});}
export async function storageStatus(root){if(!root)return {configured:false};try{const info=await statfs(root);return {configured:true,available:true,freeBytes:Number(info.bavail)*Number(info.bsize),root:await realpath(root)};}catch{return {configured:true,available:false,root};}}
export async function requireStorage(root){const info=await storageStatus(root);if(!info.available)throw new Error('La carpeta de producción no está disponible. Conecta el disco seleccionado.');if(info.freeBytes<3*1024**3)throw new Error('La biblioteca necesita al menos 3 GB libres para continuar.');return info.root;}
function captions(audio){const a=audio.alignment;if(!a)return [{text:audio.text,start:0,end:audio.duration}];const result=[];let start=0;for(let i=0;i<a.characters.length;i++){if((i-start>=75&&/\s|[.!?]/.test(a.characters[i]))||i===a.characters.length-1){result.push({text:a.characters.slice(start,i+1).join('').trim(),start:a.character_start_times_seconds[start],end:a.character_end_times_seconds[i]});start=i+1;}}for(let i=0;i<result.length;i++){result[i].start=i?result[i].start:0;result[i].end=i+1<result.length?result[i+1].start:audio.duration;}return result.filter(x=>x.end>x.start);}
export async function renderEpisode(j,profile,number,library,{width=1080,height=1920}={}){
  await requireStorage(library);const audio=j.audio[number];if(!audio)throw new Error('Falta la voz de este capítulo.');
  if(audio.duration>300)throw new Error('La voz supera el máximo de 300 segundos. Ajusta el guion antes de exportar.');
  const dir=path.join(library,'productions',j.id,`episode-${String(number).padStart(2,'0')}`);await mkdir(dir,{recursive:true});const temp=path.join(dir,'work');await mkdir(temp,{recursive:true});
  if(j.style==='2d')return renderCodeArtEpisode(j,profile,number,dir,{width,height});
  const poster=isPoster(j),generated=j.generatedImages?.[number]||[];if(!j.demo&&(poster||(!(j.productionImages?.length)&&!(j.useProfileImages&&profile.assets?.length)))&&!generated.length)throw new Error('Falta la imagen generada por IA. No se usará un dibujo local de reemplazo.');
  const backgrounds=j.useProfileImages?(profile.assets||[]):[];let base;
  const reference=generated[0]?.file||j.productionImages?.[0]?.file||(j.useReferenceBackground?j.referenceImages?.[0]?.file:null);
  if(reference||((j.style==='motion'||j.style==='static')&&backgrounds.length)){
    let input=reference;
    if(!input){const source=await requireStorage(profile.assetsRoot||library);input=path.resolve(source,'assets',backgrounds[(number-1)%backgrounds.length]);if(!input.startsWith(path.join(source,'assets')+path.sep))throw new Error('Recurso visual inválido.');}
    base=await sharp(await readFile(input),{limitInputPixels:40000000}).resize(1080,1920,{fit:poster?'contain':'cover',background:'#101827'}).png().toBuffer();
  }else if(poster)throw new Error('Falta la imagen de poesía generada por IA.');
  else base=await sharp(Buffer.from(motionSceneSvg(j,profile,number,0))).png().toBuffer();
  const logo=j.useLogo&&j.logo?await sharp(await readFile(j.logo.file),{limitInputPixels:40000000}).resize(180,140,{fit:'inside'}).png().toBuffer():null;
  const logoMeta=logo?await sharp(logo).metadata():null;
  let baseFile=path.join(temp,'background.png');await writeFile(baseFile,base);const imageFiles=generated.length?generated.map(x=>x.file):(j.productionImages||[]).map(x=>x.file);if(!imageFiles.length&&j.useReferenceBackground&&j.referenceImages?.length)imageFiles.push(...j.referenceImages.map(x=>x.file));if(j.useProfileImages)for(const file of backgrounds){const source=await requireStorage(profile.assetsRoot||library),input=path.resolve(source,'assets',file);if(!input.startsWith(path.join(source,'assets')+path.sep))throw new Error('Recurso visual inválido.');if(!imageFiles.includes(input))imageFiles.push(input);}
  const sceneTimeline=generated.length&&!poster?sceneRanges(audio,j.scripts[number-1]):null;
  const segments=poster?[{text:'',start:0,end:audio.duration}]:motionSegments(audio,imageFiles.length,sceneTimeline?.slice(1).map(s=>s.start)),parts=[],backgroundCache=new Map();
  for(let i=0;i<segments.length;i++){
    const segment=segments[i];
    if(j.style==='motion'&&!poster){
      const scenes=j.scripts[number-1]?.scenes||[],index=Math.min(Math.max(0,(imageFiles.length||scenes.length)-1),sceneTimeline?Math.max(0,sceneTimeline.findIndex(s=>segment.start>=s.start-.001&&segment.start<s.end)):Math.floor(segment.start/audio.duration*(imageFiles.length||scenes.length||1))),key=String(index);
      if(!backgroundCache.has(key)){const buffer=imageFiles.length?await sharp(await readFile(imageFiles[index]),{limitInputPixels:40000000}).rotate().resize(1080,1920,{fit:'cover'}).png().toBuffer():await sharp(Buffer.from(motionSceneSvg(j,profile,number,index))).png().toBuffer();const file=path.join(temp,`scene-${key}.png`);await writeFile(file,buffer);backgroundCache.set(key,file);}
      baseFile=backgroundCache.get(key);
    }
    const lines=words(segment.text,31).slice(0,4),boxHeight=lines.length*64+80;
    const overlay=poster?'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"></svg>':`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect x="56" y="${1690-boxHeight}" width="968" height="${boxHeight}" rx="30" fill="#07130e" fill-opacity=".9"/>${lines.map((text,k)=>`<text x="540" y="${1755-boxHeight+k*64}" text-anchor="middle" font-family="Arial" font-size="48" font-weight="bold" fill="#fff">${escapeXml(text)}</text>`).join('')}<rect x="56" y="1740" width="${Math.round(968*(i+1)/segments.length)}" height="6" rx="3" fill="${profile.color}"/></svg>`;
    const overlayFile=path.join(temp,`caption-${i}.png`);let frame=sharp(Buffer.from(overlay));if(logo)frame=frame.composite([{input:logo,left:1080-40-logoMeta.width,top:40}]);await frame.png().toFile(overlayFile);const part=path.join(temp,`part-${i}.mp4`);parts.push(part);
    await processFile('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',baseFile,'-loop','1','-framerate','30','-i',overlayFile,'-filter_complex',poster?(j.style==='motion'?`[0:v]zoompan=z='1+0.015*on/${Math.max(1,Math.ceil(audio.duration*30))}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30[bg];[bg][1:v]overlay=0:0,scale=${width}:${height},format=yuv420p[out]`:`[0:v][1:v]overlay=0:0,scale=${width}:${height},format=yuv420p[out]`):`[0:v]scale=1120:1992,crop=1080:1920:x='20+15*sin(t/4)':y='36+20*cos(t/4)'[bg];[bg][1:v]overlay=0:0,scale=${width}:${height},format=yuv420p[out]`,'-map','[out]','-t',String(segment.end-segment.start),'-an','-r','30','-c:v','libx264','-preset','ultrafast','-crf','22','-threads','2',part],dir);
  }
  let audioFile=audio.file;if(poster&&j.useMusic){if(!j.music?.file)throw new Error('Falta la pista instrumental seleccionada.');audioFile=path.join(temp,'mixed.m4a');const volume=(j.musicVolume??65)/100,fade=Math.min(2,audio.duration/3);const music=`[1:a]atrim=duration=${audio.duration},asetpts=PTS-STARTPTS,loudnorm=I=-20:TP=-2:LRA=9,volume=${volume*(j.narrationEnabled===false?1:.32)},afade=t=in:d=0.6,afade=t=out:st=${Math.max(0,audio.duration-fade)}:d=${fade}[music]`;await processFile('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',audio.file,'-stream_loop','-1','-i',j.music.file,'-filter_complex',`${music};[0:a]loudnorm=I=-18:TP=-2:LRA=9[voice];[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=.95:level=false[out]`,'-map','[out]','-t',String(audio.duration),'-c:a','aac','-b:a','192k',audioFile],dir);}
  if(poster){const poster=path.join(dir,'imagen.png');await sharp(baseFile).composite(logo?[{input:logo,left:1080-40-logoMeta.width,top:40}]:[]).png().toFile(poster);}
  const listing=path.join(temp,'segments.txt');await writeFile(listing,parts.map(p=>`file '${p.replace(/'/g,"'\\''")}'`).join('\n'));
  const pending=path.join(dir,'video.pending.mp4'),file=path.join(dir,'video.mp4');
  await processFile('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,'-i',audioFile,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-t',String(audio.duration),'-movflags','+faststart',pending],dir);
  const check=JSON.parse(await processFile('ffprobe',['-v','error','-show_format','-show_streams','-of','json',pending],dir));
  if(!check.streams.some(s=>s.codec_type==='audio')||!check.streams.some(s=>s.codec_type==='video'&&s.width===width&&s.height===height)||Math.abs(Number(check.format.duration)-audio.duration)>0.6)throw new Error('La comprobación del archivo exportado falló.');
  await rename(pending,file);await writeFile(path.join(dir,'script.json'),JSON.stringify(j.scripts[number-1],null,2));await writeFile(path.join(dir,'copy.txt'),`Título: ${j.scripts[number-1]?.title||j.title}\n\nFacebook\n${j.scripts[number-1]?.facebookCopy||''}\n\nInstagram\n${j.scripts[number-1]?.instagramCopy||''}`);await rm(temp,{recursive:true,force:true});
  return {file,...(poster?{image:path.join(dir,'imagen.png')}:{}),duration:Number(check.format.duration),bytes:Number(check.format.size),width,height,readyAt:new Date().toISOString()};
}

export function letterOverlay(text,name=''){
 const paragraphs=String(text).split('\n');let lines=[],size=46;
 for(;size>=18;size-=2){const width=Math.floor(840/(size*.65));lines=paragraphs.flatMap(p=>p.trim()?words(p.replace(new RegExp(`(\\S{${width}})(?=\\S)`,'gu'),'$1 '),width):['']);if(lines.length*size*1.45<=1260)break;}
 if(size<18)throw new Error('El texto es demasiado extenso para una lámina legible. Divídelo en varios videos o reduce el texto.');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect x="70" y="300" width="940" height="1380" rx="30" fill="#fffaf0" fill-opacity=".96"/><text x="80" y="110" font-family="Georgia" font-size="28" fill="#614b48">${escapeXml(String(name).slice(0,80))}</text>${lines.map((line,i)=>`<text x="120" y="${360+size+i*size*1.45}" font-family="Georgia" font-size="${size}" fill="#392f31">${escapeXml(line)}</text>`).join('')}</svg>`;
}

export function letterPaper(){return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#f5e8d5"/><stop offset="1" stop-color="#e9d4ca"/></linearGradient><radialGradient id="glow"><stop stop-color="#fffdf5" stop-opacity=".95"/><stop offset="1" stop-color="#f6e0c9" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#paper)"/><ellipse cx="280" cy="200" rx="650" ry="900" fill="url(#glow)"/><rect x="42" y="220" width="996" height="1530" rx="12" fill="none" stroke="#b58a77" stroke-opacity=".5"/><path d="M90 185Q180 100 220 185T350 185M730 1800Q810 1860 900 1800" fill="none" stroke="#b58a77" stroke-width="3"/><path d="M485 220Q450 190 470 175Q490 160 510 185Q530 160 550 175Q570 190 535 220L510 242Z" fill="#ae776c" opacity=".65"/></svg>`;}

export function motionSegments(audio,imageCount,sceneCuts=null){
 const segments=captions(audio);if(imageCount<2)return segments;
 return segments.flatMap(s=>{const cuts=[s.start,...(sceneCuts||Array.from({length:imageCount-1},(_,i)=>(i+1)*audio.duration/imageCount)).filter(t=>t>s.start&&t<s.end),s.end];return cuts.slice(0,-1).map((start,i)=>({...s,start,end:cuts[i+1]}));});
}
export function motionSceneSvg(j,profile,number,index){
 const forensic=/fotograf|criminal|forense|escenario/i.test(j.topic+' '+j.title),hue=190+(index*29)%110;
 const illustration=forensic?`<rect x="160" y="670" width="760" height="480" rx="70" fill="#132e45" stroke="#8ee8ed" stroke-width="7"/><path d="M300 670L350 575H600L650 670" fill="#284e65" stroke="#8ee8ed" stroke-width="7"/><circle cx="540" cy="910" r="180" fill="#071b30" stroke="#b2f1ef" stroke-width="14"/><circle cx="540" cy="910" r="115" fill="hsl(${hue},65%,30%)" stroke="#4acddd" stroke-width="6"/><circle cx="505" cy="870" r="45" fill="#caf6ff" opacity=".5"/><rect x="730" y="730" width="100" height="45" rx="12" fill="#ffe4a4"/><path d="M100 1200L200 1035L300 1200Z" fill="#f2cf79"/><text x="200" y="1160" text-anchor="middle" font-family="Arial" font-size="65" fill="#20313f">${index+1}</text><path d="M100 400H260M100 400V550M820 400H980V550M100 1250V1400H260M820 1400H980V1250" fill="none" stroke="#90c8d7" stroke-width="7"/>`:`<circle cx="540" cy="890" r="280" fill="hsl(${hue},50%,27%)"/><path d="M270 940L440 720L620 850L810 610" fill="none" stroke="#b0f1ed" stroke-width="25" stroke-linecap="round"/><circle cx="270" cy="940" r="34" fill="#ffe4a4"/><circle cx="440" cy="720" r="34" fill="#ffe4a4"/><circle cx="620" cy="850" r="34" fill="#ffe4a4"/><circle cx="810" cy="610" r="34" fill="#ffe4a4"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#102335"/><stop offset="1" stop-color="hsl(${hue},40%,14%)"/></linearGradient><pattern id="grid" width="70" height="70" patternUnits="userSpaceOnUse"><path d="M70 0H0V70" fill="none" stroke="#b5e6ef" stroke-opacity=".08"/></pattern></defs><rect width="1080" height="1920" fill="url(#bg)"/><rect width="1080" height="1920" fill="url(#grid)"/><text x="76" y="110" font-family="Arial" font-size="26" fill="#b2d3df">${escapeXml(profile.name.slice(0,40))}</text><text x="76" y="240" font-family="Arial" font-size="42" font-weight="bold" fill="#e2f6f6">${forensic?'REGISTRO VISUAL':'IDEAS EN MOVIMIENTO'}</text><text x="76" y="320" font-family="Arial" font-size="25" fill="#81c3cf">${String(index+1).padStart(2,'0')} / ${String(j.scripts[number-1]?.scenes.length||1).padStart(2,'0')}</text>${illustration}</svg>`;
}

async function renderCodeArtEpisode(j,profile,number,dir,{width,height}){
 await ensureCodeArt();const plan=j.codeArtPlans?.[number];if(!plan)throw new Error('Falta la planificación visual CODE ART. Se conserva la voz para continuar sin generarla otra vez.');
 const pending=path.join(dir,'video.pending.mp4'),file=path.join(dir,'video.mp4'),config=path.join(dir,'code-art.json');
 await writeFile(config,JSON.stringify({plan,script:j.scripts[number-1],audio:j.audio[number],coverTitle:j.scripts[number-1]?.coverTitle||j.title,profile:{name:profile.name,color:profile.color},logo:j.useLogo?j.logo:null,dir,output:pending,width,height,fps:60}));
 await processFile(process.execPath,[fileURLToPath(new URL('./code-art-render.mjs',import.meta.url)),config],dir);
 const check=JSON.parse(await processFile('ffprobe',['-v','error','-show_format','-show_streams','-of','json',pending],dir));
 if(!check.streams.some(s=>s.codec_type==='audio')||!check.streams.some(s=>s.codec_type==='video'&&s.width===width&&s.height===height&&s.r_frame_rate==='60/1')||Math.abs(Number(check.format.duration)-j.audio[number].duration)>.6)throw new Error('La comprobación del video CODE ART falló.');
 await rename(pending,file);await writeFile(path.join(dir,'script.json'),JSON.stringify(j.scripts[number-1],null,2));await writeFile(path.join(dir,'copy.txt'),`Título: ${j.scripts[number-1].title}\n\nFacebook\n${j.scripts[number-1].facebookCopy}\n\nInstagram\n${j.scripts[number-1].instagramCopy}`);
 return {file,duration:Number(check.format.duration),bytes:Number(check.format.size),width,height,fps:60,renderer:'code-art',readyAt:new Date().toISOString()};
}

export function sceneRanges(audio,script){const words=alignedWords(audio);let cursor=0;return script.scenes.map((scene,i)=>{const start=i?words[cursor]?.inicio??audio.duration:0;cursor+=[scene.narration,...scene.dialogue.map(d=>d.text)].join(' ').trim().split(/\s+/).filter(Boolean).length;return {start,end:i===script.scenes.length-1?audio.duration:words[cursor]?.inicio??audio.duration};});}
