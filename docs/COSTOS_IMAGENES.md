# Referencia de costos de imágenes

Consulta: 8 de noviembre de 2026. USD, salida por imagen de aproximadamente 1K cuadrada; orientativo, sin entrada de texto, imágenes de referencia, ediciones, reintentos ni impuestos.

| Modelo y ajuste | Salida por imagen | 100 imágenes |
|---|---:|---:|
| OpenAI GPT Image 2, low, 1024×1024 | $0.006 | $0.60 |
| OpenAI GPT Image 2, medium, 1024×1024 | $0.053 | $5.30 |
| Gemini 3.1 Flash Lite Image, 1K | $0.0336 | $3.36 |
| Gemini 3.1 Flash Image, 1K | $0.067 | $6.70 |

Fuentes: [guía oficial de generación de imágenes OpenAI](https://developers.openai.com/api/docs/guides/image-generation#historical-output-costs) y [precios oficiales Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite-image). La tabla de OpenAI sirve como ejemplo por tamaño y ajuste; los modelos nuevos se presupuestan con su calculadora y consumo real. La salida 1K cuadrada no es el formato vertical final 1080×1920: se debe componer, recortar o generar con dimensiones adecuadas.

No son niveles de calidad equivalentes entre proveedores. OpenAI puede costar menos con `low`; Gemini Lite cuesta menos que el ejemplo `medium` de GPT Image 2. El costo útil es el de una imagen aceptada, incluyendo repeticiones y referencias, no solo el precio mínimo publicado.

GPT Image 1 Mini tiene precios inferiores, pero está programado para retirarse el 1 de diciembre de 2026; no conviene construir una integración nueva sobre él. [Deprecaciones oficiales](https://developers.openai.com/api/docs/deprecations#2026-06-02-gpt-image-model-deprecations).

Para este proyecto: reutilizar dibujos CODE ART y composiciones locales evita pagar generación de imagen por fotograma. Cuando se conecte imagen generativa, generar únicamente fondos o recursos necesarios y guardarlos para reutilización. Mantener el texto de poemas como una capa local permite corregirlo sin regenerar el fondo. La aplicación ya integra Nano Banana 2.1 y GPT Image 2. Las dimensiones y calidades reales del motor difieren de los ejemplos cuadrados de esta tabla: no utilizar esos importes como un precio fijo por lámina. El motor registra el uso de imágenes separadamente del guion y la voz. La ejecución real requiere cuota y facturación habilitadas en el proveedor elegido.
