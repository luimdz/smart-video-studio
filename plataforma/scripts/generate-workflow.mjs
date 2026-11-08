import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const origin=process.argv[2];
const node=(name,type,typeVersion,position,parameters,extras={})=>({id:randomUUID(),name,type,typeVersion,position,parameters,...extras});
const credentials={httpCustomAuth:{name:"Serie · Servicio privado"}};
const nodes=[
node("Solicitud de temporada","n8n-nodes-base.webhook",2,[0,0],{httpMethod:"POST",path:"serie-produccion",authentication:"headerAuth",responseMode:"onReceived",options:{responseCode:202}},{webhookId:randomUUID(),credentials:{httpHeaderAuth:{name:"Serie · Entrada n8n"}},notes:"Configurar Header Auth con nombre X-Studio-Token. Su valor coincide con N8N_WEBHOOK_TOKEN en el estudio.",notesInFlow:true}),
node("Configurar estudio","n8n-nodes-base.set",3.4,[240,0],{assignments:{assignments:[{id:randomUUID(),name:"studioUrl",value:origin,type:"string"},{id:randomUUID(),name:"productionId",value:"={{ $json.body.productionId }}",type:"string"}]},options:{}},{notes:"URL del estudio privado. El ID de producción es la única entrada del webhook. El servidor carga cuenta, límites y ficha.",notesInFlow:true}),
node("Reservar ejecución","n8n-nodes-base.httpRequest",4.2,[480,0],{method:"POST",url:"={{ $('Configurar estudio').first().json.studioUrl + '/api/worker' }}",authentication:"genericCredentialType",genericAuthType:"httpCustomAuth",sendBody:true,specifyBody:"json",jsonBody:"={{ JSON.stringify({action:'claim',productionId:$('Configurar estudio').first().json.productionId,executionId:$execution.id}) }}",options:{timeout:90000}},{credentials,notes:"Custom Auth JSON: headers Authorization: Bearer WORKER_TOKEN y OAI-Sites-Authorization: Bearer TOKEN_DE_SERVICIO_SITES. Nunca pegar secretos en el workflow.",notesInFlow:true}),
node("¿Ejecución autorizada?","n8n-nodes-base.if",2.2,[720,0],{conditions:{options:{caseSensitive:true,leftValue:"",typeValidation:"strict",version:2},conditions:[{id:randomUUID(),leftValue:"={{ $json.proceed }}",rightValue:true,operator:{type:"boolean",operation:"true",singleValue:true}}],combinator:"and"},options:{}}),
node("Planificar siguiente etapa","n8n-nodes-base.httpRequest",4.2,[960,-100],{method:"POST",url:"={{ $('Configurar estudio').first().json.studioUrl + '/api/worker' }}",authentication:"genericCredentialType",genericAuthType:"httpCustomAuth",sendBody:true,specifyBody:"json",jsonBody:"={{ JSON.stringify({action:'next',productionId:$('Configurar estudio').first().json.productionId,executionId:$execution.id}) }}",options:{timeout:90000}},{credentials,notes:"Etapas persistentes: ficha → arco → todos los guiones → revisión → correcciones → guiones listos. Sin voz, imágenes, render ni publicación en esta entrega.",notesInFlow:true}),
node("¿Guiones completos?","n8n-nodes-base.if",2.2,[1200,-100],{conditions:{options:{caseSensitive:true,leftValue:"",typeValidation:"strict",version:2},conditions:[{id:randomUUID(),leftValue:"={{ $json.done }}",rightValue:true,operator:{type:"boolean",operation:"true",singleValue:true}}],combinator:"and"},options:{}}),
node("Pausa entre etapas","n8n-nodes-base.wait",1.1,[1200,150],{resume:"timeInterval",amount:2,unit:"seconds"},{webhookId:randomUUID()}),
node("Guiones listos · conectar render después","n8n-nodes-base.noOp",1,[1460,-200],{}, {notes:"Resultado scripts_ready, no video terminado. El render y publicación Meta se conectarán como subflujos posteriores.",notesInFlow:true}),
node("Solicitud duplicada · no repetir cobros","n8n-nodes-base.noOp",1,[960,250],{}),
];
const edge=(name,index=0)=>({node:name,type:"main",index});
const workflow={name:"Serie · 01 Planificar temporada completa",nodes,connections:{
"Solicitud de temporada":{main:[[edge("Configurar estudio")]]},
"Configurar estudio":{main:[[edge("Reservar ejecución")]]},
"Reservar ejecución":{main:[[edge("¿Ejecución autorizada?")]]},
"¿Ejecución autorizada?":{main:[[edge("Planificar siguiente etapa")],[edge("Solicitud duplicada · no repetir cobros")]]},
"Planificar siguiente etapa":{main:[[edge("¿Guiones completos?")]]},
"¿Guiones completos?":{main:[[edge("Guiones listos · conectar render después")],[edge("Pausa entre etapas")]]},
"Pausa entre etapas":{main:[[edge("Planificar siguiente etapa")]]}
},active:false,settings:{executionOrder:"v1",executionTimeout:3600,saveDataErrorExecution:"all",saveDataSuccessExecution:"none"},pinData:{},tags:[]};
mkdirSync("public/workflows",{recursive:true});writeFileSync("public/workflows/01-planificar-temporada.json",JSON.stringify(workflow,null,2)+"\n");

