// Keep the generation grammar small; enforce lengths, counts and numeric bounds locally.
export function generationSchema(schema){
 if(Array.isArray(schema))return schema.map(generationSchema);
 if(!schema||typeof schema!=='object')return schema;
 const result={};for(const [key,value] of Object.entries(schema)){
  if(['$schema','minimum','maximum','exclusiveMinimum','exclusiveMaximum','minItems','maxItems'].includes(key))continue;
  result[key]=key==='properties'?Object.fromEntries(Object.entries(value).map(([name,child])=>[name,generationSchema(child)])):generationSchema(value);
 }
 return result;
}
