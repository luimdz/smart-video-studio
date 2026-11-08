import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from './deps.mjs';

export const profileSchema = z.object({ name: z.string().trim().min(2), niche: z.string().trim().min(2), audience: z.string().trim().min(2), brief: z.string().default(''), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#b5ed75'), voiceId: z.string().regex(/^[A-Za-z0-9_-]*$/).max(100).default('') });
export const jobSchema = z.object({ profileId: z.string().uuid(), title: z.string().trim().min(3).max(140), topic: z.string().trim().min(10).max(12000), type: z.enum(['video','series','vsl']), style: z.enum(['motion','2d']), episodes: z.number().int().min(1).max(25), duration: z.number().int().min(30).max(300), maxCredits: z.number().int().min(100).max(30000), requestKey: z.string().uuid() }).superRefine((v,c)=>{
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
    addProfile(input){const p={id:randomUUID(),...profileSchema.parse(input),createdAt:new Date().toISOString()};db.prepare('INSERT INTO profiles VALUES(?,?)').run(p.id,JSON.stringify(p));return p;},
    addJob(input){const d=jobSchema.parse(input);if(!list('profiles').some(p=>p.id===d.profileId))throw new Error('Selecciona un perfil existente.');const old=db.prepare('SELECT data FROM jobs WHERE request_key=?').get(d.requestKey);if(old)return JSON.parse(old.data);const job={...d,id:randomUUID(),status:'draft',progress:0,scripts:[],audio:{},videos:{},bible:null,outline:null,corrections:[],reviewPass:0,reviewPassed:false,events:[],createdAt:new Date().toISOString()};db.prepare('INSERT INTO jobs VALUES(?,?,?)').run(job.id,d.requestKey,JSON.stringify(job));return job;},
    reserve(jobId,kind,amount,limit,chargeId=randomUUID()){
      if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Reserva inválida.');
      const job=getJob(jobId),p=period();
      const row=db.prepare(`INSERT INTO charges(id,job_id,period,kind,amount,status) SELECT ?,?,?,?,?,'reserved' WHERE NOT EXISTS(SELECT 1 FROM charges WHERE id=?) AND COALESCE((SELECT sum(amount) FROM charges WHERE period=? AND kind=?),0)+?<=? AND COALESCE((SELECT sum(amount) FROM charges WHERE job_id=? AND kind=?),0)+?<=?`).run(chargeId,jobId,p,kind,amount,chargeId,p,kind,amount,limit,jobId,kind,amount,kind==='voice'?job.maxCredits:limit);
      if(!row.changes)throw new Error('Se alcanzó el límite de consumo, o esta llamada ya está reservada.');return chargeId;
    },
    settle(id){db.prepare("UPDATE charges SET status='settled' WHERE id=?").run(id);},
    releaseRejected(id){db.prepare("DELETE FROM charges WHERE id=? AND status='reserved'").run(id);},
    usage(){return db.prepare('SELECT kind,sum(amount) AS amount FROM charges WHERE period=? GROUP BY kind').all(period());},
    interruptedCharges(jobId){return db.prepare("SELECT id FROM charges WHERE job_id=? AND status='reserved'").all(jobId);},
    resetDrafts(){for(const j of list('jobs'))if(['running','queued'].includes(j.status)){j.status='paused';j.error='Se reinició el servicio. Revisa las llamadas pendientes antes de continuar.';saveJob(j);}}
  };
}
