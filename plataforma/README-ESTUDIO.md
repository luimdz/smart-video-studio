# Serie · Estudio de contenido

Primera entrega interna del proyecto. Consulta `ESTADO.md` para distinguir las funciones implementadas de la generación audiovisual pendiente. `N8N.md` explica cómo conectar el workflow importable sin exponer credenciales.

Desarrollo: `npm run dev`. Comprobación: `npx tsc --noEmit`, `node --experimental-strip-types --test tests/domain.test.mjs` y `python3 tests/admission_test.py`. Los comandos de construcción y migración de la plantilla siguen documentados en `README.md`.

El código de aplicación está en `app/`, las reglas de planes en `lib/domain.ts`, las comprobaciones del servidor en `lib/server.ts`, y el esquema de datos en `db/schema.ts`. Los límites de admisión se aplican con una consulta atómica en `lib/admission.ts`. El planner está en `lib/planner.ts`.

El workflow n8n está en `public/workflows/01-planificar-temporada.json`, y se puede regenerar con `scripts/generate-workflow.mjs <origen-del-estudio>`. Su exportación no contiene secretos.

La primera versión alojada usa Sites, D1 e identidad proporcionada por Sites. n8n, el motor de render y las conexiones Meta son servicios separados. La arquitectura no instala n8n dentro del sitio ni utiliza el servidor del sitio para dibujar todos los fotogramas.

Los perfiles de marca pertenecen a una cuenta; una cuenta tiene plan y usuarios. El rol master es global. Una cuenta de cliente ya puede registrarse, pero el onboarding y acceso comercial todavía no están habilitados. No confundir asignar un correo con enviar una invitación.
