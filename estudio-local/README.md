# Smart Studio · motor local

Abrir **Iniciar Smart Studio.command**. El panel funciona en `http://127.0.0.1:4317` con el Mac encendido. Requiere Node >=22.13, FFmpeg/ffprobe y `npm ci` dentro de esta carpeta. Las claves cifradas, SQLite, recursos y archivos producidos permanecen locales; no subir `.state/`, `resources/code-art/` ni `outputs/` al alojamiento web.

## Producción

La UI crea perfiles, videos, temporadas de 10–25 capítulos y VSL de 120–300 segundos. El Mac consulta el coordinador n8n por cada transición, escribe ficha y arco, genera todos los guiones y revisa continuidad antes de generar las voces. Hay una voz de narrador por perfil. Se conservan respuestas de Gemini, voz y tiempos para reanudar sin repetir etapas confirmadas. El consumo se concilia con los datos reportados por los proveedores.

El coordinador de esta instalación está configurado y publicado: [workflow](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M). En instalaciones nuevas, guardar las claves y el webhook en **Configuración** y configurar Header Auth `X-Studio-Token` con el token del estudio. n8n recibe estados y contadores, no las claves de Gemini/ElevenLabs ni los medios.

Una producción simultánea. Las pausas se aplican al terminar una etapa. Una llamada de resultado incierto bloquea el reenvío; respuestas 503 explícitas admiten reintentos acotados y liberan su propia reserva. Los límites locales no equivalen al saldo del proveedor.

## Estilos visuales

- **Imágenes con movimiento:** anima y alterna imágenes de producción propias. Las referencias orientan a Gemini y no se convierten automáticamente en fondos. Sin imágenes se usan ilustraciones locales; no fotografías generadas por API.
- **Lámina estática:** carta clara o nota romántica ilustrada con papel, rosas rosadas, velas y bokeh. Genera contenido original o utiliza texto exacto cuando se selecciona explícitamente. Guarda MP4 y PNG descargables desde el detalle.
- **CODE ART 2D:** integración inicial del kit, materiales, piezas, cámara, subtítulos Figtree y mezcla de efectos originales. Plan visual declarativo sincronizado con las palabras de ElevenLabs; render local 1080×1920 a 60 fps. El presentador provisional se retiró de producción. Ver [alcance y recursos](../docs/CODE_ART_LOCAL.md).

### Poesía con música, con o sin voz

En **Crear contenido → Lámina estática → Diseño y audio de la lámina**:

1. Seleccionar diseño.
2. Activar o desactivar **Agregar voz que lee el texto**. Sin voz no se llama a ElevenLabs ni se necesita una voz asignada; se mantiene la duración solicitada. Gemini sigue escribiendo el contenido cuando corresponda.
3. Activar **Agregar música instrumental** y cargar MP3/WAV de hasta 16 MB o seleccionar una pista guardada. La pista se conserva en la biblioteca local para próximas producciones.
4. Ajustar volumen. La música se repite si es corta, se recorta a la duración del video y se desvanece al final. Con narración se mezcla a menor nivel.

No se incluye una canción de muestra ni se sustituye la música por un tono sintético. Se utiliza el archivo que seleccione el usuario. El diseño romántico es ilustración local; los fondos fotográficos generados por API todavía no están conectados.

## Comprobaciones y límites

Probados perfiles extensos, persistencia de claves y voces, adjuntos eliminables, presupuestos, respuestas Gemini, exportaciones reales de video, música y modo sin narración. `npm test` ejecuta las pruebas automatizadas. La prueba técnica opcional está identificada como tal; su tono nunca se usa como audio de una producción real.

Quedan pendientes publicación Facebook/Instagram, imagen generativa por API, reparto de personajes articulados, ampliar piezas CODE ART por temática y autenticar/conectar una UI remota al Mac. Las temporadas completas y VSL de 300 segundos necesitan pruebas reales de calidad y rendimiento; no se afirma haberlas validado a escala. Vercel puede alojar el panel cuando exista ese puente seguro; el servidor actual no debe exponerse directamente a internet.
