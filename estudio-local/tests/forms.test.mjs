import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
test('guardar voz funciona aunque el formulario tenga un campo interno llamado id',async()=>{
 const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^await load\(\);poll=.*$/m,'');
 let submit,request,closed=false;const button={disabled:false},element={addEventListener(){}};
 const ctx=vm.createContext({console,Intl,crypto:{randomUUID:()=> 'request'},document:{querySelector:()=>element,addEventListener:(name,fn)=>{if(name==='submit')submit=fn;}},FormData:class{constructor(form){return Object.entries(form.values);}},fetch:async(url,opts)=>{request={url,body:JSON.parse(opts.body)};return {ok:true,json:async()=>({profiles:[{id:'profile',name:'Canal',voiceId:'chosen',voiceName:'Narradora'}]})};}});
 vm.runInContext(source,ctx);vm.runInContext("voices=[{id:'chosen',name:'Narradora',source:'account'}]; modal.close=()=>{}; navigate=()=>{}; message=()=>{};",ctx);
 // HTMLFormElement exposes named controls; form.id can be the control, not the ID string.
 const form={id:{name:'id',value:'profile'},getAttribute:key=>key==='id'?'voice-form':null,values:{id:'profile',voiceId:'chosen'},querySelector:()=>button};
 await submit({preventDefault(){},target:form});
 assert.equal(request?.url,'/api/profile-voice');assert.equal(request.body.id,'profile');assert.equal(request.body.voiceId,'chosen');assert.equal(vm.runInContext('state.profiles[0].voiceId',ctx),'chosen');
});
