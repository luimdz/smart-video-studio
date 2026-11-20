# Piloto automático

En **Piloto automático**, selecciona el perfil, escribe una frase y pulsa Crear. El estudio crea e inicia el trabajo en una sola solicitud. Admite entre 1 y 25 reels, incluidos dos capítulos. Usa el perfil, su voz y las claves existentes. Las aprobaciones intermedias del formulario detallado se omiten en este modo; las validaciones de guion, continuidad, objetos 2D, presupuesto y llamadas inciertas siguen activas. La coordinación del piloto es local: no exige el antiguo workflow coordinador de n8n.

Antes de usarlo: configura una voz para el perfil, texto y ElevenLabs, biblioteca disponible y recursos CODE ART si eliges 2D. Si falta algo, la solicitud queda pausada con la causa visible. Completa la configuración y reanuda esa misma producción; no vuelvas a crearla. Los errores de producción conservan los avances. Después de reiniciar se recuperan automáticamente los trabajos del piloto interrumpidos por el reinicio cuando no existen cargos inciertos y pasa la comprobación previa.

## Publicación real en Instagram y Facebook

La creación local funciona sin un publicador. La publicación requiere un **workflow adicional conectado a las cuentas de Meta**; el antiguo coordinador no sirve como publicador. Esta entrega incorpora la cola y el contrato de conexión, no instala ni autentica ese workflow en la cuenta del propietario. No incluye un robot de Chrome ni acceso a las cuentas del usuario.

Configura una vez el webhook HTTPS de `n8n.planifyx.com` y un token privado en la sección de conexión del publicador. El token se cifra en el equipo. El workflow debe comprobar `X-Studio-Token` antes de procesar el video y tener credenciales Meta con acceso de publicación. Vincula Instagram profesional con la página Facebook y completa los destinos de ambas redes en las preferencias del perfil. El workflow debe mapear **profileId + platform + destination** a IDs de cuentas autorizadas; rechazar destinos desconocidos, nunca usar una cuenta predeterminada de otro perfil.

Con la conexión configurada, se activa Publicar automáticamente. La primera hora se propone para mañana a las 19:00 en la zona del dispositivo; puedes cambiarla, elegir las redes e indicar el intervalo entre capítulos. La zona del navegador se convierte a ISO UTC antes de guardar. El mismo reel se envía una vez por cada red seleccionada.

El servidor debe permanecer abierto y el ordenador encendido a la hora de envío. La agenda se guarda en SQLite y sobrevive a reinicios. Si el video no está listo o el equipo está apagado durante más de 15 minutos después de la hora elegida, se marca Horario vencido y exige reprogramación. No se publica tarde sin decisión del propietario. Cancelar antes del envío no cancela la creación del video.

### Contrato del workflow publicador (versión 1)

POST multipart/form-data al webhook configurado, con `X-Studio-Token` y `Idempotency-Key`. Campos:

- `video`: archivo MP4 local, MIME video/mp4 (máximo 500 MB).
- `manifest`: JSON con protocolVersion, publicationId, productionId, episode, platform, profileId, destination, scheduledAt, title y caption.

El workflow recibe el archivo binario; no puede descargar `127.0.0.1` desde n8n. Debe subirlo a Meta y devolver una respuesta **solo después de obtener un ID real de publicación**, no al aceptar el webhook. Si la API elegida necesita URL pública para Instagram, el workflow debe alojar el archivo temporalmente en almacenamiento autorizado y gestionar su eliminación. La aplicación no hace público el disco local.

El workflow debe deduplicar por publicationId de forma persistente antes de publicar. Si el mismo ID se consulta otra vez, devolver su recibo guardado, nunca crear otro post. Solo puede responder así cuando Meta confirma:

```json
{
  "protocolVersion": 1,
  "publicationId": "el-id-recibido",
  "platform": "instagram",
  "status": "published",
  "remoteId": "id-real-de-la-publicacion"
}
```

Un acuse genérico como `{ "ok": true }`, un timeout o cualquier respuesta sin ese recibo deja el envío **incierto**. No se reintenta automáticamente ni se permite reprogramarlo desde el estudio: comprueba la red y el historial del workflow antes de una acción manual. Los envíos en curso al reiniciar también quedan inciertos. Que haya URL y token significa configurado; no acredita permisos hasta un envío confirmado.

## Analítica y referencias

El estudio admite una fuente de métricas mediante otro webhook de lectura, configurado una vez con su token privado. Consulta cada 6 horas mientras el servidor está encendido y antes de iniciar una producción; también hay un botón de consulta manual. La fuente debe obtener métricas observadas mediante acceso autorizado. No se incluyen scraping, descubrimiento ilimitado de competidores ni autorización de Meta. Los permisos disponibles determinan qué cuentas puede consultar la fuente.

Petición POST JSON, con X-Studio-Token:

```json
{"protocolVersion":1,"action":"collect-metrics","profiles":[{"id":"uuid-del-perfil","instagram":"cuenta","facebook":"pagina"}]}
```

Respuesta:

```json
{"protocolVersion":1,"rows":[{"profileId":"uuid-del-perfil","platform":"instagram","account":"cuenta","url":"https://www.instagram.com/reel/identificador/","title":"Tema observado","views":17000,"publishedAt":"2026-11-19T12:00:00Z","observedAt":"2026-11-20T12:00:00Z"}]}
```

También puedes importar el array rows como JSON desde la interfaz. No debe contener claves, estimaciones inventadas ni proyecciones de la IA. Las importaciones son atómicas y conservan la observación más reciente de cada enlace; un enlace no se reasigna a otro perfil.

El rendimiento relativo usa la mediana de **otros** reels de la misma cuenta, red y perfil. Solo compara observaciones separadas por no más de siete días y reels con entre la mitad y el doble de antigüedad del evaluado. Necesita cinco referencias, mediana mayor que cero y observación de los últimos siete días. Una muestra insuficiente o antigua no se etiqueta viral. Esta medida es una señal editorial, no una predicción ni prueba causal.

Las referencias con al menos tres veces la mediana pueden orientar el gancho de una nueva producción del mismo perfil. La idea del usuario sigue siendo el objetivo; se pide no copiar ni prometer viralidad. No se hace una verificación web de hechos por disponer de estas métricas.

## Validación de esta entrega

Las pruebas de IA, voz, publicación y métricas usan proveedores simulados. La prueba de navegador sí genera un MP4 real con FFmpeg desde el formulario de una frase, sin guardar e iniciar por separado. No se publicó contenido en cuentas reales ni se configuraron workflows externos durante el desarrollo.
