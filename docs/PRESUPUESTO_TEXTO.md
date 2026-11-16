# Presupuesto local de texto y reanudación 2D

El límite mensual local es compartido por Gemini y OpenAI. No indica el saldo ni la cuota de esos proveedores. Cambiar de proveedor no reinicia el contador. Las llamadas confirmadas y las reservas pendientes siguen contabilizadas; no se borra el historial ni se elevan límites automáticamente.

Antes de una solicitud se reserva una cota conservadora: bytes UTF-8 del contexto y esquema, margen del protocolo, límite de salida e imágenes. Es una cota preventiva, no un conteo exacto de tokens. Al recibir la respuesta se ajusta al consumo informado por la API. Si faltan metadatos se mantiene lo contabilizado como estimación; las llamadas de resultado incierto conservan su reserva.

## Cambios para el plan 2D

- Se incluyen extractos acotados de las seis guías, conservando los originales completos en el disco.
- La narración se transmite con índices de palabra y tiempos compactos. La identidad reutilizada contiene la paleta del último capítulo, no todos los planes anteriores.
- La salida se dimensiona por número de planos, con un máximo de 24.000 tokens. No se reservan 24.000 para cada video corto.
- Las referencias visuales ya utilizadas para escribir el guion no se vuelven a enviar al modelo para este plan declarativo. Las capturas e imágenes reales siguen disponibles para el render.
- La comprobación antes de entrar en cola detecta falta de presupuesto cuando la siguiente etapa es voz o render 2D. También se comprueba inmediatamente antes de una llamada nueva a ElevenLabs. La previsión anterior a la voz usa tiempos estimados; el plan definitivo se comprueba con la alineación real.
- Si hay un plan o respuesta válida en caché, no se exige reservar otra generación. Los guiones, voces y planes confirmados se reutilizan al continuar.

## Si realmente no alcanza

La producción queda pausada con disponibles, contabilizados, reservados y faltante, y un acceso a Configuración. Ajustar el límite es una decisión del propietario; el sistema no lo evita cambiando de proveedor, borrando reservas o alterando consumo confirmado. Las revisiones adicionales y otros trabajos pueden consumir presupuesto después de una previsión, por lo que no se garantiza completar cualquier producción con un saldo fijo.

Después de actualizar y reiniciar el motor, abrir el trabajo existente y pulsar Producir. No es necesario recrearlo ni volver a generar su voz. Configuración y Consumo y costos muestran el mismo presupuesto compartido.

## Regresión verificada

Con 465.093 contabilizados de 500.000 quedan 34.907. La reserva anterior de 57.356 se bloquea correctamente. Un guion 2D de prueba de 60 segundos requiere ahora una cota de 24.417 y permite continuar conservando la voz, sin subir el límite. Ese importe es del caso de prueba, no una promesa sobre el guion particular del propietario. También se verifica que, con presupuesto insuficiente, no se llame a ElevenLabs y no se liberen reservas inciertas. Las respuestas de proveedores se simulan; el recorrido en navegador y la exportación MP4 del ensayo son reales.
