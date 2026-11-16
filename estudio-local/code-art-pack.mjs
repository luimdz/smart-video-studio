import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,access,readdir,copyFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const manifest=JSON.parse(await readFile(new URL('./code-art-pack-manifest.json',import.meta.url),'utf8'));
export const defaultResourceRoot=fileURLToPath(new URL('./resources/code-art/',import.meta.url));
export async function installCodeArtPack(pack,root=defaultResourceRoot){
 if(pack?.format!=='smart-studio-code-art'||pack.version!==1||!Array.isArray(pack.files))throw Error('El archivo no es el paquete CODE ART compatible.');
 const expected=Object.keys(manifest.files),seen=new Set(),decoded=[];
 if(pack.files.length!==expected.length)throw Error('El paquete está incompleto. Importa el archivo completo.');
 for(const f of pack.files){
  if(!manifest.files[f.path]||seen.has(f.path)||typeof f.data!=='string')throw Error('El paquete contiene una ruta desconocida o repetida.');
  seen.add(f.path);const buffer=Buffer.from(f.data,'base64'),entry=manifest.files[f.path];
  if(buffer.length!==entry.bytes||createHash('sha256').update(buffer).digest('hex')!==entry.sha256)throw Error('La integridad del paquete no coincide: '+f.path);
  decoded.push({relative:f.path,buffer});
 }
 return writeResources(decoded,root);
}
export const resourceCatalog=Object.keys(manifest.files);
export async function installCodeArtFolder(files,root=defaultResourceRoot){
 if(!Array.isArray(files)||!files.length||files.length>160)throw Error('Selecciona la carpeta original CODE ART.');
 const seen=new Set(),decoded=[];
 for(const f of files){
  if(!manifest.files[f.path]||seen.has(f.path)||typeof f.data!=='string')throw Error('La carpeta contiene una ruta desconocida o repetida.');
  seen.add(f.path);const buffer=Buffer.from(f.data,'base64'),entry=manifest.files[f.path];
  if(f.path==='package.json')continue; // Build a minimal import map; never install arbitrary package scripts.
  const font=/^letra\/Figtree-(Medium|Bold|ExtraBold)\.ttf$/.test(f.path);
  if(font){if(buffer.length<1000||buffer.length>2*1024*1024||!['00010000','4f54544f'].includes(buffer.subarray(0,4).toString('hex')))throw Error('Fuente Figtree no válida: '+f.path);}
  else if(buffer.length!==entry.bytes||createHash('sha256').update(buffer).digest('hex')!==entry.sha256)throw Error('El archivo no coincide con el recurso original revisado: '+f.path);
  decoded.push({relative:f.path,buffer});
 }
 if(!decoded.length)throw Error('No hay recursos reconocidos para importar.');
 decoded.push({relative:'package.json',buffer:Buffer.from(JSON.stringify({name:'local-code-art-runtime',private:true,type:'module',imports:{'#kit':'./motor/kit/index.js','#voz':'./motor/lib/voz-actual.js','#piezas/*':'./piezas/*'}}))});
 return writeResources(decoded,root);
}
async function writeResources(decoded,root){
 const backup=path.join(root,'.backups',randomUUID()),written=[];
 await mkdir(root,{recursive:true});
 try{
  for(const f of decoded){
   const dest=path.join(root,f.relative);
   // Never follow pre-existing symlinks while importing a resource bundle.
   for(let at=dest;at!==path.dirname(root);at=path.dirname(at)){
    try{if((await lstat(at)).isSymbolicLink())throw Error('El destino contiene un enlace simbólico: '+f.relative);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(at===root)break;
   }
   await mkdir(path.dirname(dest),{recursive:true});
   let old=false;try{await access(dest);await mkdir(path.dirname(path.join(backup,f.relative)),{recursive:true});await copyFile(dest,path.join(backup,f.relative));old=true;}catch(e){if(e.code!=='ENOENT')throw e;}
   const pending=dest+'.'+randomUUID()+'.pending';await writeFile(pending,f.buffer);await rename(pending,dest);written.push({...f,dest,old});
  }
 }catch(error){const {rm}=await import('node:fs/promises');for(const f of written.reverse()){if(f.old)await copyFile(path.join(backup,f.relative),f.dest);else await rm(f.dest,{force:true});}throw error;}
 return resourceStatus(root);
}
export async function resourceStatus(root=defaultResourceRoot){
 const required=[...Object.keys(manifest.files).filter(n=>n.startsWith('motor/kit/')),'package.json','letra/Figtree-Medium.ttf','letra/Figtree-ExtraBold.ttf','motor/kit/index.js','motor/lib/mezcla.mjs','motor/lib/comun.mjs','motor/lib/subtitulos.mjs','motor/lib/rotulos.mjs','letra/Figtree-Bold.ttf','piezas/objetos.js','piezas/celular.js'];
 const missing=[];for(const name of required){try{await access(path.join(root,name));}catch{missing.push(name);}}
 const sounds=[];for(const name of Object.keys(manifest.files).filter(n=>/^sonidos\/.+\.(mp3|wav)$/.test(n))){try{await access(path.join(root,name));sounds.push(path.basename(name,path.extname(name)));}catch{}}
 const documents=[];for(const name of Object.keys(manifest.files).filter(n=>n.endsWith('.md')&&!n.startsWith('referencia/'))){try{await access(path.join(root,name));documents.push(name);}catch{}}
 return {runtimeReady:!missing.length,missing,sounds,documents,packInstalled:documents.includes('METODO.md')&&sounds.length===31};
}
export async function readGuides(names,root=defaultResourceRoot,maxCharacters=22000){
 const parts=[];for(const name of names){if(!manifest.files[name]||!name.endsWith('.md'))continue;try{parts.push('REFERENCIA '+name+'\n'+await readFile(path.join(root,name),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
 return parts.join('\n\n').slice(0,maxCharacters);
}
