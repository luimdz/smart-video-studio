Concat: evaluación de integración para la herramienta de uso propio

Conclusión: hay una vía técnica concreta para integrar Concat como editor, compositor y exportador local. Nuestra aplicación conservaría la creación de temporadas, personajes, memoria, presupuestos y publicación. La recomendación es comunicar ambos programas mediante un adaptador, manteniendo sus proyectos y responsabilidades separados.

Se revisaron README, licencia, documentación del protocolo, contratos de API, comandos de edición, plantillas, voz y exportación. La rama main consultada corresponde a `ba532ebf8226734979dda8f8bb1785ab4ab1aa04`; la última versión publicada consultada es v0.2.9. No se instaló ni ejecutó Concat. La compatibilidad de una producción real en este equipo permanece pendiente.

**Qué aporta**

Concat es un editor local de escritorio con motor Rust. Las operaciones de proyecto, importación, edición, plantillas, previsualización y exportación tienen una API. El contrato permite crear proyectos, cambiar el formato, importar medios, aplicar comandos de edición, guardar, obtener fotogramas y gestionar trabajos de exportación. La fuente principal es el [contrato de la API](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/src/crates/concat-api/src/contract.rs).

Los [comandos de edición](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/src/crates/concat-project/src/commands/mod.rs) permiten montar pistas y clips, títulos, formas y transformaciones. Esto encaja con imágenes con movimiento, overlays y escenas previamente renderizadas. No equivale a un generador de personajes articulados o historias.

Las [plantillas](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/src/crates/concat-host/src/templates.rs) son proyectos empaquetados con recursos y espacios para sustituir medios. Podemos evaluar plantillas para explicativos, diálogos ilustrados, demostraciones y micro VSL.

**Distribución de funciones propuesta**

| Parte | Responsabilidad |
|---|---|
| Nuestra UI local | Perfiles de páginas y negocios; solicitud de videos, VSL y temporadas |
| Coordinador propio | Cola persistente, presupuestos, estados, reintentos y recuperación |
| API de texto | Fichas, arco, guiones completos, continuidad y copies |
| Biblioteca de personajes | Diseños, poses, expresiones, escenarios y referencias persistentes |
| CODE ART adaptado | Escenas 2D que requieren dibujo y movimiento programado |
| Concat | Montaje de recursos, imágenes animadas, audio, títulos, previsualización y exportación |
| Módulo Meta | Calendario y publicación en Facebook e Instagram |

Sloth puede aportar ideas de experiencia y de producción basada en datos. No es necesario incorporar su aplicación o código al motor. Si se decide usarlo como herramienta interna, sus salidas audiovisuales se evaluarían como otros recursos de entrada, respetando las licencias y los derechos de cada recurso.

**Cómo conectar sin n8n y sin chat**

