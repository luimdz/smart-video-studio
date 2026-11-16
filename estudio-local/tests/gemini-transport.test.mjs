import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiTransportSchema,isSchemaRejection,safeProviderDetails} from '../gemini-transport.mjs';
test('compactar no modifica el contrato local y conserva objetos obligatorios',()=>{
 const schema={type:'object',properties:{objects:{type:'array',minItems:1,maxItems:12,items:{type:'object',properties:{position:{type:'array',minItems:3,maxItems:3,items:{type:'number'}},kind:{const:'rect'}}}}}};
 const copy=structuredClone(schema),wire=geminiTransportSchema(schema,{compact:true});assert.deepEqual(schema,copy);
 assert.equal(wire.properties.objects.minItems,1);assert.equal(wire.properties.objects.maxItems,undefined);assert.equal(wire.properties.objects.items.properties.position.minItems,undefined);assert.deepEqual(wire.properties.objects.items.properties.kind.enum,['rect']);
 assert.equal(geminiTransportSchema(schema).properties.objects.maxItems,12);
});
test('solo un rechazo confirmado del esquema habilita adaptar la solicitud',()=>{
 assert.equal(isSchemaRejection({status:400,providerDetails:{details:[{description:'response_json_schema too complex'}]}}),true);
 for(const error of [{status:400,providerDetails:{message:'Invalid image'}},{status:503,providerDetails:{message:'schema'}},{status:400}])assert.equal(isSchemaRejection(error),false);
});
test('el diagnóstico oculta credenciales también en detalles anidados',()=>{
 const safe=safeProviderDetails({message:'key=private-test-key',details:[{value:'Bearer abc.def sk-testsecret'}]},['private-test-key']);assert.ok(!JSON.stringify(safe).includes('private-test-key'));assert.ok(!JSON.stringify(safe).includes('abc.def'));assert.ok(!JSON.stringify(safe).includes('sk-testsecret'));
});
