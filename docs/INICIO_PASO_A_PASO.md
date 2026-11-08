# Inicio paso a paso

## 1. Dónde están guardadas las cosas

En el Mac de desarrollo, la carpeta del proyecto es:

```text
/Users/luiscarlos/Documents/ChatGPT/Workflow Videos Virales/
```

La aplicación que debes abrir está dentro de `estudio-local`. La carpeta `plataforma` es un prototipo anterior; no debes iniciarla para estos pasos.

Dentro de `estudio-local`:

- `public/`: lo que ves en el navegador.
- `server.mjs`, `planner.mjs`, `render.mjs`: el servicio y la producción.
- `.state/`: datos y claves locales; no se sube a GitHub.
- `outputs/`: biblioteca de prueba y videos; no se sube a GitHub. Después puedes elegir otra carpeta o un SSD externo desde la aplicación.

GitHub contiene una copia del código, no tus datos locales ni videos. No hay un despliegue Netlify o Vercel confirmado.

## 2. Cómo abrir la aplicación en este Mac

1. Abre **Finder**.
2. Presiona **Command + Shift + G** para abrir «Ir a la carpeta».
3. Pega esta dirección y pulsa Enter:

   ```text
   /Users/luiscarlos/Documents/ChatGPT/Workflow Videos Virales/estudio-local/
   ```

4. Haz doble clic en **Iniciar Smart Studio.command**.
5. Se abrirá una ventana de Terminal que mantiene el servicio funcionando. Déjala abierta.
6. El navegador debería abrir Smart Studio. Si no lo hace, entra en:

   ```text
   http://127.0.0.1:4317/
   ```

Esa dirección solo funciona en el equipo que está ejecutando la aplicación. Si aparece «No se puede acceder a este sitio», comprueba que la ventana iniciada en el paso 4 siga abierta y no muestre un error.

## 3. Dónde está Configuración

Dentro de la página **Smart Studio**, mira el menú vertical del lado izquierdo:

1. Vista general.
2. Crear contenido.
3. Perfiles y marcas.
4. Producciones.
5. **Configuración**, junto al engranaje **⚙**.

Haz clic en el quinto elemento. También hay un botón visible **Configurar mi estudio** en la página de inicio mientras falten conexiones. En una pantalla estrecha, el menú aparece arriba y puede desplazarse horizontalmente.

Allí están «Carpeta de biblioteca», «Webhook del coordinador n8n» y la sección **Claves de conexión**, con los campos **Gemini API key** y **ElevenLabs API key**. No son pantallas de Codex ni de n8n.

![Ubicación de Configuración y campos de claves](images/configuracion-claves.jpg)

## 4. Para qué se necesita Gemini y cómo obtener su clave

Gemini es la propuesta inicial para escribir fichas de personajes, plan de temporada, guiones y textos de publicación. ElevenLabs genera las voces. Son proveedores distintos. No se creó una cuenta de Google ni una clave de Gemini en tu nombre.

1. Abre [Google AI Studio](https://aistudio.google.com/apikey) e inicia sesión con tu cuenta de Google.
2. Si es la primera visita, completa personalmente los avisos y condiciones de Google.
3. En la página de claves, busca **Create API key / Crear clave de API**. Google puede haber creado ya un proyecto y una clave inicial para una cuenta nueva.
4. Si te pide elegir un proyecto, selecciona uno propio o crea uno para **Smart Video Studio**.
5. Copia la clave y vuelve a la aplicación local, a **Configuración → Claves de conexión → Gemini API key**.
6. Pégala allí y pulsa **Guardar configuración**, al final del formulario.

La interfaz de Google puede mostrar nombres distintos según idioma y cuenta. Su [guía oficial de claves](https://ai.google.dev/gemini-api/docs/api-key) explica creación, proyectos y permisos.

Crear la clave y activar facturación son pasos distintos. La disponibilidad de cuota gratuita depende del modelo y de tu cuenta; no se debe asumir que una temporada completa será gratuita. No es necesario activar un plan pagado para localizar la clave. Si Google exige facturación para el modelo elegido, revisaremos el presupuesto antes de hacer una prueba pagada.

No pegues la clave en el chat, en un archivo del repositorio ni en el código de la interfaz.

## 5. Dónde poner ElevenLabs

En la misma página de Smart Studio, pega tu clave existente en **ElevenLabs API key** y guarda. Tu plan informado es Starter, con 30.000 créditos mensuales.

Después entra en **Perfiles y marcas**, crea o elige un perfil y pulsa **Elegir voz**. La aplicación consultará las voces de tu cuenta y podrás asignar una al narrador del perfil. Guardar una clave o seleccionar una voz no genera un audio pagado.

## 6. Conectar el workflow correcto de n8n

El nuevo workflow es [Smart Studio · 00 Coordinación local](https://n8n.planifyx.com/workflow/W0Yov0Nebhvtaa1M). El anterior «Serie · 01 Planificar temporada completa» se conserva como antecedente y no es el que debe usarse en esta aplicación local.

1. En Smart Studio, abre **Configuración** y pulsa **Generar / copiar token para n8n**. El token de entrada es distinto de tus API keys.
2. Abre el workflow enlazado arriba en n8n.
3. Abre su nodo **Estado desde el Mac**.
4. En autenticación, debe aparecer **Header Auth**. Crea o selecciona una credencial con nombre de cabecera **X-Studio-Token** y pega en el valor el token que copiaste desde Smart Studio.
5. Guarda la credencial y el workflow. Después publica el workflow.
6. En Smart Studio, la dirección de producción debe ser:

   ```text
   https://n8n.planifyx.com/webhook/smart-studio-coordinar
   ```

7. Guarda la configuración local.

El workflow está desactivado hasta completar la credencial y publicarlo. Su prueba manual comprobó la lógica de la siguiente etapa; no equivalió a conectar tus proveedores ni a producir un video pagado.

## 7. Primera prueba real

1. Completa un perfil con la temática, audiencia e información real del negocio.
2. Asigna la voz del perfil.
3. Para imágenes con movimiento, añade imágenes propias con **+ Imagen**. La plantilla 2D inicial todavía es básica.
4. En **Crear contenido**, elige **Video individual**, duración objetivo de **90 segundos** y un límite de créditos.
5. Guarda. En **Producciones**, abre **Ver detalles** y pulsa **Producir**.

Esta acción sí utiliza las APIs configuradas. La producción pagada completa todavía debe probarse. Primero se validará un video, después una VSL y luego una temporada.

## 8. Diseño y alojamiento

El diseño visual está en revisión según las preferencias de Smart Growth Online. El objetivo es una interfaz premium con paneles glass y acentos neón; las acciones y estados deben seguir siendo fáciles de leer.

Guardar en GitHub es el paso actual. Después de revisar la UI y validar el primer video, conectaremos el alojamiento elegido y el subdominio propuesto `studio.smartgowth.online`. No hace falta cambiar de proveedor DNS: los registros siguen en IONOS.

Antes del despliegue remoto hay que resolver login y conexión del panel con el motor del Mac. Una subida estática a Netlify o Vercel por sí sola no resuelve esa comunicación.
