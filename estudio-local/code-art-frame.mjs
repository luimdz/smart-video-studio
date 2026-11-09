import {createCanvas,loadImage} from '@napi-rs/canvas';
import {ensureCodeArt,codeArtUrl} from './code-art-resources.mjs';
import {alignedWords,validateCodeArtPlan,composeCodeArtPlan,codeArtKinds} from './code-art-scene.mjs';
export async function createCodeArtFrames(input){
 await ensureCodeArt();const [k,pieces,phone,subs]=await Promise.all([import(codeArtUrl('motor/kit/index.js')),import(codeArtUrl('piezas/objetos.js')),import(codeArtUrl('piezas/celular.js')),import(codeArtUrl('motor/lib/subtitulos.mjs'))]);
 const words=alignedWords(input.audio),plan=validateCodeArtPlan(composeCodeArtPlan(input.plan,{evidence:input.script?codeArtKinds(input.script).includes('evidence'):false}),words,input.audio.duration),blocks=subs.bloques(words,input.audio.duration),canvas=createCanvas(1080,1920),g=canvas.getContext('2d');
 const logo=input.logo?await loadImage(input.logo.file):null;
 const shots=plan.shots.map((s,i)=>({...s,from:i?Math.max(0,words[s.startWord].inicio-.04):0,to:i+1<plan.shots.length?words[plan.shots[i+1].startWord].inicio-.04:input.audio.duration}));
 const evidenceNumbers=new Map([...new Set(shots.flatMap(s=>s.objects.filter(o=>o.kind==='evidence').map(o=>o.id)))].map((id,i)=>[id,i+1]));
 function cameraBody(g,size,t){
  g.save();const body=g.createLinearGradient(-size,-size,size,size);body.addColorStop(0,'#586b80');body.addColorStop(.35,'#1b293c');body.addColorStop(1,'#070e1d');k.redondo(g,-size*1.25,-size*.72,size*2.5,size*1.5,size*.15);g.fillStyle=body;g.fill();g.save();g.clip();g.globalAlpha=.12;g.globalCompositeOperation='multiply';g.drawImage(k.red2,-size*1.5,-size,size*3,size*2);g.restore();g.strokeStyle='#91a4bd';g.lineWidth=size*.025;g.stroke();k.redondo(g,-size*.8,-size*.98,size*.9,size*.35,size*.06);k.metal(g,-size*.8,size*.1);k.redondo(g,size*.55,-size*.6,size*.45,size*.22,size*.02);g.fillStyle='#d9e3ee';g.fill();
  for(let ring=0;ring<5;ring++){const radius=size*(.78-ring*.075);g.beginPath();g.arc(0,0,radius,0,Math.PI*2);const grad=g.createLinearGradient(-radius,-radius,radius,radius);grad.addColorStop(0,ring%2?'#b8c7db':'#40566f');grad.addColorStop(.5,'#101a2c');grad.addColorStop(1,'#516782');g.fillStyle=grad;g.fill();}
  const lens=g.createRadialGradient(-size*.14,-size*.16,0,0,0,size*.44);lens.addColorStop(0,'#52d2e1');lens.addColorStop(.3,'#176e8f');lens.addColorStop(.75,'#172851');lens.addColorStop(1,'#060d1c');g.beginPath();g.arc(0,0,size*.43,0,Math.PI*2);g.fillStyle=lens;g.fill();g.beginPath();g.ellipse(-size*.12,-size*.15,size*.23,size*.07,-.65,0,Math.PI*2);g.fillStyle='rgba(240,252,255,.5)';g.fill();g.restore();
 }
 function drawObject(o,cam,t,shot){
  const actionTime=words[o.actionWord].inicio;if(o.action==='reveal'&&t<actionTime)return;const u=k.suave(k.tramo(t,actionTime-.2,actionTime+.6)),position=[...o.position];if(o.action==='arrive')position[0]-=(1-u)*10;
  const P=k.proyecta(cam,position);if(!P)return;const radius=k.F*o.size/P.z,pulse=o.action==='pulse'?1+.07*k.pulso(t,actionTime+.18,.3):1;
  g.save();
  if(o.kind==='floorplan'){
   const d=o.size,x=position[0],y=position[1]-1,z=position[2];
   const box=(dx,dy,dz,color)=>pieces.caja(g,cam,{x:dx.map(v=>x+v),y:dy.map(v=>y+v),z:dz.map(v=>z+v)},color,{bisel:1,brillo:.2,grano:.08});
   box([-d,d],[-.15,0],[-d,d],[167,143,113]);box([-d-.12,-d],[-.1,1.8],[-d,d],[215,209,197]);box([-d,d],[0,1.8],[-d-.12,-d],[193,204,211]);box([-d+.4,-d+1.5],[0,.6],[-d+.4,-d+2],[66,87,112]);
   const line=(points,color,width)=>{g.beginPath();points.forEach((point,i)=>{const p=k.proyecta(cam,[x+point[0],y+point[1],z+point[2]]);if(!p)return;if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);});g.strokeStyle=color;g.lineWidth=width;g.stroke();};
   line([[-d+.2,.04,d-.3],[d-.2,.04,d-.3]],'#eaf7ff',5);line([[-d+.2,.04,d-.6],[-d+.2,.04,d],[d-.2,.04,d],[d-.2,.04,d-.6]],'#55dae8',3);
   for(const [i,p]of [[-.7,.2],[1.3,-1.2]].entries()){const P=k.proyecta(cam,[x+p[0],y+.18,z+p[1]]);if(P){const r=48;g.beginPath();g.moveTo(P.x,P.y-r);g.lineTo(P.x+r*.7,P.y+r*.5);g.lineTo(P.x-r*.7,P.y+r*.5);g.closePath();g.fillStyle='#f5c35b';g.fill();g.strokeStyle='#fff0b4';g.lineWidth=3;g.stroke();g.fillStyle='#49351d';g.font='700 38px Figtree';g.textAlign='center';g.fillText(String(i+1),P.x,P.y+r*.25);}}
   line([[0,.07,0],[d-.2,.07,d-.3]],'#ff796a',4);g.restore();return;
  }
  if(o.kind==='box'){const d=o.size;pieces.caja(g,cam,{x:[position[0]-d,position[0]+d],y:[position[1]-d,position[1]+d],z:[position[2]-d,position[2]+d]},[parseInt(o.color.slice(1,3),16),parseInt(o.color.slice(3,5),16),parseInt(o.color.slice(5,7),16)],{bisel:1,brillo:.3,grano:.08});g.restore();return;}
  if(o.kind==='star'){k.estrella(g,['#ffffff',o.color,o.color,'#181e39','180,210,255'],P.x,P.y,radius,t*.08,o.action==='pulse'?k.pulso(t,actionTime+.2,.25):0);g.restore();return;}
  if(o.kind==='earth'){k.tierra(g,P.x,P.y,radius,t*.09);g.restore();return;}
  if(o.kind==='planet'){k.planeta(g,P.x,P.y,radius,t*.08,-.7,-.4);g.restore();return;}
  if(o.kind==='rock'){k.roca(g,P.x,P.y,radius,t*.07,2);g.restore();return;}
  if(o.kind==='phone'){phone.telefono(g,P.x,P.y,radius/500,0,c=>{const bg=c.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,o.color);bg.addColorStop(1,'#111b36');c.fillStyle=bg;c.fillRect(0,0,1080,1920);k.brillo(c,540,960,900,'cian',.6);});g.restore();return;}
  g.translate(P.x,P.y);g.scale(pulse,pulse);if(o.action==='rotate')g.rotate(.07*Math.sin((t-shot.from)*.35));g.shadowOffsetY=0;
  if(o.kind==='camera'){cameraBody(g,radius,t);if(t>=actionTime&&t<actionTime+.7)k.fogonazo(g,radius*.8,-radius*.5,t-actionTime,1200,'220,240,255');}
  else if(o.kind==='ruler'){k.redondo(g,-radius,-radius*.18,radius*2,radius*.36,8);k.metal(g,-radius,radius);g.strokeStyle='#243145';g.lineWidth=3;for(let i=0;i<=20;i++){const x=-radius+i*radius/10;g.beginPath();g.moveTo(x,-radius*.18);g.lineTo(x,-radius*.18+(i%5?radius*.11:radius*.22));g.stroke();}}
  else if(o.kind==='evidence'){g.beginPath();g.moveTo(0,-radius);g.lineTo(radius*.8,radius*.65);g.lineTo(-radius*.8,radius*.65);g.closePath();const grad=g.createLinearGradient(-radius,-radius,radius,radius);grad.addColorStop(0,'#ffe5a0');grad.addColorStop(1,'#d88621');g.fillStyle=grad;g.fill();g.strokeStyle='#fff0bd';g.lineWidth=5;g.stroke();g.fillStyle='#3e3020';g.font=`800 ${radius*.8}px Figtree`;g.textAlign='center';g.fillText(String(evidenceNumbers.get(o.id)),0,radius*.3);}
  else if(o.kind==='paper'){g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=45;g.shadowOffsetY=20;k.redondo(g,-radius*.8,-radius,radius*1.6,radius*2,12);const grad=g.createLinearGradient(-radius,-radius,radius,radius);grad.addColorStop(0,'#fff9dc');grad.addColorStop(1,'#d8c3a2');g.fillStyle=grad;g.fill();g.shadowBlur=0;g.strokeStyle='#b29a7e';g.lineWidth=2;for(let y=-radius*.55;y<radius*.75;y+=radius*.2){g.beginPath();g.moveTo(-radius*.5,y);g.lineTo(radius*.5,y);g.stroke();}}
  else if(o.kind==='glass'){g.beginPath();g.moveTo(-radius*.55,-radius);g.lineTo(radius*.55,-radius);g.lineTo(radius*.43,radius);g.quadraticCurveTo(0,radius*1.15,-radius*.43,radius);g.closePath();g.save();g.clip();g.fillStyle=o.color;g.globalAlpha=.6;g.fillRect(-radius, radius*(.6-.8*u),radius*2,radius*2);g.restore();k.vidrio(g,-radius*.55,radius*.55);}
  g.restore();
 }
 const stars=Array.from({length:400},(_,i)=>{const random=k.azar(i+19);return {x:random()*1080,y:random()*1920,r:.4+random()*2};});
 return {canvas,words,shots,draw(t,{captions=true}={}){
  const shot=shots.find(s=>t>=s.from&&t<s.to)||shots.at(-1),index=shots.indexOf(shot),u=k.suave(k.tramo(t,shot.from,Math.max(shot.from+.01,shot.to-.2))),from=shot.transition==='continue'&&index?shots[index-1].cameraTo:shot.cameraFrom,cam=k.mira(k.mezV(from,shot.cameraTo,u),shot.target);
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowBlur=0;g.filter='none';
  const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,shot.background);bg.addColorStop(1,'#080e20');g.fillStyle=bg;g.fillRect(0,0,1080,1920);k.brillo(g,180,700,1800,'cian',.2);k.brillo(g,1000,1400,1900,'violeta',.15);
  if(shot.world==='space'){g.fillStyle='#cfddfa';for(const star of stars){g.globalAlpha=.3+.4*(1+Math.sin(t*.2+star.x))/2;g.beginPath();g.arc(star.x,star.y,star.r,0,6.28);g.fill();}g.globalAlpha=1;}
  if(shot.world==='studio'){g.save();g.strokeStyle='rgba(131,191,236,.1)';g.lineWidth=1;for(let row=0;row<12;row++){const y=1200+row*row*6;g.beginPath();g.moveTo(0,y);g.lineTo(1080,y);g.stroke();}for(let x=-1400;x<2400;x+=220){g.beginPath();g.moveTo(540+(x-540)*.08,1200);g.lineTo(x,1920);g.stroke();}g.restore();}
  const objects=shot.objects.map(o=>({o,z:k.proyecta(cam,o.position)?.z||0})).sort((a,b)=>b.z-a.z);for(const {o} of objects)drawObject(o,cam,t,shot);
  if(captions)subs.dibujarSubtitulos(g,t,blocks,'arriba');
  if(logo){const scale=Math.min(180/logo.width,140/logo.height);g.drawImage(logo,1040-logo.width*scale,40,logo.width*scale,logo.height*scale);}
  return canvas;
 }};
}
