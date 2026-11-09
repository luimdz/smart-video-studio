import {setTimeout as sleep} from 'node:timers/promises';
export async function requestGeneration(store,job,baseId,amount,request,{wait=sleep,onRetry=()=>{}}={}){
 for(let attempt=0;attempt<3;attempt++){
  const charge=store.reserve(job.id,'text',amount,store.settings().monthlyTextTokens??500000,store.generationCharge(baseId));
  // Network failures/timeouts leave the reservation pending: their outcome is unknown.
  const response=await request();
  if(response.ok)return {response,charge};
  const status=response.status;
  const failure=typeof response.json==='function'?await response.json().catch(()=>null):null;
  const details=failure?.error?{code:failure.error.code,status:failure.error.status,message:String(failure.error.message||'').replace(/AIza[0-9A-Za-z_-]{20,}/g,'[clave oculta]').slice(0,2000),details:failure.error.details||[]}:null;
  if([400,401,403,404,422,429,503].includes(status))store.rejectGeneration(charge,status,details);
  if(status===503){
   if(attempt<2){const delay=(attempt?5000:2000)+Math.floor(Math.random()*500);await onRetry({attempt:attempt+2,delay});await wait(delay);continue;}
   throw new Error('Gemini está temporalmente saturado o no disponible (503). Se intentó 3 veces. Tus avances están guardados; espera unos minutos y pulsa Producir para continuar.');
  }
  const messages={400:'Gemini rechazó el formato o la configuración de la solicitud (400).',401:'Gemini no pudo autenticar la clave (401).',403:'Gemini rechazó el acceso (403). Revisa permisos o restricciones de la cuenta.',404:'Gemini no encontró el modelo configurado (404).',422:'Gemini rechazó el contenido de la solicitud (422).',429:'Gemini alcanzó una cuota o límite de solicitudes (429). Espera y comprueba tu cuota.'};
  throw new Error(messages[status]||`Gemini devolvió un error del servicio (${status}). La llamada requiere revisión antes de repetir para evitar consumo duplicado.`);
 }
}
