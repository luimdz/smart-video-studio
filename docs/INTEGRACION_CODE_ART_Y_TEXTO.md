# Texto con dos proveedores y producción CODE ART

Esta entrega amplía el motor local. No se instala en el Mac al integrar el PR: hay que actualizar la copia local, reiniciar el servicio e importar el paquete de recursos una vez.

## Activar y probar

1. Actualizar `main` con el motor detenido, instalar dependencias con `npm ci` y arrancar el servicio. Recargar el navegador con Cmd+Shift+R. El pie muestra `v0.2 · Texto y CODE ART`.
2. Abrir **Configuración** e importar `code-art-upgrade.studio.json`. La aplicación verifica las rutas, tamaños y SHA-256 antes de instalar. Conserva copia de los archivos reemplazados en `resources/code-art/.backups/`. Debe mostrar motor encontrado y 31 de 31 efectos.
3. Elegir **OpenAI** como proveedor de texto, verificar el modelo y guardar. La clave OpenAI guardada sirve para texto e imágenes si la cuenta tiene acceso a ambos servicios. No se vuelve a mostrar ni hay que pegarla en el chat.
4. Para continuar un trabajo detenido por 503, volver a Producciones y pulsar Producir. Conserva ficha, guiones, voces e imágenes ya confirmados. Los trabajos antiguos conservan sus opciones de revisión; las nuevas solicitudes 2D ofrecen revisión del guion y del borrador.
5. Para un reel nuevo, elegir Animación 2D, activar efectos y las revisiones. Aprobar el guion antes de la voz, revisar el borrador y sus escenas y aprobar antes del render final. Tras aprobar, pulsar Producir para continuar.

Los pasos siguen el contrato n8n existente: no hace falta cambiar el coordinador. No hay publicación automática en redes.

## Saturación y consumo

- Gemini sigue disponible. Si está seleccionado y devuelve tres rechazos 503, el respaldo continúa con OpenAI cuando la opción está activada y existe su clave. No se cambia de proveedor por errores de red/timeout de resultado incierto, permisos o cuota.
- OpenAI usa Responses API, JSON estructurado e imágenes de referencia. Modelo inicial: `gpt-4.1-mini`, editable por un modelo compatible y habilitado en el proyecto. La disponibilidad y cuotas dependen de la cuenta; las pruebas de esta entrega no consumen APIs reales.
- Gemini y OpenAI comparten el límite mensual local de tokens de texto. Se registran modelo y consumo reportado. Las tarifas Gemini no se aplican a OpenAI; si faltan tarifas el costo aparece como desconocido, nunca como cero.
- Las respuestas recibidas se conservan antes de validar el formato. Un rechazo, respuesta incompleta o JSON inválido no se vuelve a cobrar silenciosamente.

## Integración de los adjuntos

El paquete local reconstruye 109 archivos: 10 del kit, 11 de librerías, piezas reutilizables, guías, ejemplos, 31 sonidos y fuentes. Los adjuntos originales permanecen fuera del código público; el repositorio contiene el importador y el manifiesto de integridad. Las fuentes Figtree oficiales se incluyen con su licencia OFL y se instancian en pesos 500, 700 y 800.

| Idea del material | Aplicación actual |
|---|---|
| Guion escrito para el ojo, hook, cierre y preferencias | Guías de referencia en la planificación; preferencias y cierre editables por marca |
| Voz con guion cerrado | Revisión del guion antes de generar voz, opcional y activada en nuevas solicitudes 2D |
| Guías de dibujo, materiales, cámara y piezas | Kit original conectado; catálogo declarativo de 14 tipos de objeto, incluido botón y captura real |
| Acciones ligadas a palabras | 12 acciones validadas; los tiempos salen de la alineación de voz |
| Planos que respeten frases | Ventanas por frases y recorridos de hasta 20 segundos, en lugar de cortes fijos cada cinco segundos |
| Revisión visual antes de renderizar todo | Borrador de cada capítulo a 540×960/15 fps, fotogramas por plano y aprobación antes del final a 1080×1920/60 fps |
| Subtítulos superiores y legibles | Tipografía Figtree original y sombra reforzada |
| Efectos con acciones y bajo la voz | 31 sonidos importables y escuchables; selección por acción/material, límites de plano y opción de silenciarlos |
| Portadas y descripciones | Tres portadas del 2D, portada seleccionada descargable y textos para Instagram, TikTok, YouTube y Facebook más comentario fijado |
| Memoria de marca | Variante de español, color, cuentas sociales, cierre y preferencias permanentes editables; no se inventan preferencias desde correcciones |
| Temas, calendario y series | Borradores editoriales, historial de temas como contexto, calendario de 30 propuestas y plan de cinco partes; producción de series de 3–25 capítulos |
| Reutilización | Borradores de hilo, post, teaser e ideas; carrusel editorial de siete PNG y texto descargable |
| Servicios a negocios | Borradores de cliente ideal, oferta, mensaje y propuesta. No se envían mensajes ni se inventan precios o resultados |

## Límites que se conservan

- El catálogo automatizado sigue siendo acotado: importar piezas de ejemplo no convierte cada escena de sus proyectos originales en una plantilla parametrizada. Los planos de susurro y cuentas quedan como referencias; no se ejecutan automáticamente contra palabras o capturas ficticias. Falta ampliar piezas específicas para muchos temas y evaluar la dirección artística de reels completos.
- La revisión visual es por borrador de capítulo, con fotogramas de cada plano. Todavía no hay edición visual independiente y aprobación individual versionada de cada plano.
- El modelo propone ideas; no investiga noticias ni verifica enlaces automáticamente. Calendarios y textos se identifican como borradores con fuentes pendientes de comprobación.
- El carrusel nuevo es editorial y tipográfico; no reconstruye automáticamente todos los fotogramas sin subtítulos del método original.
- No hay pronunciación separada `dicho` por frase, extracción automática de aprendizajes aprobados, prospección, envío de propuestas, publicación Meta ni acceso remoto al Mac.

## Validación

Pruebas automatizadas de ambos proveedores, saturación 503, preservación de llamadas inciertas, cuotas compartidas, caché, importación/integridad, ventanas por frase, sonidos y entregas. Exportación real con el kit y sonidos adjuntos. Recorrido de Chromium desde configuración e importación hasta revisión de guion, borrador, aprobación y MP4 final a 60 fps, más portada, descripciones y carrusel. Las respuestas de texto y voz se simulan; los archivos, fotogramas, mezclas y renderizados son reales. Ninguna prueba equivale a una evaluación artística de una temporada ni a una llamada pagada exitosa en la cuenta del propietario.
