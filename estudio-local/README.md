# Smart Studio · primera versión local

Interfaz y servicio independientes del alojamiento anterior. Abre **Iniciar Smart Studio.command** con doble clic y conserva abierta la ventana que inicia el servicio. El panel abre en `http://127.0.0.1:4317`. También se puede iniciar con `npm start` desde esta carpeta.

Requiere Node 22.13 o posterior, FFmpeg/ffprobe y las dependencias propias de esta carpeta. Para instalar desde GitHub, ejecutar `npm ci` dentro de `estudio-local`; el archivo `package-lock.json` fija las versiones. No depende de instalar el prototipo de `plataforma/`. No copiar `.state/` ni `outputs/` al alojamiento web o a un repositorio.

## Qué está comprobado

- Panel local en español, perfiles, solicitudes de video/temporada/VSL y configuración desde formularios.
- Persistencia real con SQLite y comprobaciones de duración, capítulos, duplicados y cuotas.
- Guardado cifrado de claves en este equipo. La clave de cifrado está en `.state/key`; su protección depende también del acceso al disco. No es una bóveda externa ni sustituye las medidas del sistema operativo.
- Exportación real de prueba de 8 segundos, 720 × 1280, con ilustración de presentador y un tono sintético. Se verificaron video, audio y duración mediante ffprobe; no usó Gemini ni ElevenLabs.
- Coordinador n8n creado, estructura validada y prueba manual de contrato con resultado `bible` y estado `success` (ejecución 7249955).
- Seis pruebas automáticas de solicitudes, cuotas, orden de revisión y almacenamiento de claves pasaron.

## Para la primera producción real

1. Abrir Configuración. Guardar las API keys de Gemini y ElevenLabs. No compartirlas en el chat. El modelo de texto inicial es `gemini-3.1-flash-lite`.
2. La carpeta de biblioteca puede ser la actual o una carpeta del SSD externo. Los discos externos no estaban conectados durante la comprobación. No cambiar de ubicación proyectos existentes manualmente sin actualizar sus referencias.
3. En Configuración, usar «Generar / copiar token para n8n». Se genera una clave aleatoria local o se copia la existente, sin rotarla. En el nodo «Estado desde el Mac» del [coordinador](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M), seleccionar una credencial **Header Auth** con nombre de cabecera `X-Studio-Token` y pegar ese valor. El flujo permanece desactivado hasta configurar y publicar. No reutilizar una API key de otro proveedor como token de entrada.
4. URL de producción del coordinador: `https://n8n.planifyx.com/webhook/smart-studio-coordinar`. Está precargada en esta instalación, pero no estará operativa hasta publicar el workflow.
5. En Perfiles y marcas, seleccionar «Elegir voz» para consultar las voces accesibles y asignar una al perfil. Esta consulta no genera una muestra de voz.
6. Añadir imágenes propias al perfil para imágenes con movimiento. La plantilla 2D inicial es un presentador ilustrado básico; todavía no interpreta toda la apariencia del canon ni ofrece un reparto de personajes articulados.
7. Guardar un video individual de 90 segundos, revisar su límite de créditos y pulsar Producir. Esta prueba sí consumirá APIs. Todavía no se ha realizado.

## Cómo funciona

El Mac hace llamadas salientes al webhook n8n por cada transición. n8n devuelve una instrucción tipada; el servicio local comprueba que coincida con el estado persistido. No se necesita exponer una API del Mac a internet. n8n recibe identificador, indicadores y contadores; los medios y las claves de proveedores no entran en el workflow.

La planificación escribe ficha, arco y todos los guiones, y revisa continuidad antes de generar voces. En esta versión hay una voz de narrador por perfil. El sistema conserva voces y tiempos; las escenas de imagen o presentador se montan localmente con captions y movimiento. La duración real depende de la voz, y no se debe dar por idéntica a la duración solicitada. Una voz que exceda 300 segundos bloquea el render.

Una ejecución simultánea. La pausa se aplica después de guardar la etapa actual. Al reiniciar, los trabajos en curso quedan pausados. Las llamadas de recepción incierta conservan una reserva y bloquean el reenvío automático; aún falta una herramienta administrativa para resolver esas reservas desde la UI. Las respuestas de proveedor con errores de entrada/permisos/cuota conocidos liberan la reserva de esa llamada.

Los límites mostrados son reservas de la aplicación; no son el saldo leído de ElevenLabs. Se reserva conservadoramente un crédito por carácter de texto de voz, incluso si el proveedor aplica un descuento. Texto usa una reserva mensual conservadora de 500.000 unidades de tokens máximos estimados; no se presenta como costo real facturado en dólares.

## Qué falta

- Configurar y verificar claves reales y la credencial del webhook; probar el circuito completo con proveedores.
- Confirmar calidad y duración con videos de 90 segundos y VSL de 300 segundos; probar diez y después 25 capítulos reales.
- Voz distinta por personaje, biblioteca articulada 2D, imagen generativa, selección de imagen por escena y edición avanzada de guiones.
- Integración ejecutada de CODE ART, Sloth o Concat; esta primera plantilla no es una integración de esos programas.
- Calendario y publicación Facebook/Instagram, métricas y recuperación administrativa de llamadas inciertas.
- Acceso por `studio.smartgowth.online`, despliegue Netlify y login remoto. El servicio actual es exclusivamente local, no debe exponerse directamente en una IP pública.

El frontend de esta primera entrega es HTML/CSS/JavaScript, servido por Node. El panel puede alojarse como estático en una etapa posterior, pero necesita resolver autenticación y acceso remoto al estado; subir estos archivos por sí solo no convierte el motor local en un servicio remoto.

## Verificación

`npm test` comprueba reservas, duplicados, orden de producción y formatos de solicitudes. También se verificó por HTTP el rechazo de peticiones sin sesión o con origen externo, la persistencia de una temporada, el bloqueo sin claves y la entrega parcial del MP4 para reproducción. En Chrome se comprobó el formulario, la persistencia tras recargar, el mensaje de claves pendientes dentro del diálogo y la reproducción del video. Las pruebas no equivalen a una ejecución audiovisual pagada. Datos privados y archivos generados están ignorados por Git; no incluirlos en paquetes de despliegue.
