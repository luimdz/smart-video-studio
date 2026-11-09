export const isPoster=job=>job.style==='static'||job.contentFormat==='poetry';
export const usesExactText=job=>job.textMode==='verbatim'&&!!job.staticText?.trim();
export const spokenScript=script=>script.scenes.map(s=>[s.narration,...s.dialogue.map(d=>d.text)].filter(Boolean).join(' ')).join('\n\n');
export const narrationText=(job,script)=>usesExactText(job)?job.staticText:spokenScript(script);
export function assertCreativeNarration(job,script){
 if(usesExactText(job))return;
 if(script.scenes.some(scene=>scene.dialogue.some(d=>/^(?:el|la) (?:instructor(?:a)?|narrador(?:a)?|presentador(?:a)?|personaje|protagonista)\b.{0,100}\b(?:cierra|señala|aparece|termina|entra|sale|sonríe|se despide|muestra)\b/i.test(d.text.trim()))))throw new Error('Un diálogo contiene una acción del personaje. Escribe solo lo que debe decir; las acciones deben ir en la descripción visual.');
 if(/\b(la idea (es transmitir|final es)|el (mensaje|video|contenido) debe|debe transmitir|el objetivo del video|quiero contar esa sensaci[oó]n)\b/i.test(spokenScript(script)))throw new Error('El guion contiene indicaciones de creación en lugar de contenido final. Se detuvo antes de generar la voz.');
}
