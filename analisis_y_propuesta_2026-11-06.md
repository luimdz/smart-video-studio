Análisis y propuesta para producción audiovisual con n8n
Fecha de consulta: 6 de noviembre de 2026. Moneda de las estimaciones: USD.

La recomendación es construir una plataforma con UI propia, n8n como coordinador y un servicio separado para renderizar. Las dos prioridades de producción son 2D reutilizable e imágenes con movimiento. La publicación automática se limita a Facebook e Instagram; para TikTok y YouTube se entregan archivos y textos listos para programación manual. Cada solicitud de serie debe producir la temporada completa de 10–25 capítulos, con planificación, continuidad y recursos compartidos. La operación cotidiana puede funcionar sin sesiones de Codex o Claude. Adaptar los recursos e implementar la plataforma requiere trabajo de desarrollo inicial y mantenimiento.

Esta es una revisión de documentos, código y muestras existentes. No se han ejecutado solicitudes pagadas, instalado dependencias, conectado cuentas ni probado publicaciones. Las cifras son modelos de planificación, no mediciones de producción ni promesas de ingresos.

**1. Material revisado y alcance**

El MD indicado en Downloads no estaba en esa ubicación. Se encontró y revisó [workflow_videos_virales_2026.md](</Users/luiscarlos/Desktop/Contenido viral/workflow_videos_virales_2026.md>) en el Escritorio. También se revisaron la documentación principal de [CODE ART](</Users/luiscarlos/Desktop/Contenido viral/CODE ART/>), sus packs de series, estilos, captions y reutilización, plantillas comerciales, piezas, motor de voz, render y carga de escenas, y muestras visuales.

Las instrucciones de AGENTS.md, METODO.md y los prompts del workflow se analizaron como parte del producto entregado. No sustituyen el pedido del usuario: trabajar mediante UI y n8n, sin aprobaciones editoriales recurrentes. No se inició la configuración conversacional que esos documentos proponen.

| Recurso | Qué aporta | Qué le falta para este proyecto |
|---|---|---|
| Workflow MD | Secuencia de guion, imágenes, clips, voz, montaje y variantes | Workflow importable, UI completa, gestión de clientes, series largas, publicación validada y controles de gasto |
| CODE ART | Render 2D, subtítulos sincronizados, piezas, portadas, carruseles y conexión ElevenLabs | API de trabajos, plantillas parametrizadas, biblioteca de protagonistas, cola y operación desatendida |
| Packs editoriales | Estructuras de guion, calendario, temas, CTA y textos por red | Transformar instrucciones para un asistente en datos y reglas ejecutables |

**2. Qué reutilizar de CODE ART**

El motor funciona con Node, @napi-rs/canvas y FFmpeg. Dibuja los fotogramas y compone el resultado con audio. El ejemplo alcohol.mp4 tiene 48,32 segundos, 1080 × 1920, H.264, audio AAC y 60 fps. Se inspeccionaron sus hojas de planos y las muestras de piezas; no se hizo una revisión audiovisual completa del MP4.

Conviene conservar:

- motor/voz.mjs: integración de voz con tiempos por carácter y palabra, y caché por texto y ajustes para evitar pagar la misma narración otra vez.
- motor/render.mjs y motor/lib/: render, transiciones existentes, sincronización, mezcla y utilidades de revisión.
- piezas/: celular, capturas, botones, cifras y otros recursos útiles para educación y ventas.
- motor/portada.mjs y motor/carrusel.mjs: salidas adicionales con bajo costo marginal.
- Packs de captions, guion, calendario y reutilización: criterios editoriales para convertir en configuraciones.

El cambio fundamental: hoy cada proyecto necesita archivos JavaScript propios que dibujen sus planos. motor/nuevo.mjs crea un punto de partida vacío; no inventa ni dibuja automáticamente una historia completa. El método declara que sus ejemplos requirieron aproximadamente dos horas y varias rondas de revisión. Sus resultados no demuestran que la misma calidad se obtenga con una ejecución automática.

