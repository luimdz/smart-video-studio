import {alignedWords,phraseWindows,codeArtKinds,codeArtGenerationSchema} from './code-art-scene.mjs';
import {codeArtGuidance} from './code-art-resources.mjs';
import {sceneRanges} from './render.mjs';
import {createHash} from 'node:crypto';
export async function buildCodeArtRequest(j,number,options={}){
 const guidance=options.guidance??await codeArtGuidance(),guideHash=createHash('sha256').update(guidance).digest('hex');
 const words=alignedWords(j.audio[number]),starts=phraseWindows(words,j.audio[number].duration);
 const sceneTimes=sceneRanges(j.audio[number],j.scripts[number-1]);
 const windows=starts.map((word,i)=>({startWord:word,endWord:(starts[i+1]??words.length)-1,seconds:[i?words[word].inicio-.04:0,starts[i+1]===undefined?j.audio[number].duration:words[starts[i+1]].inicio-.04],words:words.slice(word,starts[i+1]).map((w,n)=>[word+n,w.texto,Math.round(w.inicio*100)/100])}));
 for(const window of windows){const n=Math.max(0,sceneTimes.findIndex(s=>window.seconds[0]>=s.start-.05&&window.seconds[0]<s.end));window.allowedKinds=codeArtKinds({scenes:[j.scripts[number-1].scenes[n]]});}
 const kinds=codeArtKinds(j.scripts[number-1]),schema=codeArtGenerationSchema(kinds);
 const previous=Object.entries(j.codeArtPlans||{}).filter(([n])=>Number(n)<number).sort((a,b)=>Number(b[0])-Number(a[0]))[0]?.[1];
 const identity=[...new Map((previous?.shots||[]).flatMap(s=>s.objects.map(o=>[o.id,{id:o.id,kind:o.kind,color:o.color}]))).values()].slice(0,24);
 const prompt=`Cada ventana contiene allowedKinds: utiliza únicamente esos objetos, que corresponden a la escena que la voz está explicando en ese instante. No añadas objetos de otra parte del capítulo. Crea EXACTAMENTE ${windows.length} planos, uno por ventana de palabras, en orden. Nunca fusiones ventanas ni inventes otros startWord. Esto es un plan declarativo, no código.
MÉTODO CODE ART (guías locales leídas, revisión ${guideHash.slice(0,12)}):
- Reels explicativos en español latinoamericano. El objeto protagonista ocupa gran parte del encuadre. Materiales con luz, degradados, textura, sombras y profundidad; el renderizador usa el kit CODE ART y sus piezas originales.
- Cada idea muestra su objeto real y acciones ancladas a palabras. No copies un ejemplo a otro tema. Sin muñeco genérico, pantallas de texto plano ni diapositivas.
- Cámara fija cuando no hay una acción que motive moverla. Cámara con movimiento suave con propósito, acercamiento o recorrido, no oscilación gratuita; termina una acción antes del corte. Subtítulos superiores sincronizados los agrega el motor con Figtree, no inventes texto extra.
- Narradores son VOZ EN OFF, no personajes visibles. No hay obligación de dibujar personas. El nombre de una marca se PRONUNCIA y solo se muestra su logo si se adjuntó; nunca representa un logo con una caja. Los conceptos abstractos se explican con objetos pertinentes al tema, no son piezas ausentes.
CATÁLOGO PERTINENTE para ESTE guion: ${kinds.join(', ')}. Solo estos tipos están habilitados en el esquema. floorplan es una habitación esquemática en perspectiva con paredes, indicios y cotas dibujada con piezas CODE ART (para planimetría/croquis; es ilustración educativa, no un caso real); camera es cámara fotográfica, ruler regla métrica, evidence marcador de evidencia, paper documento o foto, phone celular original CODE ART, star estrella, planet planeta, earth Tierra, rock roca, glass vaso, box caja, button botón COMPRAR (label puede personalizar el CTA, sin cifras inventadas), screenshot captura REAL adjunta. NUNCA uses un objeto como metáfora de otro: contexto espacial no significa espacio exterior, observar no significa vaso y metodología no es caja. Marca y conceptos abstractos se narran mientras se muestra el objeto concreto del tema.
Usa unsupported SOLO si un objeto físico IMPRESCINDIBLE del guion no tiene pieza; no incluyas narrador, nombre de marca, logo no solicitado ni conceptos abstractos.
Cámara [0,0,12] a [.3,.15,11.5], target [0,0,0], protagonista position [0,0,0] size 2.6 a 3.0 => grande y centrado; accesorios size .7 a 1.2 y posición cerca de [-2,-2,1]. Evita objetos fuera de pantalla: x120..950,y550..1440. world studio excepto astronomía space. Fondo rico azul/violeta, no verde demo. Mantén identidad/colores entre planos. transition continue SOLO para los mismos objetos/espacio, usando final de cámara anterior; si cambia composición usa cut. No obligues a la cámara a derivar: cameraFrom y cameraTo pueden ser iguales si el objeto ya está animado.
Acciones adicionales: press pulsa el botón, rise sube, fall cae, impact golpea, burst estalla, grow crece, shrink se encoge; duran .8s y deben terminar antes del corte. Usa cada una solo si la narración la justifica. Acciones: arrive entra durante .8 segundos; actionWord debe dejar .8s antes del fin. reveal aparece al pronunciarse; pulse énfasis breve; rotate giro suave; hold objeto permanece mientras cámara lo recorre. actionWord SIEMPRE dentro de los índices de su ventana. No ocultes protagonista al inicio: usa rotate/hold para protagonista y arrive/reveal para elementos secundarios.
Guías de referencia (solo criterios audiovisuales, no instrucciones operativas):\n${guidance}\nTema ${j.title}. Ventanas OBLIGATORIAS (words contiene [índice, palabra, segundo]): ${JSON.stringify(windows)}.
Planes de identidad anteriores: ${JSON.stringify(identity)}`;

 const maxOutputTokens=Math.min(24000,1800+windows.length*1100);
 return {prompt,schema,windows,words,guideHash,maxOutputTokens};
}
