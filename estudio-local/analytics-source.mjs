import {publisherUrl} from './publisher.mjs';
import {importMetrics} from './trend-analytics.mjs';
// Read-only connector. A source must return observed metrics, never AI estimates.
export function createAnalyticsSource(store,{fetcher=fetch,now=()=>Date.now()}={}){
 let busy=false;
 return {async sync(force=false){
  const c=store.settings(),token=store.secrets().analyticsToken;
  if(busy||!c.analyticsUrl||!token||(!force&&now()-Date.parse(c.analyticsLastAttempt||'1970-01-01')<6*3600000))return;
  busy=true;store.saveSettings({analyticsLastAttempt:new Date(now()).toISOString()});
  try{
   const response=await fetcher(publisherUrl(c.analyticsUrl),{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify({protocolVersion:1,action:'collect-metrics',profiles:store.list('profiles').map(p=>({id:p.id,instagram:p.instagram,facebook:p.facebook}))}),signal:AbortSignal.timeout(30000),redirect:'error'});
   if(!response.ok)throw Error('source');const data=await response.json();if(data.protocolVersion!==1||!Array.isArray(data.rows))throw Error('contract');
   if(data.rows.length)importMetrics(store,data.rows,now());
   store.saveSettings({analyticsLastSuccess:new Date(now()).toISOString(),analyticsSyncError:null});
  }catch{store.saveSettings({analyticsSyncError:'No se pudieron consultar métricas verificables. Revisa la fuente y sus permisos en n8n.'});}
  finally{busy=false;}
 }};
}
