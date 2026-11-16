import {buildCodeArtRequest} from './code-art-plan-request.mjs';
import {codeArtKinds,codeArtGenerationSchema,validateShotSubjects,validateCodeArtPlan,alignedWords} from './code-art-scene.mjs';
import {generationPrompt,generationSystem} from './generation-context.mjs';
import {parseGeneration} from './generation-response.mjs';
import {generationSchema} from './gemini-schema.mjs';
import {strictSchema} from './text-provider.mjs';
import {textReservation} from './text-budget.mjs';
import {narrationText} from './content.mjs';
import {z} from './deps.mjs';
export async function codeArtBudget(store,job,number,options={}){
 const script=job.scripts[number-1];if(!script||job.style!=='2d')return null;
 let audio=job.audio[number],approximate=false;
 if(!audio){
  approximate=true;const text=narrationText(job,script),characters=Array.from(text),duration=Math.min(300,job.duration*1.2);
  audio={text,duration,alignment:{characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*duration),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*duration)}};
 }
 const words=alignedWords(audio);
 if(job.codeArtPlans?.[number]&&job.codeArtPlanVersions?.[number]==='semantic-v6'){
  codeArtGenerationSchema(codeArtKinds(script)).parse({...job.codeArtPlans[number],unsupported:[]});validateCodeArtPlan(job.codeArtPlans[number],words,audio.duration);
  return {required:0,approximate,episode:number,cached:true};
 }
 const request=await buildCodeArtRequest({...job,audio:{...job.audio,[number]:audio}},number,options);
 const base=`${job.id}:text:code-art:${number}:v6`,cached=store.generationResponse(base);let prompt=request.prompt;
 if(cached){
  const plan=parseGeneration(cached,request.schema,'code-art');let error;
  try{if(plan.unsupported.length)throw Error('CODE ART necesita piezas para: '+plan.unsupported.join('; '));if(plan.shots.length!==request.windows.length||plan.shots.some((shot,i)=>shot.startWord!==request.windows[i].startWord))throw Error('El plan no respetó las ventanas de narración.');validateShotSubjects(plan,request.windows);validateCodeArtPlan(plan,request.words,audio.duration);}catch(e){error=e;}
  if(!error||store.generationResponse(base+':repair1'))return {required:0,approximate,episode:number,cached:true};
  prompt+=' Corrige este plan sin inventar objetos ni cambiar la narración. Error: '+error.message+'. Plan: '+JSON.stringify(plan);
 }
 const schema=generationSchema(z.toJSONSchema(request.schema)),provider=store.settings().textProvider||'gemini';
 return {...textReservation({system:generationSystem,prompt:generationPrompt(prompt),schema:provider==='openai'?strictSchema(schema):schema,maxOutputTokens:request.maxOutputTokens,images:[]},provider),approximate,episode:number,cached:false};
}
export async function checkCodeArtBudget(store,job,number,options={}){
 const estimate=await codeArtBudget(store,job,number,options);if(estimate?.required)store.assertTextBudget(estimate.required);return estimate;
}
