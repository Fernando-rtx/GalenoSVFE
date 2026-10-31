import { editableRecord } from '../editable-record.js';
import { gestionError } from './dashboard-presentation.js';
const node = (tag, text, className) => { const n = document.createElement(tag);if (text !== undefined) n.textContent = text;if (className) n.className = className;return n; };
const localDate = iso => { if (!iso) return '';const d = new Date(iso);d.setMinutes(d.getMinutes() - d.getTimezoneOffset());return d.toISOString().slice(0, 16); };
const instant = value => value ? new Date(value).toISOString() : null;

/** Formularios anidados en el dashboard; conserva los componentes originales. */
export default class ConsultaGestionPage {
  constructor(root, control, { onOrders } = {}) {
    this.onOrders = onOrders;
    this.root = root;this.control = control;this.editor = null;
    this.notice = node('p');this.notice.setAttribute('role','status');
    this.actions = node('div',undefined,'gestion-tools');
    this.create = node('button','Nueva consulta','primary-button');this.add = node('button','Asociar procedimiento','secondary-button');
    this.create.onclick = () => control.editConsulta(true);this.add.onclick = () => control.newProcedure();
    this.actions.append(this.create,this.add);
    this.children = node('section',undefined,'panel consulta-relaciones');this.children.setAttribute('aria-label','Procedimientos y pasos de la consulta');
    this.dialog = node('dialog',undefined,'gestion-dialog');this.form = node('form');this.fields = node('div',undefined,'gestion-fields');this.error = node('p',undefined,'action-error');this.error.setAttribute('role','alert');
    this.save = node('button','Guardar','primary-button');this.save.type='submit';this.cancel = node('button','Cancelar','secondary-button');this.cancel.type='button';this.cancel.onclick = () => control.cancel();
    this.dialog.oncancel = event => { event.preventDefault();control.cancel(); };
    const actions = node('div',undefined,'gestion-tools');actions.append(this.cancel,this.save);this.form.append(this.fields,this.error,actions);this.dialog.append(this.form);root.append(this.notice,this.actions,this.children,this.dialog);
    this.form.onsubmit = event => { event.preventDefault();control.save(this.data(control.state)); };
    this.cards = document.querySelector('[data-ui=cards]');
    this.openCard = event => { const card=event.target.closest('tarjeta-consulta');if(card&&!event.composedPath().some(n=>n.matches?.('button')))control.openConsulta(card.consulta.idConsulta); };
    this.cards.addEventListener('dblclick',this.openCard);
    this.unsubscribe = control.subscribe(state => this.render(state));
  }
  field(name,label,type='text',value='',required=false) {
    const input = node(type==='textarea'?'textarea':'input');input.name=name;input.id='consulta-gestion-'+name;
    if(type!=='textarea')input.type=type;input.value=value??'';input.required=required;
    const title=node('label',label);title.htmlFor=input.id;this.fields.append(title,input);return input;
  }
  build(state) {
    const value=state.selected;this.fields.replaceChildren(node('h2',state.editor==='paso'?'Editar paso':state.editor==='procedimiento'?'Procedimiento de consulta':value?'Editar consulta':'Nueva consulta'));
    if(state.editor==='consulta') {
      if(value) this.fields.append(node('p','Paciente: '+(value.personaNombre??value.idPersonaRol)));
      else {
        const search=this.field('buscar','Buscar paciente por nombre o DUI','search');const button=node('button','Buscar pacientes','secondary-button');button.type='button';button.onclick=()=>this.control.searchPatients(search.value);this.fields.append(button);
        const label=node('label','Paciente');label.htmlFor='consulta-paciente';this.patients=node('select');this.patients.name='idPersonaRol';this.patients.id='consulta-paciente';this.patients.required=true;this.fields.append(label,this.patients);
      }
      const reference=this.field('referenciaExterna','Referencia externa','text',value?.referenciaExterna);reference.maxLength=255;
    }
    if(state.editor==='procedimiento') {
      if(value) this.fields.append(node('p','Procedimiento: '+value.idProcedimiento));
      else {
        this.procedures=node('select');this.procedures.name='idProcedimiento';this.procedures.id='consulta-procedimiento';this.procedures.required=true;
        const label=node('label','Procedimiento activo');label.htmlFor=this.procedures.id;this.fields.append(label,this.procedures);
        this.catalogPager=node('div',undefined,'gestion-tools');this.catalogPrev=node('button','Procedimientos anteriores','text-button');this.catalogNext=node('button','Más procedimientos','text-button');
        this.catalogPrev.type=this.catalogNext.type='button';this.catalogPrev.onclick=()=>this.control.loadProcedures(this.control.state.firstProcedimientos-20);this.catalogNext.onclick=()=>this.control.loadProcedures(this.control.state.firstProcedimientos+20);
        this.catalogPager.append(this.catalogPrev,this.catalogNext);this.fields.append(this.catalogPager);
      }
    }
    this.field('fechaInicio','Inicio · hora local','datetime-local',localDate(value?.fechaInicio??new Date().toISOString()),true);
    this.field('fechaFin','Fin · hora local (opcional)','datetime-local',localDate(value?.fechaFin));
    if(state.editor==='paso') {
      this.fields.append(node('p','Responsable asignado: '+value.idPersonaRol));
      const select=node('select');select.name='estado';select.id='consulta-estado';select.required=true;
      for(const text of ['PENDIENTE','EN_CURSO','COMPLETADO']) { const option=node('option',text);option.value=text;select.append(option); }
      select.value=value.estado;const label=node('label','Estado del paso');label.htmlFor=select.id;this.fields.append(label,select);
    } else this.field('observaciones','Observaciones','textarea',value?.observaciones);
  }
  data(state) {
    const f=this.form.elements;const data={fechaInicio:instant(f.fechaInicio.value),fechaFin:instant(f.fechaFin.value)};
    if(state.editor==='consulta')Object.assign(data,{idPersonaRol:state.selected?.idPersonaRol??f.idPersonaRol.value,referenciaExterna:f.referenciaExterna.value,observaciones:f.observaciones.value});
    if(state.editor==='procedimiento')Object.assign(data,{idConsulta:state.consulta.idConsulta,idProcedimiento:state.selected?.idProcedimiento??f.idProcedimiento.value,observaciones:f.observaciones.value});
    if(state.editor==='paso')Object.assign(data,{idConsultaProcedimiento:state.selected.idConsultaProcedimiento,idPersonaRol:state.selected.idPersonaRol,estado:f.estado.value});
    return data;
  }
  render(state) {
    this.notice.textContent=state.error?gestionError(state.error):state.message;
    this.create.disabled=state.writing||!state.clinic||!this.control.contexto.puedeEscribir;
    this.add.disabled=state.writing||!state.consulta||!this.control.contexto.puedeEscribir;
    editableRecord(document.querySelector('[data-ui=detail]'),()=>this.control.editConsulta(false),Boolean(state.consulta)&&!state.writing&&this.control.contexto.puedeEscribir);
    this.children.hidden=!state.consulta;this.children.replaceChildren();
    if(state.consulta) for(const [name,rows,total,first,key,id,label] of [
      ['Procedimientos asociados',state.asociaciones,state.totalAsociaciones,state.firstAsociaciones,'firstAsociaciones','idConsultaProcedimiento','idProcedimiento'],
      ['Pasos de la consulta',state.pasos,state.totalPasos,state.firstPasos,'firstPasos','idConsultaProcedimientoPaso','estado']]) {
      this.children.append(node('h3',`${name} · ${total}`));
      for(const row of rows) {
        const line=node('div',undefined,'gestion-tools');line.append(node('span',`${row[label]} · ${row.fechaInicio??'Sin fecha'}`));
        editableRecord(line,()=>key==='firstPasos'?this.control.editStep(row):this.control.editProcedure(row),!state.writing&&this.control.contexto.puedeEscribir);if(key === "firstPasos" && this.onOrders){const orders=node("button","Órdenes","secondary-button");orders.type="button";orders.disabled=state.writing;orders.onclick=()=>this.onOrders(row);line.append(orders);}this.children.append(line);
      }
      if(!rows.length)this.children.append(node('p','Sin registros asociados.'));
      const pager=node('div',undefined,'gestion-tools');const prev=node('button','Anterior','pagination-button');const next=node('button','Siguiente','pagination-button');
      prev.type=next.type='button';prev.disabled=state.writing||first===0;next.disabled=state.writing||first+10>=total;
      prev.onclick=()=>this.control.loadChildren({[key]:Math.max(0,first-10)});next.onclick=()=>this.control.loadChildren({[key]:first+10});pager.append(prev,next);this.children.append(pager);
    }
    if(state.editor && !this.dialog.open){this.build(state);this.dialog.showModal();}
    if(!state.editor&&this.dialog.open)this.dialog.close();
    if(state.editor==='consulta'&&!state.selected&&this.patients) {
      const previous=this.patients.value;this.patients.replaceChildren(node('option','Selecciona un paciente'));this.patients.firstChild.value='';
      for(const p of state.pacientes){const option=node('option',`${p.nombres??''} ${p.apellidos??''}`.trim()||p.idPersonaRol);option.value=p.idPersonaRol;this.patients.append(option);}
      this.patients.value=previous;
    }
    if(state.editor==='procedimiento'&&!state.selected&&this.procedures) {
      const previous=this.procedures.value;this.procedures.replaceChildren(node('option','Selecciona un procedimiento'));this.procedures.firstChild.value='';
      for(const p of state.procedimientos){const option=node('option',p.nombre??p.idProcedimiento);option.value=p.idProcedimiento;this.procedures.append(option);}
      this.procedures.value=previous;this.catalogPrev.disabled=state.firstProcedimientos===0;this.catalogNext.disabled=state.firstProcedimientos+20>=state.totalProcedimientos;
    }
    this.save.textContent=state.writing?'Guardando…':'Guardar';this.form.setAttribute('aria-busy',String(state.writing));
    this.form.querySelectorAll('input,textarea,select,button').forEach(input=>{input.disabled=state.writing;});
    if(this.catalogPrev){this.catalogPrev.disabled=state.writing||state.firstProcedimientos===0;this.catalogNext.disabled=state.writing||state.firstProcedimientos+20>=state.totalProcedimientos;}
    this.error.textContent=state.error?gestionError(state.error):'';
  }
  destroy(){editableRecord(document.querySelector('[data-ui=detail]'),()=>{},false);this.cards.removeEventListener('dblclick',this.openCard);this.unsubscribe();if(this.dialog.open)this.dialog.close();this.root.replaceChildren();}
}
