import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from './deps.mjs';

export const profileSchema = z.object({ name: z.string().trim().min(2), niche: z.string().trim().min(2), audience: z.string().trim().min(2), brief: z.string().default(''), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#b5ed75'), voiceId: z.string().regex(/^[A-Za-z0-9_-]*$/).max(100).default('') });
export const jobSchema = z.object({ profileId: z.string().uuid(), title: z.string().trim().min(3).max(140), topic: z.string().trim().min(10).max(12000), type: z.enum(['video','series','vsl']), style: z.enum(['motion','2d','static']), useLogo:z.boolean().default(false),logoId:z.string().uuid().nullable().default(null),referenceIds:z.array(z.string().uuid()).max(20).default([]),useReferenceBackground:z.boolean().default(false),textMode:z.enum(['generate','verbatim']).default('generate'),staticText:z.string().default(''),productionIds:z.array(z.string().uuid()).max(20).default([]),useProfileImages:z.boolean().default(false), episodes: z.number().int().min(1).max(25), duration: z.number().int().min(30).max(300), maxCredits: z.number().int().min(100).max(30000), requestKey: z.string().uuid() }).superRefine((v,c)=>{
  if(v.textMode==='verbatim'&&!v.staticText.trim())c.addIssue({code:'custom',message:'Introduce el texto final para el modo literal.'});
  if(v.useLogo&&!v.logoId)c.addIssue({code:'custom',message:'Adjunta un logo PNG o desactiva la opción de logo.'});
  if(v.useReferenceBackground&&!v.referenceIds.length)c.addIssue({code:'custom',message:'Adjunta una imagen para usarla como fondo.'});
  if(v.type==='series'&&v.textMode==='verbatim'&&v.staticText.trim())c.addIssue({code:'custom',message:'En una serie, deja el texto estático vacío para crear un texto propio por capítulo.'});
  if(v.type==='series' && v.episodes<10)c.addIssue({code:'custom',message:'Una serie debe tener de 10 a 25 capítulos.'});
  if(v.type!=='series' && v.episodes!==1)c.addIssue({code:'custom',message:'Un video individual tiene un capítulo.'});
  if(v.type==='vsl' && v.duration<120)c.addIssue({code:'custom',message:'Una VSL debe durar entre 120 y 300 segundos.'});
});
export function nextAction(job) {
  if(!job.bible)return 'bible';
  if(!job.outline)return 'outline';
  if(job.scripts.length<job.episodes)return 'script';
  if(job.corrections?.length)return 'correct';
  if(!job.reviewPassed)return 'review';
  if(Object.keys(job.audio||{}).length<job.episodes)return 'voice';
  if(Object.keys(job.videos||{}).length<job.episodes)return 'render';
  return 'complete';
}
export function createStore(root) {
  mkdirSync(root,{recursive:true,mode:0o700});
  const db=new DatabaseSync(path.join(root,'studio.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS charges(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,period TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL);');
  db.exec('CREATE TABLE IF NOT EXISTS consumption(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,period TEXT NOT NULL,data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS generation_responses(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS generation_failures(id TEXT PRIMARY KEY,status INTEGER NOT NULL,reservation INTEGER NOT NULL,at TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS generation_error_details(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS charge_estimates(id TEXT PRIMARY KEY,amount INTEGER NOT NULL)');
  // Reconcile only confirmed provider usage; pending/unknown calls retain their reserves.
  for(const row of db.prepare('SELECT id,data FROM consumption').all()){
    const d=JSON.parse(row.data),actual=d.provider==='gemini'?d.usage?.totalTokenCount:d.credits;
    if(!Number.isFinite(actual)||actual<0)continue;
    const old=db.prepare("SELECT amount FROM charges WHERE id=? AND status='settled'").get(row.id);
    if(old){db.prepare('INSERT OR IGNORE INTO charge_estimates VALUES(?,?)').run(row.id,old.amount);db.prepare("UPDATE charges SET amount=? WHERE id=? AND status='settled'").run(Math.ceil(actual),row.id);}
  }
  const keyFile=path.join(root,'key');
  if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32),{mode:0o600});
  const key=readFileSync(keyFile);
  const period=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit'}).format(new Date());
  const list=table=>db.prepare(`SELECT data FROM ${table}`).all().map(r=>JSON.parse(r.data));
  const saveJob=job=>{job.updatedAt=new Date().toISOString();db.prepare('UPDATE jobs SET data=? WHERE id=?').run(JSON.stringify(job),job.id);return job;};
  const getJob=id=>{const row=db.prepare('SELECT data FROM jobs WHERE id=?').get(id);if(!row)throw new Error('Producción no encontrada.');return JSON.parse(row.data);};
  function settings(){const r=db.prepare("SELECT data FROM settings WHERE id='public'").get();return r?JSON.parse(r.data):{storageRoot:'',voiceModel:'eleven_flash_v2_5',geminiModel:'gemini-3.1-flash-lite',monthlyCredits:30000,n8nUrl:''};}
  function secrets(){const r=db.prepare("SELECT data FROM settings WHERE id='secrets'").get();if(!r)return {};const d=JSON.parse(r.data);const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(d.iv,'base64'));cipher.setAuthTag(Buffer.from(d.tag,'base64'));return JSON.parse(Buffer.concat([cipher.update(Buffer.from(d.value,'base64')),cipher.final()]).toString());}
  function saveSettings(config, incoming={}){
    const secretValues={...secrets()};for(const [k,v] of Object.entries(incoming))if(['geminiKey','elevenKey','n8nToken'].includes(k)&&typeof v==='string'&&v.trim())secretValues[k]=v.trim();
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const value=Buffer.concat([cipher.update(JSON.stringify(secretValues)),cipher.final()]);
    db.prepare("INSERT OR REPLACE INTO settings VALUES('public',?)").run(JSON.stringify({...settings(),...config}));
    db.prepare("INSERT OR REPLACE INTO settings VALUES('secrets',?)").run(JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),value:value.toString('base64')}));
  }
  return {db,list,settings,secrets,saveSettings,getJob,saveJob,
    addMedia(data){const id=randomUUID();db.prepare('INSERT INTO media VALUES(?,?)').run(id,JSON.stringify(data));return id;},
    assignVoice(id,voiceId,voiceName=''){const p=list('profiles').find(p=>p.id===id);if(!p)throw new Error('Perfil no encontrado.');p.voiceId=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).parse(voiceId);p.voiceName=z.string().max(500).parse(voiceName);db.prepare('UPDATE profiles SET data=? WHERE id=?').run(JSON.stringify(p),p.id);return p;},
    addProfile(input){const p={id:randomUUID(),...profileSchema.parse(input),createdAt:new Date().toISOString()};db.prepare('INSERT INTO profiles VALUES(?,?)').run(p.id,JSON.stringify(p));return p;},
    addJob(input){const d=jobSchema.parse(input);if(!list('profiles').some(p=>p.id===d.profileId))throw new Error('Selecciona un perfil existente.');const old=db.prepare('SELECT data FROM jobs WHERE request_key=?').get(d.requestKey);if(old)return JSON.parse(old.data);const media=id=>{const row=db.prepare('SELECT data FROM media WHERE id=?').get(id);if(!row)throw new Error('No se encontró la imagen adjunta. Vuelve a adjuntarla.');return JSON.parse(row.data);};
      const logo=d.useLogo?media(d.logoId):null,references=d.referenceIds.map(media),productionImages=d.productionIds.map(media);if(logo&&logo.kind!=='logo')throw new Error('El logo debe ser PNG.');if(references.some(x=>x.kind!=='reference'))throw new Error('Referencia no válida.');
      if(productionImages.some(x=>x.kind!=='production'))throw new Error('Imagen de producción no válida.');
      const job={...d,logo,referenceImages:references,productionImages,id:randomUUID(),status:'draft',progress:0,scripts:[],audio:{},videos:{},bible:null,outline:null,corrections:[],reviewPass:0,reviewPassed:false,events:[],createdAt:new Date().toISOString()};db.prepare('INSERT INTO jobs VALUES(?,?,?)').run(job.id,d.requestKey,JSON.stringify(job));return job;},
    reserve(jobId,kind,amount,limit,chargeId=randomUUID()){
      if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Reserva inválida.');
      const job=getJob(jobId),p=period();
      const row=db.prepare(`INSERT INTO charges(id,job_id,period,kind,amount,status) SELECT ?,?,?,?,?,'reserved' WHERE NOT EXISTS(SELECT 1 FROM charges WHERE id=?) AND COALESCE((SELECT sum(amount) FROM charges WHERE period=? AND kind=?),0)+?<=? AND COALESCE((SELECT sum(amount) FROM charges WHERE job_id=? AND kind=?),0)+?<=?`).run(chargeId,jobId,p,kind,amount,chargeId,p,kind,amount,limit,jobId,kind,amount,kind==='voice'?job.maxCredits:limit);
      if(!row.changes){
        if(db.prepare('SELECT id FROM charges WHERE id=?').get(chargeId))throw new Error('Esta llamada ya está registrada; no se volverá a ejecutar automáticamente.');
        const total=db.prepare('SELECT COALESCE(sum(amount),0) AS n FROM charges WHERE period=? AND kind=?').get(p,kind).n;
        if(total+amount>limit)throw new Error(`Límite local de ${kind==='text'?'Gemini':'ElevenLabs'}: ${total.toLocaleString('es')} de ${limit.toLocaleString('es')} ${kind==='text'?'tokens':'créditos'} contabilizados o reservados. La siguiente etapa necesita reservar ${amount.toLocaleString('es')}. Revisa Consumo y costos y el límite en Configuración.`);
        throw new Error('Se alcanzó el límite de créditos de esta producción. Revisa su presupuesto de voz.');
      }db.prepare('INSERT OR IGNORE INTO charge_estimates VALUES(?,?)').run(chargeId,amount);return chargeId;
    },
    generationResponse(id){const row=db.prepare('SELECT data FROM generation_responses WHERE id=?').get(id);return row?JSON.parse(row.data):null;},
    saveGenerationResponse(id,data){db.prepare('INSERT OR REPLACE INTO generation_responses VALUES(?,?)').run(id,JSON.stringify(data));},
    generationCharge(id){const rows=db.prepare('SELECT id,status FROM charges WHERE id=? OR substr(id,1,?)=?').all(id,(id+':attempt:').length,id+':attempt:');if(rows.some(r=>r.status==='reserved'))throw new Error('Esta etapa tiene una llamada de resultado incierto. Revisa el proveedor antes de repetir.');return rows.length?id+':attempt:'+String(rows.length+1):id;},
    recordConsumption(id,jobId,data){db.prepare('INSERT OR IGNORE INTO consumption VALUES(?,?,?,?)').run(id,jobId,period(),JSON.stringify({...data,at:new Date().toISOString()}));},
    consumption(){return db.prepare('SELECT id,job_id,period,data FROM consumption').all().map(r=>({id:r.id,jobId:r.job_id,period:r.period,...JSON.parse(r.data)}));},
    accounting(){return {period:period(),records:this.consumption(),reservations:db.prepare("SELECT job_id AS jobId,kind,status,sum(amount) AS amount FROM charges WHERE period=? GROUP BY job_id,kind,status").all(period()),pricing:settings().pricing||{},subscription:settings().elevenSubscription||null};},
    settle(id,actual){if(Number.isFinite(actual)&&actual>=0){db.prepare("UPDATE charges SET amount=?,status='settled' WHERE id=?").run(Math.ceil(actual),id);}else db.prepare("UPDATE charges SET status='settled' WHERE id=?").run(id);},
    rejectGeneration(id,status,details=null){const row=db.prepare("SELECT amount FROM charges WHERE id=? AND kind='text' AND status='reserved'").get(id);if(!row)return;db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT OR REPLACE INTO generation_failures VALUES(?,?,?,?)').run(id,status,row.amount,new Date().toISOString());if(details)db.prepare('INSERT OR REPLACE INTO generation_error_details VALUES(?,?)').run(id,JSON.stringify(details));db.prepare("UPDATE charges SET amount=0,status='rejected' WHERE id=? AND status='reserved'").run(id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}},
    releaseRejected(id){db.prepare("DELETE FROM charges WHERE id=? AND status='reserved'").run(id);},
    usage(){return db.prepare('SELECT kind,sum(amount) AS amount FROM charges WHERE period=? GROUP BY kind').all(period());},
    interruptedCharges(jobId){return db.prepare("SELECT id FROM charges WHERE job_id=? AND status='reserved'").all(jobId);},
    resetDrafts(){for(const j of list('jobs'))if(['running','queued'].includes(j.status)){j.status='paused';j.error='Se reinició el servicio. Revisa las llamadas pendientes antes de continuar.';saveJob(j);}}
  };
}
