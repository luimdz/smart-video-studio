import {nextVisualRecovery} from './code-art-recovery.mjs';
import {buildCodeArtRequest} from './code-art-plan-request.mjs';
import {codeArtKinds,codeArtGenerationSchema,validateCodeArtPlan,alignedWords} from './code-art-scene.mjs';
import {generationPrompt,generationSystem} from './generation-context.mjs';
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
  try{codeArtGenerationSchema(codeArtKinds(script)).parse({...job.codeArtPlans[number],unsupported:[]});validateCodeArtPlan(job.codeArtPlans[number],words,audio.duration);return {required:0,approximate,episode:number,cached:true};}catch{/* Estimate the recovery request instead of getting stuck on the saved schema. */}
 }
 const request=await buildCodeArtRequest({...job,audio:{...job.audio,[number]:audio}},number,options);
 const next=nextVisualRecovery(store,{...job,audio:{...job.audio,[number]:audio}},number,request);
 if(next.plan)return {required:0,approximate,episode:number,cached:true};
 const prompt=next.prompt;
 const schema=generationSchema(z.toJSONSchema(request.schema),{arrayBounds:true}),provider=store.settings().textProvider||'gemini';
 return {...textReservation({system:generationSystem,prompt:generationPrompt(prompt),schema:provider==='openai'?strictSchema(schema):schema,maxOutputTokens:request.maxOutputTokens,images:[]},provider),approximate,episode:number,cached:false};
}
export async function checkCodeArtBudget(store,job,number,options={}){
 const estimate=await codeArtBudget(store,job,number,options);if(estimate?.required)store.assertTextBudget(estimate.required);return estimate;
}
