# Smart Studio · motor local

Abrir **Iniciar Smart Studio.command**. El panel funciona en `http://127.0.0.1:4317` con el Mac encendido. Requiere Node >=22.13, FFmpeg/ffprobe y `npm ci` dentro de esta carpeta. Las claves cifradas, SQLite, recursos y archivos producidos permanecen locales; no subir `.state/`, `resources/code-art/` ni `outputs/` al alojamiento web.

## Producción

La UI crea perfiles, videos, temporadas de 10–25 capítulos y VSL de 120–300 segundos. El Mac consulta el coordinador n8n por cada transición, escribe ficha y arco, genera todos los guiones y revisa continuidad antes de generar las voces. Hay una voz de narrador por perfil. Se conservan respuestas de Gemini, voz y tiempos para reanudar sin repetir etapas confirmadas. El consumo se concilia con los datos reportados por los proveedores.

El coordinador de esta instalación está configurado y publicado: [workflow](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M). En instalaciones nuevas, guardar las claves y el webhook en **Configuración** y configurar Header Auth `X-Studio-Token` con el token del estudio. n8n recibe estados y contadores, no las claves de Gemini/ElevenLabs ni los medios.

Una producción simultánea con cola: al pulsar Producir mientras hay otro trabajo, el nuevo queda en espera; un fallo no detiene los siguientes. Los trabajos en espera o detenidos se pausan de inmediato. En un trabajo activo la pausa se aplica al terminar la etapa actual. Una llamada de resultado incierto bloquea el reenvío; respuestas 503 explícitas admiten reintentos acotados y liberan su propia reserva. Los límites locales no equivalen al saldo del proveedor.

## Contenido, imágenes y audio

La UI separa **Contenido** (narración por escenas o poesía/carta/mensaje) de **Estilo visual** (imagen fija, imágenes con movimiento o 2D experimental).

- **Poesía/carta/mensaje:** Nano Banana o GPT Image 2 genera la imagen completa, incluido el texto final. El motor verifica la transcripción del poema con Gemini antes de generar voz. Si no coincide, intenta una sola corrección dentro del límite de imágenes; conserva resultados y consumo. No monta una nota dibujada localmente como sustituto. Seleccionar movimiento mantiene esta lámina y aplica un acercamiento suave; no la convierte en una secuencia de iconos.
- **Narración por escenas:** con imágenes propias se animan esos recursos. Sin imágenes propias se genera una imagen por escena. Los cambios se sincronizan con las palabras de cada escena de la voz, no con fracciones iguales de duración. Las referencias guían el estilo y los protagonistas.
- **Animación 2D experimental:** conserva su adaptador CODE ART y un catálogo limitado. Su calidad artística no equivale todavía a la de los ejemplos originales; no debe presentarse como un motor terminado. Valida que los objetos pertenezcan a la escena narrada y admite una corrección de plan. Los efectos responden a acciones visibles: se retiraron los aires repetidos por intervalos y la sonorización automática de movimientos suaves de cámara.

### Generadores de imágenes

**Gemini / Nano Banana 2.1:** usa la clave Gemini, Interactions API, `store=false`, formato vertical 9:16 y salida 1K/2K según calidad. **OpenAI / GPT Image 2:** requiere su propia clave en Configuración; utiliza exactamente `gpt-image-2`, salida 1152×2048, calidad media/alta y edición con referencias cuando se adjuntan. No cambia de proveedor silenciosamente. La versión para este propietario deja OpenAI seleccionado por preferencia explícita.

Los archivos finales se normalizan a 1080×1920 y permanecen en la biblioteca local. Los modelos de imagen reciben instrucciones y referencias por API para procesarlas; los archivos no se sirven desde almacenamiento remoto al reproducir el video.

Guardar claves no las muestra de nuevo: permanecen cifradas en este equipo. Una clave Gemini válida para guiones no garantiza cuota de imagen; un 429 informa la restricción de imágenes. OpenAI puede exigir permisos/facturación específicos del proyecto. No se repiten automáticamente solicitudes de imágenes de resultado incierto.

Los límites mensual y por producción cuentan imágenes finales, no dólares. Se registran proveedor, modelo y tokens reportados separadamente del texto y la voz; las tarifas de Gemini para guion no se aplican a imágenes. Las llamadas aceptadas se guardan y reutilizan; una imagen no se vuelve a cobrar solo por reexportar el video. Las láminas tienen MP4 y PNG descargables.

### Música y voz opcional

En **Diseño y audio de la lámina**, activar o desactivar **Agregar voz que lee el texto**. Sin voz no se llama a ElevenLabs y se usa la duración solicitada. Cargar MP3/WAV de hasta 16 MB o elegir una pista guardada, ajustar volumen y activar música instrumental. La pista se repite o recorta a la duración del video, baja de nivel con narración y se desvanece al final. No se sustituye por un tono de prueba.

Las producciones antiguas conservan sus archivos. Para un nuevo trabajo detenido por imágenes, **Cambiar generador de imágenes** permite elegir proveedor/calidad y ajustar dirección visual antes de continuar, conservando guion y voz.

## Comprobaciones y límites

La prueba real con GPT Image 2 generó una lámina fotográfica con texto, validó su transcripción y exportó PNG y MP4 de 90 segundos. La prueba de Nano Banana respondió 429 por cuota del proyecto; sus contratos y manejo de caché tienen pruebas simuladas, pero no se afirma haber validado una imagen real de esa cuenta.

Probados perfiles extensos, persistencia de claves y voces, adjuntos eliminables, presupuestos, respuestas Gemini, exportaciones reales de video, música y modo sin narración. `npm test` ejecuta las pruebas automatizadas. La prueba técnica opcional está identificada como tal; su tono nunca se usa como audio de una producción real.

Quedan pendientes publicación Facebook/Instagram, ampliar la evaluación visual de escenas, reparto de personajes articulados, ampliar piezas CODE ART por temática y autenticar/conectar una UI remota al Mac. Las temporadas completas y VSL de 300 segundos necesitan pruebas reales de calidad y rendimiento; no se afirma haberlas validado a escala. Vercel puede alojar el panel cuando exista ese puente seguro; el servidor actual no debe exponerse directamente a internet.

## Recuperar una revisión detenida

El detalle muestra las observaciones y ofrece **Corregir observaciones y continuar**. Esa acción abre un ciclo acotado nuevo, conserva ficha, arco y guiones y utiliza una caché distinta para las correcciones y revisiones. No repite indefinidamente la revisión ya agotada ni omite las observaciones. También se puede **Revisar y editar guion** antes de generar voces: guardar no consume APIs y requiere otra revisión al continuar. No se modifica un guion que ya tiene voz o video; para eso hace falta otra versión.

La UI actualiza el estado del diálogo y sus controles durante la producción. Un reinicio del servicio conserva la cola como trabajos pausados para evitar llamadas imprevistas; se reanudan desde sus avances con Producir. La sesión del navegador se renueva cuando cambia el motor local.
