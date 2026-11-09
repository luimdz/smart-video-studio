// Sound follows a visible action, never a clock or a mandatory filler interval.
export function codeArtSoundEvents(shots,words,limit){
 const events=[],last=new Map();const put=e=>{if(e.t<0||e.t>=limit||(last.get(e.sonido)??-99)>e.t-2.5)return;events.push(e);last.set(e.sonido,e.t);};
 for(const shot of shots){const travel=Math.hypot(...shot.cameraFrom.map((v,i)=>v-shot.cameraTo[i]));if(travel>4)put({sonido:'aire',t:shot.from+.15,ancla:'empieza',db:-17,vel:.7,corta:shot.to,que:'Desplazamiento amplio de cámara'});
  for(const o of shot.objects){const t=words[o.actionWord].inicio;
   if(o.action==='arrive'){const material={paper:'papel',ruler:'desliza',glass:'cristal',rock:'roca'};put({sonido:material[o.kind]||'aire',t:Math.max(shot.from+.1,t-.1),ancla:'empieza',db:-16,vel:1,corta:shot.to,que:'Entrada visible de '+o.id});}
   if(o.action==='pulse'&&o.kind==='star')put({sonido:'late',t:t+.18,db:-17,corta:shot.to,que:'Latido de '+o.id});
   if(o.action==='reveal')put({sonido:o.kind==='paper'?'papel':o.kind==='glass'?'cristal':'clic',t:t+.1,db:-17,corta:shot.to,que:'Aparición de '+o.id});
  }
 }
 return events.sort((a,b)=>a.t-b.t);
}
