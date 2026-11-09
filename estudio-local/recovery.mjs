import {assertCreativeNarration,usesExactText} from './content.mjs';
export const needsReviewRecovery=j=>!j.reviewPassed&&(j.reviewPass>=3||!!j.reviewFindings?.length);
export function reopenReview(j,{correct=true}={}){
 if(Object.keys(j.audio||{}).length||Object.keys(j.videos||{}).length)throw Error('Este trabajo ya tiene voz o video. Conserva esta versión y crea otra para cambiar el guion.');
 const findings=j.reviewFindings?.length?j.reviewFindings:j.corrections||[];
 j.reviewHistory||=[];j.reviewHistory.push({cycle:j.reviewCycle||0,passes:j.reviewPass,findings:structuredClone(findings),at:new Date().toISOString()});
 j.reviewCycle=(j.reviewCycle||0)+1;j.reviewPass=0;j.reviewPassed=false;j.reviewFindings=[];j.corrections=correct?findings.filter(f=>f.episode<=j.scripts.length).map(f=>({...f})):[];j.error=null;
 return j;
}
export function editScriptText(j,episodes){
 if(Object.keys(j.audio||{}).length||Object.keys(j.videos||{}).length)throw Error('El guion ya tiene voz o video. Crea otra versión para modificarlo.');
 if(episodes.length!==j.scripts.length)throw Error('Debes conservar todos los capítulos del guion.');
 const scripts=structuredClone(j.scripts);
 for(const [i,episode]of episodes.entries()){if(episode.number!==scripts[i].number||episode.scenes.length!==scripts[i].scenes.length)throw Error('Debes conservar los capítulos y escenas existentes.');for(const [n,scene]of episode.scenes.entries()){if(scene.number!==scripts[i].scenes[n].number||!scene.text.trim())throw Error('Cada escena necesita su texto final.');scripts[i].scenes[n].narration=scene.text.trim();scripts[i].scenes[n].dialogue=[];}assertCreativeNarration(j,scripts[i]);}
 reopenReview(j,{correct:false});if(usesExactText(j))j.staticText=episodes[0].scenes.map(s=>s.text.trim()).join('\n\n');j.scripts=scripts;j.codeArtPlans={};j.status='paused';return j;
}
