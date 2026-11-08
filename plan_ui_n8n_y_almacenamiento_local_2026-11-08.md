# Propuesta de implementación: UI, n8n y producción local

Fecha: 8 de noviembre de 2026. Propuesta inicial con actualización de implementación al final. No hay despliegue Netlify realizado ni DNS configurados.

## Decisión recomendada

Netlify para la interfaz y pequeñas funciones de acceso; n8n alojado para coordinar; un servicio en el Mac para voces, recursos, montaje, exportación, comprobaciones y envío de archivos a Meta. Biblioteca y medios en un disco externo. Un propietario y perfiles para sus páginas y negocios; comercialización aplazada.

Subdominio propuesto: `studio.smartgowth.online`, respetando la escritura del dominio facilitada por el usuario. Los DNS están en IONOS. Primero se verifica un circuito local completo; después se conecta la misma interfaz al subdominio.

El diseño no necesita almacenar MP4, voces o imágenes en Netlify, un bucket, Drive o las ejecuciones n8n. Sí utiliza servicios en la nube para código de la UI, autenticación y pequeños registros de control. Los proveedores de IA procesan los datos enviados y Meta aloja el contenido publicado. Esa distinción debe conservarse: almacenamiento audiovisual local no significa procesamiento íntegramente fuera de la nube.

## Estado comprobado

