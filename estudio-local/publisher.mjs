import {openAsBlob} from 'node:fs';
import {stat} from 'node:fs/promises';
import {publications,savePublication} from './autopilot.mjs';

export function publisherUrl(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='n8n.planifyx.com'||u.username||u.password||u.hash)throw new Error('El publicador debe usar HTTPS en n8n.planifyx.com, sin credenciales en la URL.');return u.href;
}
// The connected workflow uploads to Meta. Only an actual platform receipt confirms publication.
export function createPublisher(store,{fetcher=fetch,now=()=>Date.now(),blob=openAsBlob}={}){
 let busy=false;
 return {async tick(){if(busy)return;busy=true;try{
  for(const item of publications(store)){
   if(!['scheduled','waiting_video','blocked'].includes(item.status))continue;
   if(Date.parse(item.at)>now())continue;
   if(now()-Date.parse(item.at)>15*60000){item.status='missed';item.error='Pasó la hora de publicación. Elige otra fecha; no se publicará fuera de horario.';savePublication(store,item);continue;}
   const job=store.getJob(item.jobId);if(job.status!=='ready'||!job.videos?.[item.episode])continue;
   const config=store.settings(),secrets=store.secrets();if(!config.publisherUrl||!secrets.publisherToken){item.status='blocked';item.error='Falta conectar el publicador.';savePublication(store,item);continue;}
   let url,video;
   try{url=publisherUrl(config.publisherUrl);video=job.videos[item.episode];const info=await stat(video.file);if(info.size>500*1024*1024)throw new Error('El video supera 500 MB.');}
   catch(error){item.status='blocked';item.error=error.message;savePublication(store,item);continue;}
   if(!item.destination){item.status='blocked';item.error='Falta un destino confirmado. Cancela esta entrada y crea una programación con el perfil configurado.';savePublication(store,item);continue;}
   const script=job.scripts[item.episode-1];
   const form=new FormData();form.set('manifest',JSON.stringify({protocolVersion:1,publicationId:item.id,productionId:job.id,episode:item.episode,platform:item.platform,profileId:job.profileId,destination:item.destination,scheduledAt:item.at,title:script?.title||job.title,caption:item.platform==='instagram'?script?.instagramCopy||'':script?.facebookCopy||''}));
   try{form.set('video',await blob(video.file,{type:'video/mp4'}),`reel-${item.episode}.mp4`);}catch{item.status='blocked';item.error='No se puede leer el video local.';savePublication(store,item);continue;}
   const latest=publications(store).find(p=>p.id===item.id);
   if(!latest||!['scheduled','waiting_video','blocked'].includes(latest.status)||latest.at!==item.at)continue;
   item.status='sending';item.error=null;savePublication(store,item);
   try{
    const response=await fetcher(url,{method:'POST',headers:{'X-Studio-Token':secrets.publisherToken,'Idempotency-Key':item.id},body:form,redirect:'error',signal:AbortSignal.timeout(120000)});
    const receipt=await response.json();
    if(!response.ok||receipt.protocolVersion!==1||receipt.publicationId!==item.id||receipt.platform!==item.platform||receipt.status!=='published'||typeof receipt.remoteId!=='string'||!receipt.remoteId.trim())throw new Error('El publicador no confirmó un ID de publicación de la red.');
    item.status='published';item.remoteId=receipt.remoteId;item.confirmedAt=new Date(now()).toISOString();
   }catch{item.status='uncertain';item.error='No se pudo confirmar la publicación. Revisa Instagram/Facebook y el publicador; no se repetirá el envío automáticamente.';}
   savePublication(store,item);
  }
 }finally{busy=false;}}};
}
