// Keep ordinary grammar small; visual plans also enforce array bounds in the provider schema.
export function generationSchema(schema,options={}){
 if(Array.isArray(schema))return schema.map(child=>generationSchema(child,options));
 if(!schema||typeof schema!=='object')return schema;
 const result={};for(const [key,value] of Object.entries(schema)){
  if(['$schema','minimum','maximum','exclusiveMinimum','exclusiveMaximum'].includes(key)||(!options.arrayBounds&&['minItems','maxItems'].includes(key)))continue;
  result[key]=key==='properties'?Object.fromEntries(Object.entries(value).map(([name,child])=>[name,generationSchema(child,options)])):generationSchema(value,options);
 }
 return result;
}
