// One worker; a rejected job never prevents the next queued job from running.
export function createProductionQueue({run,onError=()=>{}}){
 const pending=[];let current=null,pumping=false;
 async function pump(){if(pumping)return;pumping=true;try{while(pending.length){current=pending.shift();try{await run(current);}catch(error){try{await onError(current,error);}catch{}}finally{current=null;}}}finally{pumping=false;}}
 return {enqueue(id){if(current===id||pending.includes(id))return false;pending.push(id);queueMicrotask(pump);return true;},remove(id){const i=pending.indexOf(id);if(i<0)return false;pending.splice(i,1);return true;},get current(){return current;},get pending(){return [...pending];}};
}
