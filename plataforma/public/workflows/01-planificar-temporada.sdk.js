const solicitud = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.2,
  config: {
    name: 'Solicitud de temporada',
    parameters: {
      httpMethod: 'POST', path: 'serie-produccion', authentication: 'headerAuth', responseMode: 'onReceived',
      options: { responseCode: { values: { responseCode: 'customCode', customCode: 202 } } }
    },
    credentials: { httpHeaderAuth: newCredential('Serie · Entrada n8n') }
  },
  output: [{ body: { productionId: '00000000-0000-4000-8000-000000000001' } }]
});

const configurar = node({
  type: 'n8n-nodes-base.set', version: 3.5,
  config: {
    name: 'Configurar estudio',
    parameters: {
      mode: 'manual', assignments: { assignments: [
        { id: 'studio-url', name: 'studioUrl', value: '', type: 'string' },
        { id: 'production-id', name: 'productionId', value: expr('{{ $json.body?.productionId ?? $json.productionId ?? "" }}'), type: 'string' }
      ] }, options: {}
    }
  },
  output: [{ studioUrl: '', productionId: '00000000-0000-4000-8000-000000000001' }]
});

const comprobar = ifElse({
  version: 2.3,
  config: {
    name: '¿Configuración y solicitud válidas?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
        conditions: [
          { id: 'valid-url', leftValue: expr('{{ $json.studioUrl.startsWith("https://") && $json.studioUrl.length > 8 && !$json.studioUrl.includes("?") && !$json.studioUrl.includes("#") && !$json.studioUrl.includes("@") }}'), operator: { type: 'boolean', operation: 'equals' }, rightValue: true },
          { id: 'valid-id', leftValue: expr('{{ /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test($json.productionId) }}'), operator: { type: 'boolean', operation: 'equals' }, rightValue: true }
        ]
      }, options: {}
    }
  }, output: [{ studioUrl: '', productionId: '' }]
});

const detener = node({
  type: 'n8n-nodes-base.stopAndError', version: 1,
  config: {
    name: 'Detener por configuración pendiente',
    parameters: { errorType: 'errorMessage', errorMessage: 'Configura la URL HTTPS real del estudio y envía un productionId UUID válido. No hay un despliegue del estudio confirmado.' }
  }, output: [{}]
});

const reservar = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: 'Reservar ejecución',
    parameters: {
      method: 'POST', url: expr('{{ $("Configurar estudio").first().json.studioUrl.replace(/[/]$/, "") + "/api/worker" }}'),
      authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({action:"claim",productionId:$("Configurar estudio").first().json.productionId,executionId:$execution.id}) }}'),
      options: { timeout: 90000, redirect: { redirect: { followRedirects: false } } }
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Serie · Servicio privado') },
    retryOnFail: false
  }, output: [{ proceed: true }]
});

const autorizada = ifElse({
  version: 2.3,
  config: {
    name: '¿Ejecución autorizada?',
    parameters: { conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
      conditions: [{ id: 'proceed', leftValue: expr('{{ $json.proceed }}'), operator: { type: 'boolean', operation: 'equals' }, rightValue: true }]
    }, options: {} }
  }, output: [{ proceed: true }]
});

const duplicada = node({
  type: 'n8n-nodes-base.noOp', version: 1,
  config: { name: 'Solicitud ya reclamada · no repetir', parameters: {} },
  output: [{ proceed: false }]
});

const siguiente = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: 'Planificar siguiente etapa',
    parameters: {
      method: 'POST', url: expr('{{ $("Configurar estudio").first().json.studioUrl.replace(/[/]$/, "") + "/api/worker" }}'),
      authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true, contentType: 'json', specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({action:"next",productionId:$("Configurar estudio").first().json.productionId,executionId:$execution.id}) }}'),
      options: { timeout: 90000, redirect: { redirect: { followRedirects: false } } }
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Serie · Servicio privado') },
    retryOnFail: false
  }, output: [{ done: false, stage: 'bible', progress: 8 }]
});

const completos = ifElse({
  version: 2.3,
  config: {
    name: '¿Guiones completos?',
    parameters: { conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
      conditions: [{ id: 'done', leftValue: expr('{{ $json.done }}'), operator: { type: 'boolean', operation: 'equals' }, rightValue: true }]
    }, options: {} }
  }, output: [{ done: true, stage: 'scripts_ready', progress: 80 }]
});

const pausa = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: { name: 'Pausa entre etapas', parameters: { resume: 'timeInterval', amount: 2, unit: 'seconds' } },
  output: [{ done: false, stage: 'outline', progress: 15 }]
});

const listos = node({
  type: 'n8n-nodes-base.noOp', version: 1,
  config: { name: 'Guiones listos · audiovisual pendiente', parameters: {} },
  output: [{ done: true, stage: 'scripts_ready', progress: 80 }]
});

const pendientes = sticky('## Borrador · conexiones pendientes\nConfigura studioUrl en «Configurar estudio» con la dirección HTTPS real del servicio /api/worker.\nCredenciales pendientes: Entrada n8n (X-Studio-Token) y Servicio privado (Bearer WORKER_TOKEN; acceso al alojamiento si corresponde).\nEl servicio necesita Gemini y su almacenamiento. No se confirmó ningún despliegue.\nFicha → arco → todos los guiones → revisión y correcciones. scripts_ready no es un video terminado. Voz, imágenes, render y publicación Meta siguen pendientes.\nLos ejemplos de salida describen el contrato; no son resultados ejecutados.');

export default workflow('serie-planificar-temporada', 'Serie · 01 Planificar temporada completa')
  .add(solicitud).to(configurar).to(comprobar.onTrue(reservar).onFalse(detener))
  .add(reservar).to(autorizada.onTrue(siguiente).onFalse(duplicada))
  .add(siguiente).to(completos.onTrue(listos).onFalse(pausa))
  .add(pausa).to(siguiente)
  .add(pendientes)
  .group('Entrada y configuración', [configurar, comprobar], { description: 'Comprueba la dirección del estudio y el identificador antes de llamar al servicio.' })
  .group('Planificación de temporada', [reservar, autorizada, duplicada, siguiente, completos, pausa, listos], { description: 'Reclama la solicitud y avanza por ficha, arco, guiones y revisión hasta scripts_ready.' });
