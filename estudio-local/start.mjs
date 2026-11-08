import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {revision} from './revision.mjs';
const origin='http://127.0.0.1:4317';
async function connect(){
 const home=await fetch(origin,{signal:AbortSignal.timeout(2000)});
 const cookie=home.headers.get('set-cookie')?.split(';')[0];
 const headers={Cookie:cookie||''};
 return {headers,response:await fetch(origin+'/api/runtime',{headers,signal:AbortSignal.timeout(2000)})};
}
try{
 let existing;
 try{existing=await connect();}catch(error){if(!['ECONNREFUSED'].includes(error.cause?.code))throw error;}
 if(existing){
  if(!existing.response.ok)throw new Error('Sigue abierto un motor antiguo. Cierra la ventana de Terminal que inició Smart Studio y vuelve a abrir este acceso.');
  const runtime=await existing.response.json();
  if(runtime.revision===await revision()){spawn('/usr/bin/open',[origin]);process.exit(0);}
  if(runtime.active)throw new Error('Hay una producción en curso. Termínala o páusala antes de abrir la versión actualizada.');
  const r=await fetch(origin+'/api/restart',{method:'POST',headers:{...existing.headers,Origin:origin,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(3000)});
  if(!r.ok)throw new Error('No se pudo actualizar el motor. Cierra su ventana de Terminal y vuelve a abrir Smart Studio.');
  for(let i=0;i<40;i++){try{await connect();await wait(100);}catch{break;}}
 }
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),stdio:'inherit'});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code||0;});
 for(let i=0;i<50;i++){await wait(100);try{const c=await connect();if(c.response.ok){const r=await c.response.json();if(r.revision===await revision()){spawn('/usr/bin/open',[origin]);break;}}}catch{}}
}catch(error){console.error('\n'+error.message+'\n');process.exitCode=1;}
