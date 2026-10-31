import { editableRecord } from '../editable-record.js';
import {gestionError} from './dashboard-presentation.js';
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const names={persona:'Persona',documento:'Documento',medioContacto:'Medio de contacto',personaRol:'Asignación de rol'};
const idField=kind=>'id'+kind[0].toUpperCase()+kind.slice(1);

/** Persona y documentos/contactos/roles dentro del shell existente. */
export default class PersonaPage {
 constructor(root,control){
  this.root=root;this.control=control;
  root.replaceChildren(node('h1','Personas'),node('p','Administra personas y sus documentos, medios de contacto y asignaciones de rol.','subtitle'));
  this.notice=node('p');this.notice.setAttribute('role','status');this.error=node('p',undefined,'action-error');this.error.setAttribute('role','alert');
  const tools=node('div',undefined,'gestion-tools');this.search=node('form');
  this.nombres=node('input');this.nombres.placeholder='Nombres';this.nombres.setAttribute('aria-label','Filtrar nombres');this.apellidos=node('input');this.apellidos.placeholder='Apellidos';this.apellidos.setAttribute('aria-label','Filtrar apellidos');
  const search=node('button','Buscar','secondary-button');search.type='submit';this.search.append(this.nombres,this.apellidos,search);
  this.newButton=node('button','Nueva persona','primary-button');this.newButton.onclick=()=>control.edit('persona');tools.append(this.search,this.newButton);
  this.search.onsubmit=event=>{event.preventDefault();control.load({first:0,nombres:this.nombres.value,apellidos:this.apellidos.value});};
  this.list=node('div',undefined,'panel table-scroll');this.pager=node('div',undefined,'pagination');this.detail=node('section',undefined,'panel persona-relaciones');
  this.dialog=node('dialog',undefined,'gestion-dialog');this.form=node('form');this.fields=node('div',undefined,'gestion-fields');this.formError=node('p',undefined,'action-error');this.formError.setAttribute('role','alert');
  this.save=node('button','Guardar','primary-button');this.save.type='submit';this.cancel=node('button','Cancelar','secondary-button');this.cancel.type='button';this.cancel.onclick=()=>control.cancel();
  this.dialog.oncancel=event=>{event.preventDefault();control.cancel();};
  const actions=node('div',undefined,'gestion-tools');actions.append(this.cancel,this.save);this.form.append(this.fields,this.formError,actions);this.dialog.append(this.form);
  this.form.onsubmit=event=>{event.preventDefault();const s=control.state;const f=this.form.elements;let data;
   if(s.editor.kind==='persona')data={nombres:f.nombres.value,apellidos:f.apellidos.value,fechaNacimiento:f.fechaNacimiento.value+'T06:00:00Z'};
   if(s.editor.kind==='documento')data={idTipoDocumento:f.idTipoDocumento.value,valor:f.valor.value,rutaFisica:f.rutaFisica.value};
   if(s.editor.kind==='medioContacto')data={idTipoMedioContacto:f.idTipoMedioContacto.value,valor:f.valor.value};
   if(s.editor.kind==='personaRol')data={idRol:f.idRol.value,idClinica:f.idClinica.value};control.save(data);
  };
  root.append(this.notice,this.error,tools,this.list,this.pager,this.detail,this.dialog);this.unsubscribe=control.subscribe(s=>this.render(s));
 }
 button(text,action,disabled=false){const button=node('button',text,'secondary-button');button.type='button';button.disabled=disabled;button.onclick=action;return button;}
 page(root,first,total,action){root.replaceChildren(node('span',`${total} registros`),this.button('Anterior',()=>action(Math.max(0,first-10)),first===0||this.control.state.writing),this.button('Siguiente',()=>action(first+10),first+10>=total||this.control.state.writing));}
 field(name,label,type,value='',required=true){
  const input=node(type==='select'?'select':'input');if(type!=='select')input.type=type;input.name=name;input.id='persona-'+name;input.value=value??'';input.required=required;
  const title=node('label',label);title.htmlFor=input.id;this.fields.append(title,input);return input;
 }
 build(state){
  const {kind,data}=state.editor;this.fields.replaceChildren(node('h2',(kind==='personaRol'&&data?'':data?'Editar ':'Crear ')+names[kind]));this.selects={};
  if(kind==='persona'){
   for(const [key,title]of [['nombres','Nombres'],['apellidos','Apellidos']]){const input=this.field(key,title,'text',data?.[key]);input.maxLength=255;}
   const birth=this.field('fechaNacimiento','Fecha de nacimiento','date',data?.fechaNacimiento?.slice(0,10));birth.min='1900-01-01';birth.max=new Date().toLocaleDateString('en-CA',{timeZone:'America/El_Salvador'});
  } else {
   const resources=kind==='documento'?['tipoDocumento']:kind==='medioContacto'?['tipoMedioContacto']:['rol','clinica'];
   for(const resource of resources){const key=idField(resource);const input=this.field(key,resource==='clinica'?'Clínica autorizada':resource==='rol'?'Rol':'Tipo','select');this.selects[resource]=input;}
   if(kind!=='personaRol')this.field('valor','Valor','text',data?.valor);
   if(kind==='documento')this.field('rutaFisica','Ruta física (opcional)','text',data?.rutaFisica,false);
  }
 }
 render(state){
  this.notice.textContent=state.status==='loading'?'Cargando…':state.message;this.error.textContent=state.error?gestionError(state.error):'';this.newButton.disabled=state.writing||!this.control.contexto.puedeEscribir;
  this.list.replaceChildren();const table=node('table');const head=node('tr');head.append(node('th','Persona'),node('th','Nacimiento'),node('th','Acciones'));const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');
  for(const p of state.rows){const tr=node('tr');tr.append(node('td',`${p.nombres??''} ${p.apellidos??''}`.trim()||'Sin nombre'),node('td',p.fechaNacimiento?.slice(0,10)??'Sin fecha'));const cell=node('td');cell.append(this.button('Abrir',()=>this.control.select(p.idPersona),state.writing));editableRecord(tr,()=>this.control.edit('persona',p),!state.writing&&this.control.contexto.puedeEscribir);tr.append(cell);body.append(tr);}table.append(body);this.list.append(table);
  this.page(this.pager,state.first,state.total,first=>this.control.load({first}));this.detail.hidden=!state.person;this.detail.replaceChildren();
  if(state.person){
   this.detail.append(node('h2',`${state.person.nombres??''} ${state.person.apellidos??''}`));
   editableRecord(this.detail.firstChild,()=>this.control.edit('persona',state.person),!state.writing&&this.control.contexto.puedeEscribir);
   const tabs=node('div',undefined,'gestion-tools');for(const [key,label]of [['documento','Documentos'],['medioContacto','Contactos'],['personaRol','Roles y clínicas']]){const b=this.button(label,()=>this.control.tab(key),state.writing);b.setAttribute('aria-pressed',String(state.tab===key));tabs.append(b);}this.detail.append(tabs);
   this.detail.append(this.button('Agregar '+names[state.tab].toLowerCase(),()=>this.control.edit(state.tab),state.writing||!this.control.contexto.puedeEscribir));
   for(const row of state.children){const line=node('div',undefined,'gestion-tools');
    line.append(node('span',row.valor??`Rol ${row.idRol} · Clínica ${row.idClinica}`),this.button('Eliminar',()=>{if(confirm('¿Eliminar este registro asociado?'))this.control.remove(row);},state.writing||!this.control.contexto.puedeEscribir));editableRecord(line,()=>this.control.edit(state.tab,row),!state.writing&&this.control.contexto.puedeEscribir);this.detail.append(line);
   }
   const pager=node('div',undefined,'pagination');this.page(pager,state.childFirst,state.childTotal,childFirst=>this.control.loadChildren({childFirst}));this.detail.append(pager);
  }
  if(state.editor&&!this.dialog.open){this.build(state);this.dialog.showModal();}
  if(!state.editor&&this.dialog.open)this.dialog.close();
  if(state.editor)for(const [resource,select]of Object.entries(this.selects??{})){
   const current=state.editor.data?.[idField(resource)]??select.value;select.replaceChildren(node('option','Selecciona una opción'));select.firstChild.value='';
   for(const row of state.options[resource]??[]){const id=row[idField(resource)];if(!row.activo&&id!==current)continue;if(resource==='clinica'&&!this.control.contexto.clinicas.includes(id))continue;
    const option=node('option',row.nombre??id);option.value=id;select.append(option);}
   select.value=current;select.disabled=Boolean(state.editor.data)||state.writing;
  }
  this.save.textContent=state.writing?'Guardando…':'Guardar';this.form.setAttribute('aria-busy',String(state.writing));
  this.save.hidden=state.editor?.kind==='personaRol'&&Boolean(state.editor.data);
  this.form.querySelectorAll('input,button').forEach(input=>{input.disabled=state.writing;});
  this.formError.textContent=state.error?gestionError(state.error):'';
 }
 destroy(){this.unsubscribe();if(this.dialog.open)this.dialog.close();this.root.replaceChildren();}
}