- Hay una base de interfaz React en `plataforma/`, dependiente de Sites, D1 e identidad del alojamiento. No es una UI operativa para producir videos ni un despliegue confirmado.
- La conexión MCP funciona. Hay un [borrador de planificación](https://n8n.planifyx.com/workflow/nXxX78sTEMDckmwA), desactivado, con estructura validada y sin ejecutar. Depende de un servicio `/api/worker` aún sin dirección real ni credenciales.
- El Mac es un MacBook Pro Apple M1 con 8 GB de memoria. El volumen consultado muestra aproximadamente 40 GiB disponibles; no se ha medido rendimiento de render.
- ElevenLabs: Starter, 30.000 créditos mensuales, informado por el usuario. La API key existe, pero no se ha configurado en esta aplicación.
- Las rutas originales de CODE ART y del workflow Markdown ya no están disponibles. Se conservan los análisis anteriores; antes de adaptar esos recursos hay que localizar los originales.
- Concat y Sloth se analizaron, pero no se instalaron ni probaron como motores en este Mac.

## Netlify frente a Vercel

Para esta primera versión elegiría Netlify con React y TypeScript. La UI no requiere renderizado web en servidor: el trabajo pesado se ejecutará en el Mac. Se pueden reaprovechar componentes visuales de la base actual, retirando las dependencias de Sites y D1 de la producción local.

Vercel también sirve para la interfaz, pero no basaría una herramienta orientada a negocios y monetización en Hobby: su [política de uso comercial](https://vercel.com/docs/limits/fair-use-guidelines) reserva ese uso a Pro o Enterprise. Netlify permite comenzar con un [plan Free sujeto a créditos](https://www.netlify.com/pricing/); se debe controlar su uso y comprobar las condiciones de la cuenta.

Las funciones de alojamiento solo atenderán autenticación, solicitudes y estados. No renderizarán ni transportarán archivos audiovisuales. Los [límites documentados de Netlify](https://docs.netlify.com/build/functions/configuration/) incluyen duración y tamaño de respuesta; separar el proceso largo evita depender de ellos para producir videos.

Para IONOS: añadir el dominio en Netlify, copiar el destino CNAME real que este proporcione y crear el registro de host `studio` en IONOS. Verificar HTTPS. No hace falta trasladar el dominio completo. [Configuración con DNS externos](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/).

## Conexión entre n8n y el Mac

Preferencia: un conector local inicia conexiones salientes y consulta una cola de trabajos pequeños. No requiere publicar el disco o abrir puertos del router. Las funciones de la UI y el conector se autentican; los secretos nunca forman parte del código del navegador.

La propuesta inicial contemplaba consultar una cola remota mediante API o MCP. La primera implementación simplifica esa conexión: el Mac llama a un webhook n8n por transición; el workflow devuelve una instrucción de etapa y SQLite local conserva la cola y el resultado. Evita sondeos en reposo y credenciales de administración de n8n en la aplicación.

Las consultas de estado no deben disparar un workflow nuevo en cada sondeo. Usar consultas de datos, intervalos adaptativos y avisos de finalización. Medir cuotas y tráfico antes de dejarlo funcionando de forma continua.

SQLite local conserva historial, canon, biblioteca, rutas y resultados detallados. El coordinador n8n recibe identificadores, indicadores y contadores. Hay un único trabajador inicialmente. La protección de cobros es una reserva conservadora; publicación Meta y prevención de publicaciones duplicadas siguen pendientes.

El conector recibe tareas tipadas, no comandos de sistema arbitrarios. Las rutas de medios se resuelven dentro de la biblioteca configurada. Un trabajo termina con evento persistente de resultado y aviso a n8n. El borrador actual debe adaptarse a esta comunicación; no está conectado así todavía.

Desde otro equipo el panel podrá mostrar información y solicitar trabajo, pero la producción, reproducción local y subida de archivos dependerán del Mac. Si está apagado o suspendido, la cola espera. Una previsualización remota de MP4 necesitaría transmisión adicional, que no forma parte de esta primera versión.

## Almacenamiento recomendado

El usuario confirmó un SSD externo con 600 GB libres y tres HDD externos con 450 GB cada uno. Podemos avanzar sin compras. Preferir el SSD para producir y los HDD para archivo o copias; la aplicación permite seleccionar la biblioteca. El almacenamiento no es el bloqueo actual.

Para uso exclusivo en Mac, APFS es la opción recomendada. Si es necesario compartir físicamente con Windows, evaluar exFAT y sus limitaciones operativas. No formatear un disco con datos sin preparar previamente su conservación. Apple recomienda [APFS para almacenamiento de trabajo audiovisual en Mac](https://support.apple.com/en-gb/102116).

El disco interno conserva aplicación y datos pequeños de funcionamiento. El externo conserva medios, proyectos, biblioteca y temporales. El índice local guarda referencias estables al volumen; si se desconecta o falta espacio, se pausa el trabajo sin recurrir silenciosamente al disco interno.

Ejemplo de estructura: `SmartStudio/perfiles/<perfil>/series/<serie>/capitulos/<numero>/`, con MP4, voz, tiempos, subtítulos, títulos, copies y manifiesto de montaje. La biblioteca compartida conserva una sola copia de cada personaje, pose, fondo o música reutilizada.

Estimación de archivos finales con vídeo a 8 Mbps y audio a 128 kbps, en GB decimales:

| Entrega | Tamaño aproximado |
|---|---:|
| Video de 90 segundos | 91 MB |
| Video de 180 segundos | 183 MB |
| VSL de 300 segundos | 305 MB |
| 25 capítulos de 180 segundos | 4,6 GB |
| 25 videos de 300 segundos | 7,6 GB |

Es una cuenta por duración y bitrate, no un tamaño garantizado. No incluye imágenes, voces separadas, versiones, proyectos ni temporales. La compresión variable y la complejidad de cada escena cambian el resultado.

Política propuesta: una exportación simultánea, comprobación de espacio antes de cada etapa, límite de temporales y limpieza solo de archivos regenerables tras verificar la exportación. Conservar voces para no volver a pagarlas. Publicar no equivale a tener respaldo: mantener una segunda copia en otro dispositivo físico, que puede ser un HDD de archivo. Time Machine es una [opción de copia local](https://support.apple.com/en-us/104984); hay que comprobar que incluya la biblioteca externa. No considerar una segunda partición del mismo disco como protección ante una avería de ese disco.

## Producción y costos

Servicio local: Node.js/TypeScript, SQLite y FFmpeg/ffprobe; ejecución al iniciar sesión y continuidad de trabajos persistentes. Con M1 y 8 GB, comenzar con una exportación simultánea a 1080 × 1920. El rendimiento real se mide antes de prometer un ritmo diario.

Primeros estilos: imágenes con acercamientos y desplazamientos; personajes 2D reutilizables por capas, poses y expresiones. La primera biblioteca es una tarea real de producción, no una propiedad que aparezca solo con un prompt. Las animaciones articuladas y sincronía labial avanzada requieren implementación específica.

Concat se integra después de superar una prueba de importación, guardado y exportación. Sigue [presentándose como beta](https://github.com/jub0t/Concat). No hacer que toda la primera entrega dependa de él. Sloth y CODE ART pueden aportar recursos y escenas cuando se comprueben sus componentes; fusionar las tres aplicaciones completas añade trabajo y dependencias innecesarias.

Falta una API de texto: propuesta inicial Gemini Flash/Flash-Lite con salida estructurada y control de presupuesto. Seleccionar y probar el modelo disponible antes de fijarlo. Una API de imagen es opcional para la primera prueba con recursos propios; hace falta si queremos crear automáticamente personajes o escenarios nuevos desde texto.

ElevenLabs: conservar `voice_id`, modelo y ajustes por personaje; generar por escenas y reutilizar las voces por huella de texto y configuración. Probar Flash v2.5 como opción económica y comparar con Multilingual v2 para narración. El endpoint de [voz con tiempos](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps) permite obtener audio y alineación para subtítulos.

Starter incluye licencia comercial según la [oferta del proveedor](https://elevenlabs.io/pricing). Los créditos no equivalen a un número fijo de videos: Multilingual v2 consume un crédito por carácter, y Flash/Turbo puede aplicar entre 0,5 y 1 por carácter según la tarifa API. Verificar la tarifa de la cuenta antes de reservar. Calcular el consumo a partir del guion final y reservar margen para correcciones; producir una temporada de 25 capítulos largos puede exceder los 30.000 créditos.

Descargar las voces al disco evita almacenarlas en nuestra nube, pero no elimina la retención del proveedor: el endpoint documenta historial por defecto y reserva la opción de retención cero a clientes Enterprise. Una condición estricta de que ningún audio exista en ningún proveedor requeriría evaluar síntesis local.

## Workflows propuestos

| Módulo | Resultado |
|---|---|
| 00 · Solicitudes | Valida formato, perfil, duración, capítulos y presupuesto; registra un ID único |
| 01 · Temporada | Coordina ficha, mundo, arco, todos los guiones y revisión global antes de producir voces |
| 02 · Producción local | Despacha tareas de voz, recursos y montaje; recibe estados y resultados |
| 03 · Comprobaciones | Comprueba MP4, duración, audio y subtítulos; habilita solo entregas válidas |
| 04 · Publicación Meta | Coordina calendario, subida desde el Mac, confirmación y prevención de duplicados |
| 05 · Resultados | Recoge métricas disponibles y permite comparar ganchos, estilos y temas |

Una solicitud puede producir toda una temporada, pero sus capítulos se renderizan en cola. El canon y los guiones se versionan antes de generar recursos pagados. El sistema muestra claramente si están listos los guiones o los audiovisuales.

## Orden de ejecución y criterios de aceptación

1. Comprobar el enlace de ida y vuelta entre n8n y el conector con una tarea sin IA y un archivo de prueba local. Confirmar que el medio nunca entra en n8n. Esto resuelve el riesgo de integración antes de construir toda la UI.
2. Seleccionar la biblioteca local/externa, comprobar permisos y volumen, montar SQLite y la cola. Probar desconexión del disco, poco espacio y reinicio.
3. Adaptar los componentes React existentes para un propietario: perfiles, crear video/serie/VSL, ficha de negocio, personajes y voces, trabajos, costos, biblioteca y calendario. El panel debe mostrar si el Mac y el disco están disponibles.
4. Conectar la API de texto y ElevenLabs en el servicio local, mediante configuración segura. Validar presupuesto y persistencia antes de la primera llamada pagada.
5. Producir un video real de 90 segundos con imágenes animadas, voz y subtítulos. Verificar archivo, duración, último fotograma, audio, ruta y costo. Después repetir con una micro VSL de 300 segundos.
6. Completar la primera biblioteca 2D reutilizable y producir una temporada de diez capítulos con continuidad y una sola solicitud. Reanudar un fallo sin volver a generar las partes terminadas. Ampliar después a 25 capítulos según recursos y presupuesto.
7. Desplegar la UI en Netlify y conectar `studio` mediante IONOS una vez comprobada la integración. No subir biblioteca ni salidas con el código.
8. Conectar Meta y probar por separado Facebook e Instagram. Después activar publicación sin aprobación por pieza, sujeta a comprobaciones automáticas y cuotas.

La publicación requiere acceso administrativo a las páginas, Instagram profesional y una aplicación/integración Meta con permisos adecuados. Elegir la modalidad de autenticación y probar envío de archivo local al principio de esta fase. Meta documenta [subida local para Facebook Reels](https://www.postman.com/meta/facebook/request/ps1ahe4/2-a-upload-local-reel). Instagram requiere confirmar el flujo compatible con la cuenta y aplicación: no prometer subida local directa ni sustituirla por un bucket sin comprobarlo. La documentación consultada de Instagram por URL exige un enlace públicamente accesible; eso no debe confundirse con un archivo privado del Mac.

Los permisos y posibles revisiones de Meta son dependencias externas: producción y exportación local pueden quedar listas antes que publicación automática.

## Información o recursos pendientes

- Disco externo disponible y carpeta elegida para la biblioteca; si no existe, presupuesto y volumen de producción para dimensionarlo.
- Cuenta Netlify y acceso a los registros DNS de IONOS para el despliegue posterior.
- API key del proveedor de texto y límite de gasto; configuración segura de ElevenLabs, sin compartir secretos por chat.
- Voces elegidas y biblioteca inicial de personajes/fondos; localizar CODE ART si se reutilizará.
- Datos reales del primer negocio o canal, objetivo, formato inicial y ejemplo de tono visual.
- Accesos Meta y comprobación de elegibilidad de las cuentas y formatos.

La automatización no garantiza viralidad ni monetización. Para ese objetivo conviene producir historias y explicaciones originales, medir retención y evitar plantillas repetidas con cambios mínimos. Meta explica su prioridad por el [contenido original y con valor creativo](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/).

## Implementación local realizada después de esta propuesta

Se creó `estudio-local/` con UI independiente HTML/CSS/JavaScript, servicio Node, SQLite y FFmpeg. Se verificó el guardado de perfiles y una solicitud de diez capítulos, y un MP4 de prueba de ocho segundos (720 × 1280, tono de prueba, sin IA). Seis pruebas automáticas pasaron.

El nuevo coordinador [Smart Studio · 00 Coordinación local](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M) pasó una prueba manual de contrato (7249955, success, action=bible). Sigue desactivado: falta configurar Header Auth y publicar. Las claves reales, la voz del perfil y la producción pagada no se han configurado ni probado. Meta, biblioteca avanzada de personajes y subdominio siguen pendientes. El README de `estudio-local/` describe el alcance y los pasos de conexión.
