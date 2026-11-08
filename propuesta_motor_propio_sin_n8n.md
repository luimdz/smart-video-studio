Propuesta de arquitectura: motor propio de producción audiovisual

Estado: diseño para una primera versión de uso propio, sin n8n. El alcance vigente se recoge en `plataforma/ALCANCE_ACTUAL.md`. La prioridad es un usuario propietario, perfiles de páginas y negocios, presupuesto, producción completa de temporadas y publicación automática solo en Facebook e Instagram. El portal de clientes y los planes comerciales se evaluarán posteriormente. La migración de código no está terminada y este documento no autoriza subir código ni publicar el sitio.

**Recomendación**

Construir la aplicación con su propio coordinador de producción. Empezar con una UI web local, un servicio Node en segundo plano, SQLite para datos y una carpeta de archivos persistentes. La IA se usa mediante APIs para las decisiones creativas; las etapas, presupuestos, reintentos y render se ejecutan con código de la aplicación. No se requiere n8n ni un producto equivalente.

El diseño debe separar la ejecución de trabajos del alojamiento de la UI. Después se puede alojar el servicio en un servidor disponible permanentemente o combinar panel alojado con procesamiento local. Empaquetar la UI en una aplicación de escritorio es una opción posterior, no un requisito para producir los primeros videos.

**Opciones comparadas**

| Opción | Funcionamiento | Ventaja | Compromiso |
|---|---|---|---|
| Web local con motor propio | Abrir la UI en el navegador; un servicio local ejecuta las tareas | Menor complejidad inicial; aprovecha el equipo y la UI existente | Producción y programación local requieren equipo encendido, proceso activo e internet |
| Aplicación de escritorio | Misma UI y motor dentro de Electron | Experiencia de aplicación, acceso cómodo a archivos | Añade instaladores, actualizaciones y mantenimiento por sistema operativo |
| Aplicación alojada y servicio de producción | Panel, datos y ejecución en infraestructura permanente; render en servidor o equipo conectado | Operación continua y futuro acceso de clientes | Alojamiento, almacenamiento, seguridad operativa y mantenimiento |

La primera opción permite avanzar sin contratar un orquestador. La tercera es el destino natural de un producto con clientes. La segunda puede añadirse si la comodidad de instalación tiene prioridad; no sustituye por sí misma un servidor que trabaje con la computadora apagada.

**Qué se conserva de lo construido**

- UI React y formularios de marcas, cuentas, planes y producciones.
- Reglas de duración, capítulos, presupuesto y límites por cuenta.
- Esquema de ficha de personajes, escenarios, arco, guiones y continuidad.
- Generación por etapas ya programada en `plataforma/lib/planner.ts`.
- Reglas de pertenencia a cuentas y separación de perfiles.
- Concepto de reservas, bloqueo temporal de trabajos y auditoría.
- Pruebas existentes, que se adaptan y amplían para la nueva ejecución.

El almacenamiento actual utiliza la API D1 de Cloudflare, y el acceso utiliza la identidad de Sites. Para una aplicación Node independiente hay que crear adaptadores de datos y acceso. Las tablas y buena parte del SQL son aprovechables; no basta con cambiar una URL. El control de trabajos y la recuperación tras interrupciones deben completarse.

**Qué sustituye a n8n**

Un coordinador persistente consulta tareas pendientes, reclama una con exclusión mutua y ejecuta su siguiente etapa. El navegador crea solicitudes y consulta avances; no mantiene viva la producción. Cerrar la pestaña no debe detenerla mientras el servicio siga activo.

Recorrido propuesto:

Solicitud y reserva → ficha y recursos de serie → arco completo → todos los guiones → revisión de continuidad → voces y tiempos reales → escenas 2D/ilustradas → render por episodio → comprobaciones → paquete completo de temporada → calendario de Meta.

Cada tarea guarda cuenta, perfil, producción, capítulo, escena, etapa, versión, estado, intentos, vencimiento del bloqueo y resultado. Los recursos compartidos pertenecen a una versión de la serie. Los reintentos se limitan a la tarea afectada. Una publicación de recepción incierta se consulta antes de intentar enviarla de nuevo.

Los bloqueos vencidos permiten recuperar trabajo después de una interrupción. En operaciones pagadas, guardar IDs del proveedor cuando existan y distinguir una respuesta incierta de una solicitud que nunca empezó. No prometer exactamente una ejecución o un cobro si el proveedor no ofrece esa garantía.

La cola inicial puede vivir en SQLite con transacciones y admisión atómica. Un único proceso coordinador y pocos renders simultáneos bastan para validar el uso interno. La base queda en disco local, con copias de seguridad consistentes; no dentro de una carpeta sincronizada como sustituto de un servidor de base de datos. Si se reparte la carga entre máquinas, migrar la cola/datos a un servicio apropiado para ese escenario.

**Cómo aprovechar el enfoque de Sloth**

