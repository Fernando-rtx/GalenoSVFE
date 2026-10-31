const definitions={examenTipoExamen:{parent:'idExamen',target:'idTipoExamen',options:'tipoExamen'},procedimientoPasoExamen:{parent:'idProcedimientoPaso',target:'idExamen',options:'examen'},procedimientoPasoSecuencia:{parent:'idProcedimientoPaso',target:'idProcedimientoPasoReferencia',options:'procedimientoPaso'}};
/** Asociaciones de tipos, exámenes y secuencias dentro de su registro padre. */
export default class RelacionControl {
 constructor({daos,contexto}){Object.assign(this,{daos,contexto});this.listeners=new Set();this.requests={};this.closed=false;this.state={kind:null,parent:null,rows:[],options:[],first:0,total:0,editor:null,writing:false,error:null,message:''};}
 subscribe(fn){this.listeners.add(fn);fn(this.state);return()=>this.listeners.delete(fn);}
 set(change){if(this.closed)return;this.state=Object.freeze({...this.state,...change});this.listeners.forEach(fn=>fn(this.state));}
 async open(kind,parent){if(this.state.writing)return;Object.values(this.requests).forEach(r=>r.abort());this.set({kind,parent,first:0,rows:[],options:[],editor:null,error:null,message:''});await Promise.all([this.load(),this.loadOptions()]);}
 async load(first=this.state.first){
  if(!this.state.kind||this.state.writing)return;this.requests.rows?.abort();const request=new AbortController();this.requests.rows=request;const {kind,parent}=this.state;const d=definitions[kind];
  try{const r=await this.daos[kind].findRange(first,10,{signal:request.signal,query:{[d.parent]:parent[d.parent]}});if(!request.signal.aborted)this.set({rows:r.datos,total:r.totalDatos,first});}catch(error){if(!request.signal.aborted)this.set({error});}
 }
 async loadOptions(){
  this.requests.options?.abort();const request=new AbortController();this.requests.options=request;const {kind,parent}=this.state;const d=definitions[kind];
  try{const rows=[];let first=0,page;do{page=await this.daos[d.options].findRange(first,20,{signal:request.signal,query:d.options==='procedimientoPaso'?{idProcedimiento:parent.idProcedimiento}:{}});rows.push(...page.datos);first+=page.datos.length;}while(page.datos.length&&first<page.totalDatos);if(!request.signal.aborted)this.set({options:rows});}catch(error){if(!request.signal.aborted)this.set({error});}
 }
 edit(data=null){if(!this.state.writing&&this.contexto.puedeEscribir)this.set({editor:{data},error:null,message:''});}
 cancel(){if(!this.state.writing)this.set({editor:null,error:null});}
 async save(data){
  if(this.state.writing||!this.state.editor||!this.contexto.puedeEscribir)return;const {kind,parent,editor}=this.state;const d=definitions[kind];const payload={...data,[d.parent]:parent[d.parent]};const id='id'+kind[0].toUpperCase()+kind.slice(1);this.set({writing:true,error:null});
  try{if(editor.data)await this.daos[kind].update(editor.data[id],payload);else await this.daos[kind].create(payload);this.set({writing:false,editor:null,message:'Asociación guardada en PostgreSQL.'});await this.load(0);}catch(error){this.set({writing:false,error});}
 }
 async remove(row){if(this.state.writing||!this.contexto.puedeEscribir)return;const {kind}=this.state;const id='id'+kind[0].toUpperCase()+kind.slice(1);this.set({writing:true,error:null});try{await this.daos[kind].deleteById(row[id]);this.set({writing:false,message:'Asociación retirada.'});await this.load(0);}catch(error){this.set({writing:false,error});}}
 destroy(){this.closed=true;Object.values(this.requests).forEach(r=>r.abort());this.listeners.clear();}
}
