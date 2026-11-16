// A sound belongs to a visible action, never to a cut or a periodic filler interval.
export function codeArtSoundEvents(shots,words,limit,{enabled=true}={}){
 if(!enabled)return [];
 const candidates=[];
 for(const shot of shots){
  const put=e=>{if(e.t>=shot.from+.09&&e.t<Math.min(shot.to-.05,limit))candidates.push({...e,corta:Math.min(shot.to,limit)});};
  const travel=Math.hypot(...shot.cameraFrom.map((v,i)=>v-shot.cameraTo[i]));
  if(travel>4)put({sonido:'aire',t:shot.from+.15,ancla:'empieza',db:-17,vel:.7,que:'Desplazamiento amplio de cámara'});
  for(const o of shot.objects){
   const t=words[o.actionWord].inicio;
   const material={paper:'papel',ruler:'desliza',glass:'cristal',rock:'roca',phone:'toque',button:'aprieta',screenshot:'aviso'};
   const sound={arrive:material[o.kind]||'aire',reveal:material[o.kind]||'clic',press:o.kind==='button'?'aprieta':'toque',rise:'sube',fall:o.kind==='rock'?'roca':'golpe',impact:material[o.kind]||'golpe',burst:'estallido',grow:'empujon',shrink:'aprieta',pulse:o.kind==='star'?'late':'clic'}[o.action];
   if(!sound)continue;
   const offset=['press','impact','burst'].includes(o.action)?.4:.12;
   put({sonido:o.sound||sound,t:Math.max(shot.from+.1,t+offset),ancla:['press','impact','burst'].includes(o.action)?'golpe':'empieza',db:['impact','burst'].includes(o.action)?-12:-17,vel:1,que:`${o.action}: ${o.id}`});
  }
 }
 const events=[],last=new Map();
 for(const e of candidates.sort((a,b)=>a.t-b.t)){
  if((last.get(e.sonido)??-99)>e.t-.12)continue;
  last.set(e.sonido,e.t);events.push(e);
 }
 return events;
}