Conservar las ideas generales: catálogo visual de estilos, recursos de personaje persistentes, descripción estructurada de escenas, previsualización, seguimiento por fases y render en el equipo. Implementar estas piezas de forma independiente.

La IA devuelve datos validados: texto, personajes, escena, recursos, duración y movimientos permitidos. Un catálogo propio interpreta esos datos con código ya desarrollado. Para 2D, reutilizar poses y expresiones disponibles; para ilustraciones, usar imágenes, capas y movimientos de cámara. Una petición fuera de las posibilidades del catálogo necesita un nuevo recurso o plantilla; no queda resuelta solo con el prompt.

Sloth combina UI con agentes que operan herramientas. Nuestro enfoque propuesto permite una UI sin chat y llamadas API acotadas a las etapas creativas. No se sustituye n8n por un agente de programación que tenga que reconstruir los videos en cada ejecución.

La licencia de Sloth restringe vender el software o productos/servicios cuyo valor derive sustancialmente de su funcionalidad, y permite vender los contenidos producidos. No incorporar su código a una plataforma comercial sin una autorización compatible. Los derechos de CODE ART y de los demás recursos se deben confirmar antes de distribuir el motor; esta propuesta no determina esos permisos.

**Producción de temporadas completas**

Una solicitud produce los 10–25 capítulos completos. El coordinador puede procesar cada tarea por separado sin pedir nuevas instrucciones al usuario. Primero termina la planificación y todos los guiones; después comparte recursos visuales, produce voz y renderiza episodios con concurrencia limitada. La temporada pasa a «lista» únicamente cuando todos los videos y sus entregables pasan las comprobaciones.

La voz determina la línea de tiempo real. El render no fija ciegamente cinco segundos por escena. Un cambio de guion invalida el audio y los recursos dependientes; un cambio visual conserva la voz si no cambió lo que se dice. La caché debe considerar texto, proveedor, voz, modelo, ajustes y versión visual.

Las métricas posteriores orientan la siguiente temporada. La programación respeta el orden de capítulos y no modifica silenciosamente las historias ya terminadas.

**Publicación y equipo apagado**

La publicación automática de Facebook e Instagram será otro módulo del servicio, con cuentas autorizadas, copys por destino y calendario. No depende conceptualmente de n8n. Hay que implementar y probar por separado la subida, el procesamiento, la publicación y la consulta de resultados.

Si toda la aplicación es local, la publicación requiere equipo encendido, sin suspensión, internet y servicio activo. Si se necesita publicar con el equipo apagado, subir los videos terminados y ejecutar el calendario en un servidor disponible permanentemente. Esa decisión es independiente de empaquetar la UI como aplicación de escritorio.

**Costos y responsabilidades**

Se elimina la necesidad de una suscripción a un orquestador, pero no los costos de APIs, cómputo, electricidad, almacenamiento o mantenimiento. El motor propio requiere implementar y mantener estados, cola, reintentos, presupuestos y observabilidad que antes se habrían coordinado con n8n. El ahorro principal de producción continúa estando en 2D e imágenes con movimiento frente a clips generativos completos.

No se vuelve a calcular en esta propuesta el precio por video: faltan mediciones del render y de los proveedores reales. El propietario mantiene presupuesto por perfil y por temporada. El gasto real se separa de las reservas y se conserva evidencia de unidades consumidas. La asignación de planes a cuentas externas queda aplazada.

**Orden de trabajo propuesto**

1. Separar acceso a datos, autenticación y configuración del alojamiento actual.
2. Sustituir envío/llamadas de n8n por cola y coordinador propios, con progreso, pausa, cancelación y recuperación.
3. Comprobar todo el recorrido con proveedores simulados claramente identificados y cortes deliberados del proceso.
4. Conectar una API real de texto y producir una temporada completa de guiones.
5. Construir el catálogo 2D e ilustrado; integrar voz, tiempos, render y comprobaciones.
6. Generar una temporada audiovisual completa, medir costo y tiempo, y validar identidad de protagonistas.
7. Implementar calendario Meta y decidir el alojamiento permanente necesario.
El acceso comercial, las suscripciones y la facturación quedan fuera de esta etapa y no condicionan los pasos anteriores.

**Referencias técnicas consultadas**

- [Procesos de Electron](https://www.electronjs.org/docs/latest/tutorial/process-model): separación entre interfaz y proceso principal.
- [SQLite WAL](https://www.sqlite.org/wal.html): concurrencia y restricciones de una base compartida entre procesos del mismo equipo.
- [BullMQ](https://docs.bullmq.io/): posible biblioteca interna de colas para una etapa posterior; no es necesaria para arrancar ni sería otra plataforma visual que el usuario deba operar.
- [Licencia de Sloth](https://github.com/Vancci-sloth/Sloth/blob/main/LICENSE): restricciones comerciales y derechos sobre los contenidos producidos.
