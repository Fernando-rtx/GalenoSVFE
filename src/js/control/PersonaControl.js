/** Registro de personas y asociaciones anidadas; no conoce DOM ni Fetch. */
export default class PersonaControl {
 constructor({daos,contexto}) {
  this.daos=daos;this.contexto=contexto;this.listeners=new Set();this.requests={};this.closed=false;
  this.state={first:0,max:10,nombres:'',apellidos:'',rows:[],total:0,status:'idle',person:null,tab:'documento',children:[],childFirst:0,childTotal:0,editor:null,options:{},writing:false,error:null,message:''};
 }
 subscribe(fn){this.listeners.add(fn);fn(this.state);return()=>this.listeners.delete(fn);}
 set(changes){if(this.closed)return;this.state=Object.freeze({...this.state,...changes});this.listeners.forEach(fn=>fn(this.state));}
 async read(key,action,success){
  this.requests[key]?.abort();const request=new AbortController();this.requests[key]=request;
  try{const result=await action(request.signal);if(!this.closed&&this.requests[key]===request&&!request.signal.aborted)success(result);}
  catch(error){if(!request.signal.aborted&&!this.closed)this.set({error,status:key==='list'?'error':this.state.status});}
 }
 async load(changes={}){
  if(this.state.writing)return;this.set({...changes,status:'loading',error:null});const s=this.state;
  await this.read('list',signal=>this.daos.persona.findRange(s.first,s.max,{signal,query:{nombres:s.nombres,apellidos:s.apellidos}}),r=>this.set({rows:r.datos,total:r.totalDatos,status:'ready'}));
 }
 async select(id){
  if(this.state.writing)return;
  this.requests.children?.abort();this.requests.options?.abort();this.set({editor:null,error:null,person:null,children:[],childFirst:0});
  await this.read('person',signal=>this.daos.persona.findById(id,{signal}),r=>this.set({person:r.datos}));
  if(this.state.person)await this.loadChildren();
 }
 async loadChildren(changes={}){
  if(!this.state.person||this.state.writing)return;this.set(changes);const {person,tab,childFirst}=this.state;
  await this.read('children',signal=>this.daos[tab].findRange(childFirst,10,{signal,query:{idPersona:person.idPersona}}),r=>this.set({children:r.datos,childTotal:r.totalDatos}));
 }
 async tab(tab){if(this.state.writing)return;this.set({tab,editor:null,children:[],childFirst:0,error:null});await this.loadChildren();}
 async edit(kind,data=null){
  if(this.state.writing||!this.contexto.puedeEscribir)return;
  this.set({editor:{kind,data},options:{},error:null,message:''});
  const required=kind==='documento'?['tipoDocumento']:kind==='medioContacto'?['tipoMedioContacto']:kind==='personaRol'?['rol','clinica']:[];
  await this.read('options',async signal=>{
   const result={};for(const resource of required){
    const values=[];let first=0,page;
    do{page=await this.daos[resource].findRange(first,20,{signal});values.push(...page.datos);first+=page.datos.length;}
    while(page.datos.length&&first<page.totalDatos);
    result[resource]=values;
   }return result;
  },options=>this.set({options}));
 }
 cancel(){if(!this.state.writing){this.requests.options?.abort();this.set({editor:null,error:null});}}
 async save(data){
  if(this.state.writing||!this.state.editor||!this.contexto.puedeEscribir)return;
  const {kind,data:selected}=this.state.editor;const person=this.state.person;const id='id'+kind[0].toUpperCase()+kind.slice(1);
  this.set({writing:true,error:null,message:''});
  try{
   const payload=kind==='persona'?data:{...data,idPersona:person.idPersona};
   const saved=selected?await this.daos[kind].update(selected[id],payload):await this.daos[kind].create(payload);
   this.set({writing:false,editor:null,message:'Cambios guardados en PostgreSQL.',...(kind==='persona'?{person:saved.datos}: {})});
   await this.load();await this.loadChildren({childFirst:0});
  }catch(error){this.set({writing:false,error});}
 }
 async remove(row){
  if(this.state.writing||!this.contexto.puedeEscribir)return;const {tab}=this.state;const id='id'+tab[0].toUpperCase()+tab.slice(1);
  this.set({writing:true,error:null,message:''});
  try{await this.daos[tab].deleteById(row[id]);this.set({writing:false,message:'Registro eliminado.'});await this.loadChildren({childFirst:0});}
  catch(error){this.set({writing:false,error});}
 }
 destroy(){this.closed=true;Object.values(this.requests).forEach(r=>r.abort());this.listeners.clear();}
}