Para producción, construir una biblioteca inicial de 12–20 escenas configurables: pregunta visual, comparación, problema/solución, personaje explicando, diálogo, mapa, cronología, demostración, producto, prueba documental, oferta, objeción y CTA. El modelo elige plantillas y entrega datos validados; el motor ejecuta código ya construido. Los temas que exijan nuevas acciones o dibujos necesitarán ampliar la biblioteca o cambiar de motor.

Los protagonistas 2D deben añadirse como recursos reutilizables con poses y expresiones. La carpeta no trae un sistema completo de personajes para ficción episódica. Hay piezas humanas parciales, pero no equivalen a un elenco animado.

Separar cada trabajo en su proceso y carpeta evita colisiones de archivos temporales y del estado compartido de voz. El render final usa 60 fps por defecto, aunque acepta --fps; probar 30 fps reduce a la mitad los fotogramas, pero el ahorro de tiempo total debe medirse. Las dimensiones están fijadas en el motor, por lo que otros formatos requieren adaptación.

**3. Correcciones necesarias en el workflow MD**

1. Es una guía de construcción, no un archivo JSON listo para importar a n8n.
2. Habla de Hailuo 2.3, pero llama al endpoint hailuo-02. Hay que alinear nombre, esquema, precio y capacidades del modelo elegido.
3. En fal se confunde consulta de estado con obtención del resultado. Usar las URLs de estado y respuesta que entrega la cola, y recuperar el resultado al completar. La [documentación oficial de la cola](https://fal.ai/docs/documentation/model-apis/inference/queue) distingue ambos pasos.
4. Se generan seis segundos de video y se usan cinco. Ese patrón compra un 20 % más de duración que la utilizada. En cinco minutos finales serían 60 clips y 360 segundos generados.
5. La voz se produce después de los clips y la duración se limita por caracteres. Conviene generar primero voz y tiempos reales, y ajustar después la línea de tiempo. Los caracteres son una previsión de gasto, no un reloj preciso.
6. El montaje fija cinco segundos por clip y no define una duración maestra explícita para toda la composición. Hay que ajustar clips, música, transiciones y final de voz a la duración real.
7. La rama sin narración referencia un nodo de subida de audio que puede no haberse ejecutado. Debe tener un recorrido independiente válido.
8. El formulario ofrece estilos de subtítulos que el montaje base no aplica: está fijado a highlight. Cada selección de la UI debe llegar hasta el render.
9. 768 × 1344 corresponde a 4:7, no a 9:16 exacto. Elegir dimensiones compatibles con el proveedor y definir recorte o ajuste deliberadamente.
10. Los archivos de clientes necesitan almacenamiento persistente. Las URLs temporales no sirven como archivo de producción ni como base fiable para publicar días después.
11. Añadir límites de espera y reintentos, control de concurrencia, recuperación por escena y registro de cobros. Un timeout de consulta no debe disparar una generación pagada duplicada.
12. La publicación y las estadísticas están planteadas de forma parcial. No existe una integración probada de extremo a extremo para las cuatro redes.
13. El registro de costo usa precios fijos y no siempre el proveedor seleccionado. Debe registrar unidades reales, tarifa, moneda y etapa, distinguiendo previsión y consumo facturado.
14. Las variantes cambian texto superpuesto, música y subtítulos, pero conservan la narración. No son cinco nuevos hooks hablados. Si cambia lo que se dice, hay que regenerar ese segmento y sincronizarlo.
15. El generador de variantes recibe el tema bajo la etiqueta narración, y algunas referencias a nodos no coinciden con los nombres documentados. Revisarlas al implementar.
16. No tratar cinco variantes como una obligación. Multiplican renders y publicaciones y pueden producir contenido demasiado parecido. Empezar con pruebas limitadas y una hipótesis por experimento.

No conservar como supuestos confirmados las cuotas de Trial Reels, las características de alternativas ni los precios comerciales del documento. Por ejemplo, [Creatomate](https://creatomate.com/pricing) muestra Essential a $45/mes con facturación anual de $540 y 2.000 créditos mensuales; el número de renders depende de duración, resolución y fps. El MD usa $41 y presenta distintas estimaciones de capacidad.

**4. Arquitectura recomendada**

UI web → servicio de acceso y datos → n8n → voz/recursos/render → validación automática → calendario/publicación → métricas.

| Componente | Elección propuesta | Motivo |
|---|---|---|
| Interfaz | Web propia con formularios, biblioteca y calendario | Un lugar para operar marcas y series, sin chat |
| Automatización | n8n autoalojado | Coordinar proveedores, estados, horarios y recuperación |
| Datos | PostgreSQL; Supabase si interesa servicio administrado y autenticación | Relaciones entre clientes, series, episodios, trabajos y publicaciones |
| Archivos | Almacenamiento compatible con S3 | Conservar originales, voz, renders y evidencias |
| Render | Servicio Node + CODE ART + FFmpeg | Aprovechar los recursos y evitar un costo externo por cada render |
| Guion y copy | API Gemini Flash-Lite, con opción de otro modelo para tareas complejas | Bajo costo de texto y proveedor intercambiable |
| Voz | ElevenLabs con voz fija por personaje o marca | Aprovechar integración y tiempos existentes |
| Imágenes | Generación o edición por API y biblioteca de recursos reutilizables | Crear fondos, personajes de referencia e ilustraciones con movimiento |
| Publicación | Integración de Meta para Facebook e Instagram | Automatizar los destinos seleccionados por el usuario |
| Exportación | Paquete descargable de video, portada, título y descripción | Programar manualmente en TikTok y YouTube |

n8n debe coordinar trabajos, no dibujar miles de fotogramas dentro de sus nodos. Un servicio recibe la orden de render y devuelve un identificador; después notifica el resultado. Empezar con un render simultáneo y ampliar según las mediciones; no hace falta una infraestructura compleja desde el primer día.

Dividir la automatización en subflujos: recepción y presupuesto, planificación, series, guion y datos, voz, recursos, render, control automático, publicación y métricas. Guardar estado permite repetir solo la etapa fallida.

Las credenciales quedan en el servidor o el gestor de credenciales, nunca en el navegador. Todo recurso debe pertenecer a un cliente/marca; comprobar ese vínculo antes de generar y antes de publicar. Incorporar copia de seguridad, alertas por fallo y un botón de pausa por canal.

La [guía de licencias de n8n](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case) distingue operación interna para clientes y productos donde personas externas construyen o configuran automatizaciones. La primera versión propuesta es una herramienta interna de agencia. Si se abre la configuración de automatizaciones a clientes, revisar ese alcance comercial antes de convertirlo en un producto de autoservicio.

**5. Tipos de contenido y selección de motor**

| Producto | Duración propuesta | Producción recomendada |
|---|---|---|
| Descubrimiento y alcance | 30, 45 y 60 s | Animación breve o híbrido con una apertura fuerte |
| Educación y narración | 90–180 s | 2D o ilustraciones con movimiento y edición narrativa |
| Serie de entretenimiento | 10–25 episodios de 60–180 s | Personajes 2D o referencias visuales persistentes |
| Serie educativa o de marca | 10–25 episodios de 90–180 s | Presentador recurrente, recursos del negocio y plantillas |
| Micro VSL | 120–300 s | Demostración, producto, pruebas reales, gráficos y CTA |

El modo económico no significa dejar una imagen fija durante minutos. Debe usar encuadres, composición, acciones, texto y cambios visuales que ayuden a contar la historia. El modo ilustrado de la estimación económica supone seis imágenes por minuto y movimiento dentro de cada composición.

Para una VSL importa que se entienda la oferta y que haya pruebas del negocio. Una secuencia enteramente cinematográfica puede costar mucho más sin mejorar las ventas. Producir un máster de 120–300 segundos y derivados de 30/45/60 segundos con guiones adaptados, sin limitarse a cortar el inicio.

**6. UI que cubre los requisitos**

| Pantalla | Contenido |
|---|---|
| Clientes y marcas | Negocio o motivo del canal, audiencia, país, idioma, tono, colores, logo, productos, recursos y cuentas |
| Crear contenido | Video individual, lote, serie o micro VSL; objetivo; tema; duración; estilo; voz; formato y costo máximo |
| Series | Temporada completa de 10–25 capítulos, protagonistas, referencias, escenario, género, arco, duración, presupuesto total y calendario |
| Micro VSL | Problema, público, oferta, mecanismo, beneficios, evidencia, objeciones, precio, condiciones y CTA |
| Biblioteca | Videos, personajes, voces, imágenes, portadas, documentos y plantillas |
| Calendario | Facebook e Instagram: cuenta destino, horario, zona horaria, orden de capítulos y estado de publicación |
| Exportación | Videos, portadas y textos por capítulo para programación manual en TikTok y YouTube |
| Resultados y gasto | Costo previsto/real, retención disponible, alcance, interacción, leads o ventas y errores |

Separar objetivo del video y estilo visual. Por ejemplo, una VSL puede ser animada, ilustrada o usar recursos reales. Duraciones generales: 30, 45, 60, 90, 120, 180, 240 y 300 segundos. En VSL mostrar 120–300. La UI debe indicar cuándo la duración o el formato no es compatible con el destino elegido.

Generar título, descripción/caption, hashtags, portada y CTA específicos por red. Donde la red no tenga un campo independiente de título, usarlo en portada y apertura del copy. Guardar las versiones por plataforma en lugar de publicar el mismo bloque de texto en todas.

La puesta en marcha de un canal debe incluir sus datos y permisos. Después, el calendario puede iniciar producciones recurrentes sin volver a rellenar el formulario.

**7. Series: consistencia de protagonistas y memoria**

El pack actual propone 3–5 partes, generadas una por una, con revisiones humanas. El nuevo diseño debe crear automáticamente la ficha permanente y producir los 10–25 capítulos en una sola solicitud desde la UI. La ficha contiene:

- Personajes: identificador, aspecto, proporciones, ropa, colores, personalidad, voz y pronunciación.
- Recursos visuales: vistas y expresiones de referencia o un personaje 2D reutilizable.
- Mundo: lugares, época, objetos, paleta y reglas.
- Continuidad: hechos ya ocurridos, relaciones, conocimientos de cada personaje y preguntas pendientes.
- Episodios: arco general, objetivo particular, conflicto/pregunta, resolución y gancho siguiente.

La opción más controlable es reutilizar exactamente el mismo personaje 2D. En el modo ilustrado, generar una ficha visual con varias vistas y expresiones, conservarla y usar proveedores con entradas de referencia y edición. Aplicar después movimiento de cámara, capas, entradas, expresiones disponibles y transiciones mediante el motor. Una semilla o una descripción repetida no garantiza identidad. La calidad de consistencia debe medirse con pruebas, sobre todo con varios protagonistas en el mismo plano. La automatización genera especificaciones y puede generar recursos visuales por API; crear un personaje 2D completamente articulado para cualquier diseño requerirá un sistema específico de personajes y plantillas.

Producir la temporada completa, con publicación posterior según calendario. La solicitud única no implica pedir todo a un modelo en una sola respuesta ni renderizar todo a la vez. n8n divide el trabajo, guarda resultados y continúa hasta que todos los capítulos estén listos. No requiere que el usuario solicite cada episodio ni que apruebe las etapas.

| Etapa automática | Resultado persistente | Comprobación antes de avanzar |
|---|---|---|
| 1. Interpretar la solicitud | Objetivo, audiencia, género, número de capítulos, duración, estilo y presupuesto | Datos mínimos y restricciones del negocio |
| 2. Crear ficha de serie | Personajes, voces, mundo, reglas, tono, recursos y referencias | Personajes diferenciados y referencias utilizables |
| 3. Planificar temporada | Inicio, desarrollo, desenlace y ficha de todos los episodios | Cada promesa tiene resolución y cada capítulo aporta algo propio |
| 4. Escribir todos los guiones | Guion y plan visual por capítulo | Duración prevista, voz de personajes, hechos y continuidad |
| 5. Revisar el conjunto | Versión corregida de la temporada y memoria de continuidad | Contradicciones, repeticiones, cabos pendientes y cierre |
| 6. Fijar versión de producción | Guiones y recursos compartidos versionados | Presupuesto reservado y cambios coherentes entre capítulos |
| 7. Generar voz y escenas | Audios con tiempos, imágenes o composiciones 2D | Sincronización, identidad y límites de gasto |
| 8. Renderizar y verificar | Video, portada, título y copy por capítulo | Archivo válido y controles automáticos de imagen/audio/texto |
| 9. Cerrar temporada | Todos los capítulos listos y paquete descargable | Cantidad completa y orden correcto |
| 10. Programar distribución | Calendario Facebook/Instagram y exportación para otras redes | Temporada lista y cuentas destino correctas |

Crear primero toda la historia permite detectar problemas antes de pagar voz e imágenes. Para no desbordar el contexto del modelo, cada guion recibe la ficha fija, el arco de temporada, su objetivo y el estado narrativo pertinente. La memoria distingue lo planificado de lo que efectivamente aparece en los guiones finales. Los cambios de continuidad generan una nueva versión y vuelven a comprobar los capítulos afectados.

Generar los guiones respetando las dependencias narrativas; paralelizar recursos y renders solo después de fijar esa versión. Cada trabajo debe identificarse por serie, versión, capítulo, escena y etapa. Un fallo de render reanuda ese capítulo sin rehacer los demás ni duplicar pagos o publicaciones. El límite de gasto cubre la temporada, incluidos recursos compartidos y una reserva acotada de reintentos.

La UI muestra estados como «Planificando temporada», «Escribiendo 14/20», «Produciendo 8/20» y «Temporada lista». Si un fallo persiste, muestra qué queda pendiente y permite reanudar; no presenta una temporada incompleta como terminada. Por defecto, el calendario comienza cuando toda la temporada está lista. La publicación se distribuye en el tiempo, aunque todos los archivos ya estén producidos.

Las métricas sirven para orientar la siguiente temporada o serie. No modifican silenciosamente episodios ya terminados. Las correcciones solicitadas desde la UI afectan únicamente las escenas y dependencias necesarias.

Una temporada necesita un cierre satisfactorio. No convertir cada capítulo en una promesa aplazada; cada entrega debe aportar algo aunque se vea por separado.

**8. Costos orientativos y cómo calcularlos**

Referencias públicas consultadas. Las cifras de clips generativos se conservan únicamente como comparación del análisis inicial; los modos prioritarios son las dos primeras columnas:

- [Gemini API](https://ai.google.dev/gemini-api/docs/pricing?frmapp=yes): Gemini 3.1 Flash-Lite a $0,25 por millón de tokens de entrada y $1,50 de salida. La tabla de imagen Flash-Lite muestra un equivalente de $0,0336 por imagen 1K. Los tokens de entrada y las ediciones pueden añadir consumo.
- [ElevenLabs API](https://elevenlabs.io/pricing/api): Flash/Turbo a $0,04 por 1.000 caracteres y Multilingual v2 a $0,08. El costo efectivo depende del plan contratado; no sumar dos veces créditos incluidos y consumo equivalente. La integración existente usa otro modelo por defecto: debe fijarse el modelo real antes de aplicar estos números.
- [Hailuo-02 en fal, 768p](https://fal.ai/models/fal-ai/minimax/hailuo-02/standard/image-to-video): $0,045 por segundo generado; $0,27 por seis segundos.

Modelo de cálculo: 900 caracteres de narración por minuto; $0,02 de presupuesto de texto por video; ilustrado con seis imágenes nuevas por minuto; generativo completo con una imagen y un clip de seis segundos por cada cinco segundos finales. Las tarifas de voz producen el intervalo de cada fila.

| Duración | 2D con biblioteca existente | Ilustraciones con movimiento | Clips IA en toda la pieza |
|---|---:|---:|---:|
| 30 s | $0,04–0,06 | $0,14–0,16 | $1,86–1,88 |
| 45 s | $0,05–0,08 | $0,22–0,25 | $2,78–2,81 |
| 60 s | $0,06–0,10 | $0,26–0,30 | $3,70–3,74 |
| 90 s | $0,07–0,13 | $0,38–0,43 | $5,54–5,60 |
| 120 s | $0,09–0,17 | $0,50–0,57 | $7,38–7,45 |
| 180 s | $0,13–0,24 | $0,73–0,85 | $11,06–11,17 |
| 240 s | $0,16–0,31 | $0,97–1,12 | $14,74–14,89 |
| 300 s | $0,20–0,38 | $1,21–1,39 | $18,42–18,60 |

Son costos variables de generación estimados. No incluyen desarrollo de plantillas/personajes, generación inicial de referencias, búsqueda, revisiones, render/servidor, almacenamiento, publicación, licencias, mínimos de suscripción, impuestos ni mantenimiento. No son el costo total ni el precio que conviene cobrar. Un video que necesite dibujos nuevos no pertenece al supuesto barato de biblioteca existente.

Para un híbrido de 180 segundos con 20 % de cobertura generativa: ocho clips de seis segundos utilizados a cinco segundos, hasta 18 imágenes nuevas, voz y texto darían aproximadamente $2,89–3,01 antes de los costos excluidos. Es una combinación concreta de planificación, no una obligación de usar ese porcentaje.

Una temporada de 25 episodios de 180 segundos costaría aproximadamente $3,20–5,90 en generación 2D reutilizable, $18,33–21,03 ilustrada o $276,45–279,15 con clips en toda la pieza, más todos los costos anteriores y la preparación de la serie. Las cifras bajas de generación no eliminan el costo de construir y mantener el sistema.

Como comparación mensual, 90 videos de tres minutos requieren aproximadamente $66–76 de generación ilustrada frente a $995–1.005 con clips completos, sin reintentos ni infraestructura. Empezar con una reserva de 20–30 % para repeticiones y ajustar al medir los primeros trabajos.

Costo completo por video = generación consumida + render + parte asignada de infraestructura/licencias + mantenimiento/operación + amortización de desarrollo. Con suscripciones, calcular sobre el gasto mensual efectivo y el volumen útil para evitar doble conteo.

Antes de cada trabajo, reservar un presupuesto máximo. Si faltan fondos, detener la generación de forma visible; no reducir silenciosamente la calidad de un cliente. Reutilizar recursos licenciados, caché de voz e imágenes válidas. En un cambio, regenerar solo las escenas afectadas.

**9. Publicación sin aprobación y monetización**

La intención es una operación automática sin aprobaciones editoriales por video. Los controles propuestos son automáticos: datos completos, duración, audio, subtítulos legibles, integridad del render, duplicados, recursos autorizados y coherencia con la marca. Si falla un control, reintentar con límites, usar una alternativa prevista o registrar el trabajo como fallido y avisar. Una pausa por error no tiene que convertirse en una solicitud de aprobación.

La publicación automática se implementa exclusivamente para Facebook e Instagram. TikTok y YouTube reciben un paquete descargable con los videos, las portadas y los textos, para que el usuario haga la programación manual. Sus APIs de publicación quedan fuera de esta implementación.

Para Facebook e Instagram, validar tipo de cuenta y permisos en la integración seleccionada y comprobar las duraciones admitidas por el formato concreto. La documentación de Meta volvió a devolver límites de acceso en la consulta de esta actualización, por lo que no se certificaron sus límites actuales ni Trial Reels. Verificar el estado final de cada publicación y guardar su identificador; un reintento debe consultar ese estado antes de volver a publicar.

La generación automática no garantiza viralidad. Diseñar un ciclo de medición: hipótesis de tema y hook, producción, publicación, lectura a 48–72 horas y siete días, y decisiones sobre las siguientes piezas. Usar retención, finalización, compartidos y seguidores; para VSL, clics, leads, conversiones y costo por resultado. Registrar solo métricas que la API y los permisos realmente entreguen. No decidir por views aisladas ni mezclar la comparación de un video de 30 s con uno de 180 s.

Para monetizar cuentas, distinguir elegibilidad y rendimiento. [YouTube](https://support.google.com/youtube/answer/1311392?hl=es) excluye de monetización el contenido no auténtico, repetitivo o producido en masa sin suficiente valor original. Reutilizar plantillas de producción debe conservar diferencias sustanciales de historia, explicación y aporte en cada entrega.

Los [Shorts pueden llegar a tres minutos](https://support.google.com/youtube/answer/15424877?hl=es). Una VSL de cinco minutos necesita otro formato de publicación; no será un Short. Los Shorts de más de un minuto con una reclamación activa de Content ID se bloquean globalmente: elegir música con derechos adecuados y conservar su procedencia.

TikTok [Creator Rewards](https://support.tiktok.com/es/business-and-creator/creator-rewards-program/how-is-the-creator-rewards-program-different-from-the-tiktok-creator-fund) requiere contenido original de alta calidad de más de un minuto y excluye contenido patrocinado de su definición indicada. Las funciones de monetización [dependen de ubicación y requisitos de cuenta](https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account?lang=en). No se verificó la elegibilidad de las cuentas del usuario ni la disponibilidad concreta en Guatemala. La ubicación del público no sustituye los requisitos de residencia/cuenta.

La UI debería mostrar país y estado de elegibilidad por canal. No marcar un video como monetizable solo por durar 90 segundos. No usar un pase de diapositivas genérico como garantía de elegibilidad.

Para contenido comercial, usar voz y música con derechos adecuados. ElevenLabs muestra licencia comercial desde su [plan Starter](https://elevenlabs.io/pricing); no asumir que la prueba gratuita habilita trabajo para clientes. No se encontró una licencia general explícita de CODE ART en la raíz: confirmar los derechos de adquisición antes de redistribuir el motor o vender acceso al software; producir videos y revender código son alcances distintos.

**10. Micro VSL con información del negocio**

La ficha comercial necesita: producto/servicio, público, problema, mecanismo de solución, beneficios, características, oferta, precio y vigencia, garantía y condiciones, pruebas verificables, objeciones, URL o WhatsApp de destino y recursos audiovisuales.

Estructura sugerida: apertura y problema → consecuencias → solución y mecanismo → demostración/prueba → oferta → objeciones → CTA. Asignar el tiempo según 120, 180, 240 o 300 segundos y el material disponible. No rellenar hasta cinco minutos si la oferta se explica mejor en dos.

La generación debe basarse en la ficha y evidencias. Si faltan testimonios, cifras o urgencia real, omitirlos o usar una demostración; no inventarlos. Guardar el segundo del CTA y utilizar enlaces identificables para atribuir resultados. En series de negocio, alternar educación, demostración y venta según el objetivo del canal.

**11. Secuencia de implementación recomendada**

1. Definir marcas y casos piloto, biblioteca visual y criterios automáticos. Convertir CODE ART en servicio de render con una plantilla 2D y una ilustrada.
2. Construir UI mínima, persistencia, voz con tiempos, generación de copy y trabajos de 45, 90 y 180 segundos. Añadir límites de presupuesto y recuperación.
3. Probar publicación real en Facebook e Instagram, con título/caption donde corresponda, archivo persistente, calendario y registro del identificador publicado. Incorporar exportación para programación manual en TikTok y YouTube. Distinguir conexión inicial de aprobación editorial recurrente.
4. Incorporar micro VSL de 120–300 segundos y recursos reales del negocio.
5. Incorporar la generación automática de ficha de serie, recursos persistentes, arco, todos los guiones y memoria. Validar el sistema y después ejecutar una solicitud completa de 10–25 episodios, sin aprobaciones editoriales intermedias.
6. Añadir aprendizaje por resultados para próximas temporadas cuando el costo y la calidad del flujo base estén medidos. La generación de clips no es una prioridad de esta versión.

Criterios de aceptación del piloto: duración real válida, texto y voz sincronizados, personajes reconocibles, oferta fiel, costo y tiempo medidos, recuperación sin cobros duplicados y publicación una sola vez en la cuenta correcta. Probar también una caída de proveedor y un reintento de publicación.

La decisión propuesta es empezar como herramienta interna para tus canales y clientes, con CODE ART parametrizado y modo ilustrado como base. La validación inicial del sistema cubre personajes y continuidad con una muestra pequeña; el piloto de serie completo debe entregar una temporada de 10 capítulos a partir de una sola solicitud. Después se amplía a 25 capítulos manteniendo la misma lógica de trabajo. El alcance final incluye también explicativos, micro VSL y publicación automática en Facebook e Instagram.
