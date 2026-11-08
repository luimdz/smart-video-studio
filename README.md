# Smart Video Studio

Aplicación interna para automatizar la producción de videos, mini series y micro VSL. Esta es una primera implementación en desarrollo: no está desplegada en Netlify/Vercel ni conectada a las APIs reales del propietario.

**Empieza por la [guía paso a paso](docs/INICIO_PASO_A_PASO.md).** Explica dónde están los archivos, cómo abrir la aplicación, dónde está Configuración y de dónde obtener la clave de Gemini.

## Qué hay en este repositorio

| Ubicación | Contenido |
|---|---|
| [`estudio-local/`](estudio-local/) | Aplicación vigente: interfaz, servicio local, SQLite, planificador, integración de voz y primer renderizador |
| [`estudio-local/coordinador-n8n.json`](estudio-local/coordinador-n8n.json) | Copia del nuevo coordinador n8n; ya existe en la instancia del propietario |
| [`plataforma/`](plataforma/) | Prototipo anterior basado en Sites/D1. Se conserva como antecedente; no es el punto de inicio actual |
| Archivos Markdown de la raíz | Análisis de recursos, repositorios y propuestas; describen también decisiones anteriores |

Los videos, imágenes de producción, bases locales, claves y cachés no se suben a GitHub.

## Abrir la versión actual

En el equipo donde se está desarrollando, abrir con doble clic `estudio-local/Iniciar Smart Studio.command`. Mantener abierta la ventana que inicia el servicio y entrar a `http://127.0.0.1:4317/`.

En una copia nueva del repositorio, se necesitan Node.js 22.13 o posterior y FFmpeg/ffprobe. Dentro de `estudio-local`, ejecutar `npm install` y luego `npm start`.

**Configuración está dentro de Smart Studio**, en el menú lateral izquierdo, junto al icono de engranaje. No es la configuración de Codex, GitHub o n8n.

## Estado real

Comprobado: interfaz local, perfiles, guardado de solicitudes, límites y duplicados, seis pruebas automáticas, un MP4 técnico de ocho segundos y una ejecución manual del contrato del coordinador n8n.

Pendiente: configurar claves reales, voz del perfil y autenticación del webhook; probar una producción completa; personajes 2D avanzados; publicación Facebook/Instagram; alojamiento remoto y subdominio. El primer render usa una ilustración básica y un tono de prueba; no representa todavía el acabado audiovisual final.

La interfaz está en revisión visual. Se está recuperando la paleta de Smart Growth Online para aplicar el estilo solicitado: premium, glass y acentos neón, con prioridad en la facilidad de uso.

## Despliegue posterior

Subdominio propuesto: `studio.smartgowth.online`. Los DNS se administran en IONOS. Netlify es la opción propuesta para el panel; no se ha conectado ni desplegado una cuenta de alojamiento.

GitHub almacena y versiona el código. Netlify/Vercel alojarían el panel. El Mac y el disco seleccionado producen y conservan los medios. Subir el código no publica la aplicación ni convierte el motor local en un servidor remoto.

## Comprobar el código

Desde `estudio-local`: `npm test`. Consultar el [README técnico y sus limitaciones](estudio-local/README.md) antes de una ejecución pagada.
