# Serie · avance 01

## Avance local del 8 de noviembre de 2026

La implementación independiente vigente está en `../estudio-local/`; consultar su README. Tiene UI local, SQLite, configuración de claves, perfiles, solicitudes, planificación, voz y un primer renderer FFmpeg. Se verificaron la interfaz, el guardado y una exportación de prueba de ocho segundos; la ejecución pagada con proveedores sigue pendiente. El frontend de esta entrega es HTML/CSS/JavaScript, separado del prototipo React descrito abajo.

El nuevo [coordinador local de n8n](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M) pasó una prueba manual (7249955, success, action=bible). Está desactivado y requiere Header Auth y publicación. El Mac inicia llamadas por etapa; no se expone un servicio entrante ni se envían medios a n8n. El borrador anterior se conserva como antecedente.

El usuario confirmó un SSD externo con 600 GB libres y tres HDD externos con 450 GB cada uno. No hay compra pendiente. No estaban montados durante la comprobación; la biblioteca de prueba está en el workspace y la UI permite seleccionar la carpeta de producción.

No hay despliegue Netlify, DNS configurados ni conexión Meta. El 2D actual es un presentador ilustrado básico; falta la biblioteca articulada del reparto. Concat, Sloth y CODE ART no se probaron en ejecución.

---

Aplicación interna para administrar producción de contenido con cuentas, planes y perfiles separados. Nombre de trabajo: Serie.

Actualización del 8 de noviembre de 2026: seguimos con uso propio y UI local. Se recuperó acceso a n8n y se verificó su conexión MCP; retomamos su uso para coordinar etapas. Ver `ALCANCE_ACTUAL.md`. Las funciones de cuentas, roles y planes descritas abajo corresponden a la primera entrega construida; su ampliación comercial queda aplazada. La migración local aún está pendiente.

## Implementado

- Interfaz en español, adaptable a móvil, para estudio, perfiles, solicitudes, cuentas, planes y conexiones.
- Datos persistentes en D1: cuentas, permisos, marcas, solicitudes, episodios, reservas y auditoría.
- Administrador master; usuarios de cuenta con roles administrador, editor y lectura.
- Planes Básico, Pro y Unlimited, con límites iniciales y ajustes por cuenta.
- Perfiles independientes para clientes o páginas dentro de cada cuenta.
- Solicitudes de temporadas de 10–25 capítulos, videos individuales y micro VSL de 120–300 segundos.
- Dos modos visuales declarados: 2D reutilizable e imágenes con movimiento.
- Comprobación de cupos de perfiles y admisión atómica de minutos, presupuesto y concurrencia.
- Flujo n8n de planificación guardado como borrador desactivado: ficha, arco, todos los guiones, revisión global y correcciones. Sus 11 nodos operativos y una nota pasaron validación de estructura por MCP. Incluye comprobación de configuración, dos grupos y un límite de ejecución de una hora. No se ejecutó con servicios reales.
- API de servicio para ejecutar esas etapas con Gemini y persistir cada resultado.
- Exportación de ficha, plan y guiones en JSON.

## No terminado ni probado con proveedores reales

- El borrador n8n existe en la instancia real, pero todavía no tiene credenciales ni dirección del servicio del estudio. No se publicó ni se probó su ejecución completa. Enlace: https://n8n.planifyx.com/workflow/nXxX78sTEMDckmwA.
- Solicitudes pagadas a Gemini, ElevenLabs o proveedores de imagen.
- Sistema articulado de personajes 2D y adaptación de CODE ART como servicio.
- Generación de voz, imágenes, render, portadas y archivos MP4.
- Publicación y calendario de Facebook e Instagram.
- Exportación audiovisual completa para TikTok y YouTube; la exportación actual solo contiene datos y guiones.
- Recuperación operativa completa de una ejecución fallida o de recepción incierta. Conserva los resultados y reserva el presupuesto; no reenvía automáticamente una solicitud de recepción incierta.
- Facturación, cobros, onboarding y acceso público de clientes: aplazados y fuera de la etapa de uso propio.

La UI no simula videos terminados, publicaciones ni conexiones. `scripts_ready` significa guiones terminados, no temporada audiovisual terminada. Los perfiles y personajes de la planificación son especificaciones; la biblioteca de recursos animados se implementa en la fase visual.

## Acceso actual

La primera entrega se construyó para acceso privado mediante Sites, pero no tiene un despliegue confirmado. Utiliza la identidad proporcionada por ese alojamiento, simulada durante la prueba local. En la primera visita autenticada se fija el administrador master y se crea la cuenta «Mi estudio». La próxima adaptación a un servicio local independiente debe sustituir esa dependencia. Las asignaciones de correo existentes no envían invitaciones ni conceden acceso al sitio.

Los roles y comprobaciones de pertenencia ya existen en el servidor; el acceso externo debe probarse antes de comercializar. Esta primera entrega no incluye login independiente por contraseña ni altas públicas.

## Planes iniciales, editables

| Plan | Perfiles | Minutos/mes | Capítulos | Segundos/video | Concurrencia | Presupuesto mensual inicial |
|---|---:|---:|---:|---:|---:|---:|
| Básico | 3 | 120 | 10 | 180 | 1 | USD 25 |
| Pro | 20 | 900 | 25 | 300 | 3 | USD 150 |
| Unlimited | Sin cupo fijo | Sin cupo fijo | 25 | 300 | 5 | USD 500 |

Son valores de configuración, no precios de venta. Unlimited conserva presupuesto y concurrencia. El master puede modificar los valores en cada cuenta. El período mensual usa America/Guatemala. El presupuesto se reserva antes de enviar a n8n y no se registra como un cobro realizado. El costo real de voz, imagen y render se añadirá con las etapas de producción.

## Siguiente entrega

1. Adaptar almacenamiento y acceso para la versión local de uso propio.
2. Conectar n8n con el servicio del estudio y completar recuperación de trabajos y control de presupuesto.
3. Conectar la planificación de una temporada completa desde la UI.
4. Añadir servicio de voz y motor visual, con personajes reutilizables y recursos de referencia.
5. Validar una temporada audiovisual completa y su costo real.
6. Añadir calendario y publicación Meta. La apertura comercial queda para una etapa posterior.

## Verificación

Pasaron cinco pruebas de dominio para duración, capítulos, planes y cambio de mes, y siete pruebas con SQLite real para presupuesto, aislamiento entre cuentas, duplicados, cambio de plan, suspensión y ocho solicitudes concurrentes para un solo cupo. La compilación y la comprobación de tipos terminaron correctamente. En Chrome se comprobó inicio de sesión de prueba local, creación de perfil, guardado de una solicitud de diez capítulos, bloqueo de envío sin n8n y persistencia después de recargar. También se inspeccionaron las pantallas master, límites y planes. La captura está en `outputs/panel-verificado.png`. Los datos de prueba solo existen en la base local y no se incluyen en el código.

Las pruebas de SQLite no equivalen a una auditoría completa de permisos o a una prueba de proveedores. La subida del código y el despliegue privado de la UI quedaron pendientes de autorización del usuario tras un rechazo de la revisión automática de permisos. No se confirmó ningún alojamiento de la UI ni se debe presentar una URL esperada como sitio desplegado. La conexión y creación de un borrador en n8n se realizaron después de que el usuario autorizara conectar su instancia; no implican un despliegue de la UI.
