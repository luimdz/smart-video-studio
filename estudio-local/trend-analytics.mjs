import {z} from './deps.mjs';
const metric=z.object({profileId:z.string().uuid(),platform:z.enum(['instagram','facebook']),account:z.string().trim().min(1).max(100),url:z.string().url().max(2000),title:z.string().trim().min(3).max(200),views:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),publishedAt:z.string().datetime(),observedAt:z.string().datetime()});
export function initAnalytics(store){store.db.exec('CREATE TABLE IF NOT EXISTS reel_metrics(url TEXT PRIMARY KEY,data TEXT NOT NULL)');}
export function importMetrics(store,input,now=Date.now()){
 const rows=z.array(metric).min(1).max(1000).parse(input);
 for(const r of rows){const u=new URL(r.url),host=u.hostname.replace(/^www\./,'');if(u.protocol!=='https:'||u.username||u.password||!(r.platform==='instagram'?host==='instagram.com':host==='facebook.com'))throw new Error('Usa enlaces HTTPS de la red correspondiente.');if(!store.list('profiles').some(p=>p.id===r.profileId))throw new Error('Perfil no encontrado.');if(Date.parse(r.publishedAt)>Date.parse(r.observedAt)||Date.parse(r.observedAt)>now)throw new Error('Las fechas de las métricas no son válidas.');}
 const save=store.db.prepare('INSERT INTO reel_metrics VALUES(?,?) ON CONFLICT(url) DO UPDATE SET data=excluded.data');
 store.db.exec('BEGIN');try{for(const r of rows){const previous=store.db.prepare('SELECT data FROM reel_metrics WHERE url=?').get(r.url);if(previous&&JSON.parse(previous.data).profileId!==r.profileId)throw new Error('El enlace ya pertenece a otro perfil.');if(previous&&Date.parse(JSON.parse(previous.data).observedAt)>Date.parse(r.observedAt))continue;save.run(r.url,JSON.stringify(r));}store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
}
export function analytics(store,now=Date.now()){
 const rows=store.db.prepare('SELECT data FROM reel_metrics').all().map(r=>JSON.parse(r.data));
 return rows.map(r=>{
  const age=Date.parse(r.observedAt)-Date.parse(r.publishedAt);
  const peers=rows.filter(p=>p.url!==r.url&&p.profileId===r.profileId&&p.platform===r.platform&&p.account===r.account&&Math.abs(Date.parse(p.observedAt)-Date.parse(r.observedAt))<=7*86400000&&(Date.parse(p.observedAt)-Date.parse(p.publishedAt))>=age/2&&(Date.parse(p.observedAt)-Date.parse(p.publishedAt))<=age*2).map(p=>p.views).sort((a,b)=>a-b);
  const median=peers.length?(peers[Math.floor((peers.length-1)/2)]+peers[Math.floor(peers.length/2)])/2:null;
  const fresh=now-Date.parse(r.observedAt)<=7*86400000;
  return {...r,sample:peers.length,baseline:median,ratio:fresh&&peers.length>=5&&median>0?r.views/median:null,fresh};
 }).sort((a,b)=>(b.ratio??-1)-(a.ratio??-1));
}
