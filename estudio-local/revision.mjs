import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function revision(){
 const hash=createHash('sha256');
 for(const file of ['code-art-resources.mjs','code-art-scene.mjs','code-art-frame.mjs','code-art-render.mjs','static-design.mjs','production-queue.mjs','recovery.mjs','server.mjs','store.mjs','planner.mjs','render.mjs','deps.mjs','voices.mjs','gemini-http.mjs','gemini-schema.mjs','content.mjs','public/app.js','public/index.html','public/style.css','public/theme.css'])hash.update(await readFile(new URL(file,import.meta.url)));
 return hash.digest('hex');
}