La [documentación de desarrollo](https://concat.standalones.org/docs/) confirma que los instaladores de escritorio incluyen JSON-RPC desde la ventana y MCP. La CLI independiente y gRPC requieren compilar desde el código. No asumir que descargar la aplicación instala también `concat-cli`.

Para una primera integración, nuestra aplicación puede controlar el binario instalado mediante MCP en modo headless, documentado en [docs/MCP.md](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/docs/MCP.md). Un cliente programado puede hablar MCP; no hace falta que un agente de IA decida cada operación. La UI de creación sigue siendo la nuestra.

Otra opción es JSON-RPC con la aplicación abierta, por la conexión local autenticada de Automation. La [documentación del transporte](https://concat.standalones.org/docs/transports/json-rpc/) distingue respuestas, eventos y errores. El adaptador debe correlacionarlos por identificador, mantener la conexión y vigilar la exportación.

Cada capítulo tendría su propia carpeta de proyecto. Guardar los cambios explícitamente y cerrar/liberar el proyecto antes de abrirlo para edición manual. La operación automática no debe prometer editar en directo el mismo proyecto abierto en la ventana: ese modo está descrito como pendiente. Empezar con una exportación simultánea por instancia y dejar el resto en nuestra cola.

**Recorrido completo**

Solicitud → temporada y personajes → todos los guiones → revisión global → voz y tiempos → recursos compartidos y escenas → montaje Concat por episodio → exportación y comprobación → temporada completa → calendario Meta.

La memoria y el canon viven en nuestra base, no en la línea de tiempo del editor. El coordinador conserva el orden y produce los 10–25 episodios de una solicitud. Concat recibe únicamente lo necesario para montar cada proyecto. Los capítulos de 90–180 segundos y las VSL de 120–300 segundos son objetivos del sistema; comprobar su exportación real, rendimiento y sincronía forma parte del prototipo.

**Límites relevantes**

1. El repositorio se presenta como beta. Hay que fijar una versión probada y verificar capacidades/esquemas antes de generar proyectos.
2. La voz local actual de escritorio usa Chatterbox Turbo; el [código la describe como inglesa y lenta](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/src/crates/concat-speech/src/tts.rs). Mantener ElevenLabs o evaluar por separado otra voz en español.
3. El catálogo de métodos revisado no expone síntesis y transcripción como etapas de la API general. No asumir que todas las funciones de voz de la ventana ya pueden automatizarse mediante esos métodos. Podemos importar voz y subtítulos con tiempos generados por nuestro sistema.
4. `captions_add` construye títulos a partir de información de captions; no confundirlo con transcribir automáticamente un audio. Comprobar el estilo palabra por palabra en una prueba real.
5. Un personaje recortado y animado con transformaciones no equivale a un rig con gestos y sincronización labial. Las animaciones complejas siguen requiriendo recursos o escenas preparados.
6. El registro de exportaciones de la API es memoria del proceso, no nuestra cola durable. Los reinicios requieren reconciliar proyecto, archivo de salida y tareas guardadas. No considerar que Concat resuelve por sí mismo la recuperación de temporadas.
7. Concat no aporta en los módulos revisados nuestro planificador de series, presupuestos por perfil ni publicación Meta.

**Licencia para este alcance**

El [texto AGPL](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/LICENSE) permite ejecutar el programa y contempla modificaciones no distribuidas. El uso propio local previsto es una vía viable sin convertir esta etapa en un producto comercial. Los videos producidos no quedan automáticamente sujetos a la licencia del editor por haber sido exportados en él.

Si más adelante se distribuye una combinación modificada o se ofrece por red, revisar las obligaciones aplicables. [LICENSING.md](https://github.com/jub0t/Concat/blob/ba532ebf8226734979dda8f8bb1785ab4ab1aa04/LICENSING.md) explica las condiciones y una posible licencia comercial, con salvedades sobre contribuciones y componentes externos. Separar procesos ayuda al diseño, pero no debe tratarse como garantía de exención de licencias. No asumir compatibilidad para mezclar código de Sloth y Concat en un mismo producto.

**Prueba técnica propuesta antes de adoptarlo como motor principal**

Preparar un episodio de 90 segundos con voz en español, imágenes con acercamiento/desplazamiento, un personaje reutilizable, un clip 2D de CODE ART, títulos y subtítulos sincronizados. Crearlo desde datos estructurados, guardar un proyecto editable y exportar MP4 vertical 1080 × 1920. Verificar audio, último fotograma, duración, previsualización y recuperación después de una interrupción. Repetir con una VSL de 300 segundos para medir memoria y tiempo. Después ejecutar una temporada completa de diez capítulos desde la cola propia.

Criterio de adopción: la integración produce archivos correctos, conserva edición manual posterior y permite repetir un episodio sin rehacer los demás. Si no supera una parte, conservar una salida alternativa con CODE ART/FFmpeg y limitar Concat a las funciones comprobadas.

Este documento es un análisis de integración. No modifica el motor actual, no instala programas y no implica autorización para publicar o compartir código.
