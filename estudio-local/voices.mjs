const normalize=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const spanish=s=>/^(es(?:-|$)|spanish$|espanol$)/.test(normalize(s));
export function voiceInfo(v,source='account'){
 const verified=(v.verified_languages||[]).filter(x=>spanish(x.language));
 const language=v.language||v.labels?.language||'',nativeSpanish=spanish(language),es=nativeSpanish||verified.length>0;
 const accents=[...new Set([...(nativeSpanish?[v.accent||v.labels?.accent]:[]),...verified.map(x=>x.accent)].filter(Boolean))];
 const locales=verified.map(x=>x.locale).filter(Boolean);
 if(nativeSpanish&&v.locale)locales.push(v.locale);
 const latam=es&&(locales.some(x=>/^es-(419|MX|CO|AR|CL|PE|VE|EC|GT|SV|HN|NI|CR|PA|DO|PR|UY|PY|BO|CU)$/i.test(x))||accents.some(x=>/latin|latam|mexic|colomb|argentin|venez|chilen|chilean|peruv|peruan|ecuador|guatemal|salvador|hondur|nicarag|costa.?ric|panam|dominican|puerto|uruguay|paraguay|boliv|cuban|cubano/.test(normalize(x))));
 return {id:v.voice_id,name:v.name||'Voz',source,ownerId:v.public_owner_id||'',spanish:es,latam,accent:accents.map(x=>({'latin american':'Latinoamericano','es-latin-american':'Latinoamericano','mexican':'Mexicano','es-mexican':'Mexicano','colombian':'Colombiano','argentine':'Argentino','argentinian':'Argentino','chilean':'Chileno','peruvian':'Peruano','ecuadorian':'Ecuatoriano','venezuelan':'Venezolano','castilian':'Castellano','standard':'Estándar','other':'Otro'}[normalize(x)]||x)).filter((x,i,all)=>all.indexOf(x)===i).join(' / ')||(es?'Acento español sin especificar':'Idioma/acento sin confirmar'),language:es?'Español':language||'Sin especificar',description:v.description||'',locales};
}
export async function listVoices(key,{source='library',region='latam',search='',page=0,cursor=''}={},request=fetch){
 const url=new URL(source==='library'?'https://api.elevenlabs.io/v1/shared-voices':'https://api.elevenlabs.io/v2/voices');
 url.searchParams.set('page_size','100');url.searchParams.set('include_custom_rates','false');
 if(search)url.searchParams.set('search',search);
 // Account voices are filtered locally too, so verified Spanish variants are not lost.
 if(source==='library'){url.searchParams.set('language','es');url.searchParams.set('page',String(page));if(!['latam','all'].includes(region))url.searchParams.set('locale',region);}
 else if(cursor)url.searchParams.set('next_page_token',cursor);
 const r=await request(url,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!r.ok)throw Error(`No se pudieron consultar las voces (${r.status}). Revisa permisos de lectura y acceso a la biblioteca de ElevenLabs.`);
 const b=await r.json(),mapped=(b.voices||[]).map(v=>voiceInfo(v,source));
 const voices=mapped.filter(v=>v.spanish&&(region==='all'||(region==='latam'?v.latam:v.locales.some(l=>l.toLowerCase()===region.toLowerCase())))).sort((a,b)=>Number(b.latam)-Number(a.latam)||a.name.localeCompare(b.name,'es'));
 return {voices,hasMore:!!b.has_more,nextCursor:b.next_page_token||'',page,source};
}

export async function resolveLibraryVoice(key,{voiceId,ownerId,name},request=fetch){
 async function existing(){let cursor='';const seen=new Set();do{
  const url=new URL('https://api.elevenlabs.io/v2/voices');url.searchParams.set('page_size','100');if(cursor)url.searchParams.set('next_page_token',cursor);
  const r=await request(url,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!r.ok)throw Error(`No se pudo comprobar la colección de voces (${r.status}). Revisa el permiso de lectura de voces.`);
  const b=await r.json(),found=(b.voices||[]).find(v=>v.voice_id===voiceId||(v.sharing?.original_voice_id===voiceId&&v.sharing?.public_owner_id===ownerId));
  if(found)return {id:found.voice_id,name:found.name||name};
  cursor=b.has_more?b.next_page_token:'';if(cursor&&seen.has(cursor))throw Error('ElevenLabs repitió una página de voces. Vuelve a intentarlo.');if(cursor)seen.add(cursor);
 }while(cursor);return null;}
 const saved=await existing();if(saved)return saved;
 const r=await request(`https://api.elevenlabs.io/v1/voices/add/${ownerId}/${voiceId}`,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({new_name:name}),signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!r.ok){const saved=await existing();if(saved)return saved;throw Error(`ElevenLabs no permitió añadir la voz (${r.status}). No se cambió la voz del perfil. Revisa permisos, plan y espacios de voces, o selecciona una de «Mis voces».`);}
 const body=await r.json();if(!/^[a-zA-Z0-9_-]{1,100}$/.test(body.voice_id||''))throw Error('ElevenLabs no devolvió el identificador de la voz. Búscala en «Mis voces» para asignarla.');
 return {id:body.voice_id,name};
}
