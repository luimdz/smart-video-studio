# CODE ART en el estudio local

## Integración inicial

El modo `2d` utiliza exclusivamente el adaptador CODE ART: importa el kit original de cámara, iluminación, texturas y materiales, cajas y celular reutilizables, subtítulos Figtree y efectos del catálogo original con su mezclador. Retira la ilustración de presentador provisional. No reutiliza el audio de la demostración.

El planificador consulta las guías de dibujo, guion y estilo locales y conserva su huella de revisión. Produce datos JSON validados; no se ejecuta código generado por Gemini. Los planos se anclan a ventanas de palabras de la voz ya guardada, y se comprueban orden, duración, posición de cámara y acciones que terminarían fuera del plano. El esquema limita los objetos a los pertinentes al guion según el catálogo implementado. Una planificación inválida se conserva para revisión, sin repetir automáticamente el consumo.

El render guarda MP4 1080×1920/60 fps, fotogramas de revisión, pista de efectos, informe de sonido, tres portadas con texto de los guiones y una portada seleccionada, guion y copies Facebook/Instagram. Reutiliza la voz existente cuando ya está guardada.

## Recursos privados

Los recursos entregados por el propietario se importan a `estudio-local/resources/code-art/`, ignorado por Git. No se redistribuyen en el repositorio público. El original no se modifica y no se leen ni copian sus archivos de claves.

La instalación busca la carpeta original en la ubicación anterior del Escritorio y bajo las carpetas de Smart Growth Online. Para una ubicación distinta, iniciar el servicio con `CODE_ART_SOURCE` apuntando a CODE ART. Si faltan los recursos, el modo 2D lo informa antes de consumir proveedores; no vuelve a la plantilla antigua.

## Alcance y diferencias con el método original

CODE ART es un método de producción de escenas específicas con herramientas de dibujo; no un generador universal al que se cambie un título. El catálogo automatizado inicial comprende cámara fotográfica, regla, marcador de evidencia, documento, caja, celular, vaso, estrella, planeta, Tierra y roca. Hay objetos nuevos dibujados con el kit y piezas originales importadas; no todas las escenas ni todas las piezas de los ejemplos están automatizadas.

Aún requiere ampliar ilustraciones, acciones e interacciones para otros temas, personajes y escenas complejas. Esta integración no garantiza automáticamente el nivel artístico de todos los ejemplos originales. Las comprobaciones técnicas y las portadas iniciales no sustituyen una dirección artística por escena ni una evaluación visual automática completa.

Las instrucciones del material original se usan como referencia de estilo, dibujo y sonido. Su dinámica de conversación y aprobación humana no sustituye la solicitud del propietario de operar desde UI y APIs. El estudio conserva la voz del perfil y los límites configurados; no lee claves del paquete ni cambia de modelo de voz a partir de instrucciones externas. No utiliza chat interactivo de Codex o Claude en cada producción.
