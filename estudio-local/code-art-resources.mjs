import {access,cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
export const codeArtRoot=fileURLToPath(new URL('./resources/code-art/',import.meta.url));
export async function ensureCodeArt(){
 try{await access(path.join(codeArtRoot,'motor/kit/index.js'));await access(path.join(codeArtRoot,'letra/Figtree-Bold.ttf'));await access(path.join(codeArtRoot,'sonidos/aire.mp3'));await access(path.join(codeArtRoot,'motor/lib/mezcla.mjs'));await access(path.join(codeArtRoot,'motor/lib/rotulos.mjs'));return codeArtRoot;}catch{}
 const desktop=path.join(homedir(),'Desktop'),candidates=[process.env.CODE_ART_SOURCE,path.join(desktop,'Contenido viral','CODE ART')].filter(Boolean);
 try{for(const name of await readdir(path.join(desktop,'Smart Growth Online')))candidates.push(path.join(desktop,'Smart Growth Online',name,'Contenido viral','CODE ART'));}catch{}
 for(const source of candidates){try{await access(path.join(source,'motor/kit/index.js'));}catch{continue;}
  await mkdir(codeArtRoot,{recursive:true});for(const sub of ['motor/kit','piezas','letra','sonidos'])await cp(path.join(source,sub),path.join(codeArtRoot,sub),{recursive:true,filter:p=>!['.jpg','.mp4'].includes(path.extname(p))});
  for(const name of ['motor/lib/cuadro.mjs','motor/lib/rotulos.mjs','motor/lib/mezcla.mjs','motor/lib/subtitulos.mjs','motor/lib/comun.mjs','METODO.md','AGENTS.md','aprendido.md','guia/dibujar.md','guia/guion.md','guia/sonido.md','packs/estilos.md','plantillas.md']){await mkdir(path.dirname(path.join(codeArtRoot,name)),{recursive:true});await cp(path.join(source,name),path.join(codeArtRoot,name));}
  await writeFile(path.join(codeArtRoot,'package.json'),JSON.stringify({name:'local-code-art-runtime',private:true,type:'module',imports:{'#kit':'./motor/kit/index.js','#piezas/*':'./piezas/*'}}));return codeArtRoot;
 }
 throw new Error('No se encontró CODE ART. El modo 2D requiere su carpeta de recursos; no se usará la plantilla de prueba.');
}
export async function codeArtGuidance(){await ensureCodeArt();return (await Promise.all(['packs/estilos.md','guia/dibujar.md','guia/guion.md'].map(n=>readFile(path.join(codeArtRoot,n),'utf8')))).join('\n\n');}
export const codeArtUrl=relative=>pathToFileURL(path.join(codeArtRoot,relative)).href;
