// This is a conservative admission bound, not a claim about billable token usage.
export function textReservation({system,prompt,schema,maxOutputTokens,images=[]},provider='gemini'){
 const inputUpperBound=Buffer.byteLength(system+prompt+JSON.stringify(schema))+512;
 return {required:inputUpperBound+maxOutputTokens+images.length*4096,inputUpperBound,outputLimit:maxOutputTokens,imageUpperBound:images.length*4096,provider,method:'utf8-upper-bound'};
}
export function textBudgetError(budget){
 const n=value=>value.toLocaleString('es');
 return Object.assign(new Error(`Presupuesto local de texto insuficiente: quedan ${n(budget.available)} tokens de ${n(budget.limit)}. La siguiente etapa reserva hasta ${n(budget.required)}; faltan ${n(budget.shortfall)}. Es un límite compartido por Gemini y OpenAI, no el saldo de sus APIs. Los avances se conservan; revisa el presupuesto en Configuración.`),{code:'TEXT_BUDGET_EXCEEDED',budget});
}
