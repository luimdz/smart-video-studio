import {codeArtSoundEvents} from './code-art-sound.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {spawn} from 'node:child_process';import {once} from 'node:events';import path from 'node:path';
import {codeArtUrl} from './code-art-resources.mjs';
import {createCodeArtFrames} from './code-art-frame.mjs';
const input=JSON.parse(await readFile(process.argv[2],'utf8')),frames=await createCodeArtFrames(input),fps=input.fps||60,width=input.width||1080,height=input.height||1920,limit=input.until||input.audio.duration;
await mkdir(input.dir,{recursive:true});
for(const t of frames.shots.map(s=>Math.min(limit-.01,(s.from+s.to)/2)).filter(t=>t>=0&&t<limit))await writeFile(path.join(input.dir,`revision-${t.toFixed(2)}.jpg`),frames.draw(t).toBuffer('image/jpeg'));
const [{mezclar,huecos},{leerAudio,escribirWav}]=await Promise.all([import(codeArtUrl('motor/lib/mezcla.mjs')),import(codeArtUrl('motor/lib/comun.mjs'))]);
const events=codeArtSoundEvents(frames.shots,frames.words,limit);
const voice=leerAudio(input.audio.file),{pista,usados}=mezclar(events,voice),effects=path.join(input.dir,'effects.wav');escribirWav(effects,pista);
await writeFile(path.join(input.dir,'sound-review.json'),JSON.stringify({events:usados,gaps:huecos(pista,2)},null,2));
const {titular,legible}=await import(codeArtUrl('motor/lib/rotulos.mjs'));
const coverTitle=String(input.coverTitle||input.profile?.name||'').split(/\s+/).slice(0,9).join(' '),accent=legible(input.profile?.color||'#FF3B30','#28163C',4.5);
await mkdir(path.join(input.dir,'portadas'),{recursive:true});
for(const [i,t] of [Math.min(2,limit*.5),limit*.5,limit*.7].entries()){
 const canvas=frames.draw(t,{captions:false}),ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,850);gradient.addColorStop(0,'#28163C');gradient.addColorStop(.7,'#28163C');gradient.addColorStop(1,'rgba(40,22,60,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,850);titular(ctx,coverTitle,{x:480,y0:290,ancho:800,tam:140,maxLineas:3,modo:'color',acento:accent.color});const buffer=canvas.toBuffer('image/jpeg');await writeFile(path.join(input.dir,'portadas',`portada-${i+1}.jpg`),buffer);if(i===0)await writeFile(path.join(input.dir,'flyer.jpg'),buffer);
}
await writeFile(path.join(input.dir,'cover-review.json'),JSON.stringify({accent,selected:1,title:coverTitle}));
const p=spawn('ffmpeg'  ,['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s','1080x1920','-r',String(fps),'-i','-','-i',input.audio.file,'-i',effects,'-filter_complex','[1:a][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-21:TP=-1:LRA=11[a]','-map','0:v:0','-map','[a]','-vf',`scale=${width}:${height},format=yuv420p`,'-c:v','libx264','-preset','veryfast','-crf','18','-threads','2','-c:a','aac','-b:a','192k','-t',String(limit),'-movflags','+faststart',input.output],{stdio:['pipe','ignore','pipe']});
let error='';p.stderr.on('data',d=>error=(error+d).slice(-3000));const done=once(p,'close');let failed=null;p.stdin.on('error',e=>{failed=e;});
for(let i=0;i<Math.ceil(limit*fps);i++){if(failed)throw failed;const pixels=Buffer.from(frames.draw(i/fps).data());if(!p.stdin.write(pixels))await once(p.stdin,'drain');}
p.stdin.end();const [code]=await done;if(code!==0)throw Error(error);console.log('CODE ART: '+input.output);
