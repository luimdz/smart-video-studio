# Conectar el flujo de planificación

Actualizado el 8 de noviembre de 2026. Conexión MCP autenticada y verificada mediante lectura de contexto, workflows y credenciales. La instancia estaba vacía y sin credenciales.

Borrador real: [Serie · 01 Planificar temporada completa](https://n8n.planifyx.com/workflow/nXxX78sTEMDckmwA), ID `nXxX78sTEMDckmwA`. Guardado, con estructura validada y desactivado; no se ejecutó ni publicó.

Archivo importable sincronizado con el borrador: `public/workflows/01-planificar-temporada.json`. Fuente para el constructor MCP: `public/workflows/01-planificar-temporada.sdk.js`. No importar de nuevo en esta instancia: el borrador ya existe. El archivo SDK se interpreta por el constructor n8n, no se ejecuta directamente con Node.

Contiene 11 nodos operativos y una nota, organizados en dos grupos: entrada/configuración y planificación. Usa nodos estándar Webhook, Edit Fields, HTTP Request, IF, Wait, Stop and Error y No Operation. La configuración de cada nodo y el grafo completo pasaron validación; esta comprobación no prueba conectividad, secretos ni generación de contenido.

## Configuración segura

En el servidor del estudio, configurar mediante el gestor de secretos:

- `GEMINI_API_KEY`: clave del proveedor de texto.
- `GEMINI_MODEL`: por defecto `gemini-3.1-flash-lite`. Otro modelo requiere revisar el cálculo de tarifa y presupuesto antes de habilitarlo.
- `WORKER_TOKEN`: secreto aleatorio de al menos 32 caracteres para la API de servicio.
- `N8N_WEBHOOK_URL`: URL HTTPS de producción del Webhook del workflow.
- `N8N_WEBHOOK_TOKEN`: secreto del Header Auth de entrada a n8n.

En n8n, configurar dos credenciales y seleccionarlas en los nodos del borrador:

1. Header Auth «Serie · Entrada n8n»: cabecera `X-Studio-Token`, con el mismo valor de `N8N_WEBHOOK_TOKEN`.
2. Credencial de tipo `httpTemplatedCustomAuth` «Serie · Servicio privado», para ambos nodos HTTP Request. La plantilla debe enviar `Authorization: Bearer <WORKER_TOKEN>`, tomando el valor de un campo secreto de la credencial. Si se conserva Sites privado como alojamiento, también necesita `OAI-Sites-Authorization: Bearer <token de acceso de servicio al sitio privado>`. Los nombres y valores definitivos de los campos secretos se configurarán mediante el formulario de credenciales, después de resolver el alojamiento.

El token adicional solo corresponde al alojamiento Sites privado; no es necesario por utilizar n8n. No hay un alojamiento de la UI confirmado. No poner claves en el JSON del workflow, las notas o los formularios de negocio. Usar los formularios de credenciales del proveedor y el gestor de secretos del servicio.

El campo `studioUrl` del nodo «Configurar estudio» está vacío: se retiró la dirección provisional que no tenía un despliegue confirmado. La comprobación previa detiene el workflow si falta una dirección HTTPS o si el identificador no tiene formato UUID. Configurar la dirección real antes de probar. La entrada es `{ "productionId": "UUID de la solicitud" }`. Los datos de la cuenta y la marca se cargan en el servidor; el webhook no recibe planes ni permisos controlados por el navegador.

n8n alojado no puede alcanzar `localhost` de este equipo directamente. Si mantenemos la UI local, hace falta una conexión autenticada y alcanzable para el servicio de trabajo, o adaptar el intercambio mediante una cola. No se abrió un túnel, no se publicó un servicio local y no se desplegó la web durante esta conexión.

## Ejecución

La UI guarda la solicitud. Con n8n configurado, reserva presupuesto/minutos y envía el identificador. El workflow reclama la solicitud con su execution ID; una ejecución duplicada se detiene. A continuación llama a la siguiente etapa y repite con pausa hasta que los guiones están listos.

Cada etapa persiste su resultado y utiliza un bloqueo temporal de ejecución. Las correcciones de continuidad tienen un máximo de dos revisiones globales. La ficha, el arco y cada guion se validan antes de avanzar. El esquema de los guiones limita las plantillas visuales a una lista fija y rechaza personajes/lugares inexistentes.

La planificación lleva un cupo conservador por llamada con el modelo fijado. Se guarda separado del presupuesto reservado de toda la producción. No representa todavía el costo completo medido o facturado. No activar producción real sin verificar tarifas, claves y límites del proveedor.

## Fallos y alcance

Un fallo conserva lo producido y detiene el flujo. Un timeout de envío queda como «Revisar conexión» con presupuesto reservado: comprobar n8n antes de reenviar para evitar duplicados. La recuperación administrativa de esos casos queda pendiente en esta entrega.

La salida actual es `scripts_ready`, con progreso 80: ficha, plan, guiones y copies. Los 20 puntos restantes se reservan para las etapas audiovisuales y verificación final. El workflow no genera voz, imágenes ni MP4 y no publica contenido.

La instancia conectada es `https://n8n.planifyx.com`; no se instaló n8n en este equipo. El borrador tiene zona horaria America/Guatemala y tiempo máximo de ejecución de 3600 segundos. Los datos de ejecuciones exitosas no se conservan en el historial n8n; se habilitó el guardado de errores y ejecuciones manuales para diagnóstico. El servicio del estudio es el responsable de persistir los guiones.

Pendiente para la primera prueba completa: resolver acceso al servicio y almacenamiento, configurar Gemini en ese servicio, crear las dos credenciales n8n y probar con una solicitud de la UI. Voz, imágenes, render y Meta continúan fuera de este primer workflow.
