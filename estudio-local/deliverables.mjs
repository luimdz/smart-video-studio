import {writeFile} from 'node:fs/promises';
import path from 'node:path';
export function descriptions(script={}){
 const sections=[['Instagram Reels',script.instagramCopy],['TikTok',script.tiktokCopy],['YouTube Shorts',script.youtubeCopy],['Facebook Reels',script.facebookCopy],['Comentario fijado',script.pinnedComment]];
 return '# '+(script.title||'Descripciones')+'\n\n'+sections.map(([title,text])=>'## '+title+'\n\n'+(text?.trim()||'No generado en esta versión del guion.')+'\n').join('\n');
}
export async function writeDescriptions(dir,script){const file=path.join(dir,'descripciones.md');await writeFile(file,descriptions(script));return file;}
