import { editableRecord } from '../editable-record.js';
import {gestionError} from './dashboard-presentation.js';
const node=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
const local=iso=>{const d=new Date(iso);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
/** Formularios de orden/resultado vinculados a un paso; sin llamadas HTTP. */
export default class OrdenPage {
 constructor(root,control){
  this.root=root;this.control=control;this.title=node('h2');this.status=node('p');this.status.setAttribute('role','status');this.tools=node('div',undefined,'gestion-tools');this.list=node('div');
  this.dialog=node('dialog',undefined,'gestion-dialog');this.form=node('form');this.fields=node('div',undefined,'gestion-fields');this.error=node('p',undefined,'action-error');this.error.setAttribute('role','alert');
  this.save=node('button','Guardar','primary-button');this.save.type='submit';this.cancel=this.button('Cancelar',()=>control.cancel());const actions=node('div',undefined,'gestion-tools');actions.append(this.cancel,this.save);this.form.append(this.fields,this.error,actions);this.dialog.append(this.form);root.append(this.title,this.status,this.tools,this.list,this.dialog);
  this.dialog.oncancel=e=>{e.preventDefault();control.cancel();};this.form.onsubmit=e=>{e.preventDefault();const s=control.state;const data={fechaCreacion:new Date(this.form.elements.fechaCreacion.value).toISOString()};for(const key of s.orden?['resultado','interpretacion','rutaAtestado']:['indicaciones'])data[key]=this.form.elements[key].value;control.save(data);};
  this.unsubscribe=control.subscribe(s=>this.render(s));
 }
 button(text,action,disabled=false){const b=node('button',text,'secondary-button');b.type='button';b.disabled=disabled;b.onclick=action;return b;}
 render(s){
  this.save.textContent=s.writing?'Guardando…':'Guardar';this.form.setAttribute('aria-busy',String(s.writing));
  this.root.hidden=!s.paso;this.title.textContent=s.orden?'Resultados de la orden':'Órdenes del paso';this.status.textContent=s.error?gestionError(s.error):s.message;
  this.tools.replaceChildren(this.button(s.orden?'Nuevo resultado':'Nueva orden',()=>this.control.edit(),s.writing||!this.control.contexto.puedeEscribir));if(s.orden)this.tools.append(this.button('Volver a órdenes',()=>this.control.back(),s.writing));
  this.list.replaceChildren();for(const row of s.rows){const line=node('div',undefined,'gestion-tools');line.append(node('span',(row.fechaCreacion??'Sin fecha')+' · '+(row.indicaciones??row.resultado??'Sin especificar')));if(!s.orden)line.append(this.button('Resultados',()=>this.control.results(row),s.writing));editableRecord(line,()=>this.control.edit(row),!s.writing&&this.control.contexto.puedeEscribir);this.list.append(line);}
  this.list.append(node('p',s.total+' registros'),this.button('Anterior',()=>this.control.load(Math.max(0,s.first-10)),s.writing||s.first===0),this.button('Siguiente',()=>this.control.load(s.first+10),s.writing||s.first+10>=s.total));
  if(s.editor&&!this.dialog.open){this.fields.replaceChildren(node('h2',s.orden?'Resultado de examen':'Orden de examen'));const labels={fechaCreacion:'Fecha de creación · hora local',indicaciones:'Indicaciones',resultado:'Resultado',interpretacion:'Interpretación',rutaAtestado:'Ruta de atestado'};
   for(const key of ['fechaCreacion',...(s.orden?['resultado','interpretacion','rutaAtestado']:['indicaciones'])]){const input=node(key==='fechaCreacion'||key==='rutaAtestado'?'input':'textarea');input.name=key;input.id='orden-'+key;const label=node('label',labels[key]);label.htmlFor=input.id;
    if(key==='fechaCreacion'){input.type='datetime-local';input.required=true;input.value=local(s.editor.data?.fechaCreacion??new Date().toISOString());}else input.value=s.editor.data?.[key]??'';this.fields.append(label,input);}
   this.dialog.showModal();
  }
  if(!s.editor&&this.dialog.open)this.dialog.close();this.form.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=s.writing);this.error.textContent=s.error?gestionError(s.error):'';
 }
 destroy(){this.unsubscribe();if(this.dialog.open)this.dialog.close();this.root.replaceChildren();}
}
