import { editableRecord } from '../editable-record.js';
import { gestionError } from './dashboard-presentation.js';

// Sugerencias de presentación del enum JSF FormatoRegexSugerido; Java valida el formato.
const formatosSugeridos = [
  ['Personalizado', null],
  ['DUI de El Salvador', '^[0-9]{8}-[0-9]$'],
  ['Teléfono de El Salvador', '^(2|6|7)[0-9]{7}$'],
  ['Correo electrónico', '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'],
  ['Solo números', '^[0-9]+$'],
  ['Alfanumérico', '^[A-Za-z0-9]+$'],
  ['Teléfono residencial', '^2[0-9]{7}$']
];

const names = { examen: 'Exámenes', procedimiento: 'Procedimientos', persona: 'Personas', clinica: 'Clínicas', rol: 'Roles', tipoDocumento: 'Tipos de documento', tipoMedioContacto: 'Tipos de medio de contacto', tipoExamen: 'Tipos de examen' };
const descriptions = { clinica: 'Administra las clínicas registradas en el sistema.', rol: 'Administra los roles disponibles en el sistema.', tipoDocumento: 'Administra el catálogo de tipos de documento disponibles en el sistema.', tipoMedioContacto: 'Administra los tipos de medio de contacto y sus formatos.', tipoExamen: 'Administra los tipos de examen disponibles.', examen: 'Administra los exámenes y sus tipos asociados.', procedimiento: 'Administra los procedimientos y sus pasos relacionados.' };
const fields = { examen: ['nombre','observaciones','activo'], procedimiento: ['nombre','observaciones','activo'],
  clinica: ['nombre', 'tipo', 'comentarios', 'activo'], rol: ['nombre', 'observaciones', 'activo'],
  tipoDocumento: ['nombre', 'expresionRegular', 'indicaciones', 'activo'],
  tipoMedioContacto: ['nombre', 'expresionRegular', 'indicaciones', 'activo'], tipoExamen: ['nombre', 'observaciones', 'activo']
};
const labels = { nombre: 'Nombre', tipo: 'Tipo de clínica', comentarios: 'Comentarios', observaciones: 'Observaciones', activo: 'Activo', indicaciones: 'Indicaciones', expresionRegular: 'Expresión regular Java' };
function element(tag, text, className) {
  const node = document.createElement(tag);if (text !== undefined) node.textContent = text;if (className) node.className = className;return node;
}

/** Vista de los cinco catálogos, integrada en el shell del dashboard. No llama a la API. */
export default class CatalogoPage {
  constructor(root, { onLogin, onLogout, onRelations }) {
    this.onRelations=onRelations;this.root = root;this.control = null;this.module = 'tipoDocumento';
    this.login = element('form', undefined, 'panel gestion-login');
    this.login.append(element('h2', 'Acceso a gestión'), element('p', 'Utiliza tu cuenta autorizada de GalenosSV.'));
    for (const [key, label] of [['usuario', 'Usuario'], ['clave', 'Contraseña']]) {
      const input = element('input');input.name = key;input.id = `gestion-${key}`;input.required = true;input.type = key === 'clave' ? 'password' : 'text';input.autocomplete = key === 'clave' ? 'current-password' : 'username';
      const title = element('label', label);title.htmlFor = input.id;this.login.append(title, input);
    }
    this.enter = element('button', 'Iniciar sesión', 'primary-button');this.enter.type = 'submit';this.login.append(this.enter);
    this.notice = element('p', undefined, 'action-error');this.notice.setAttribute('role', 'alert');this.notice.hidden = true;
    this.title = element('h1', names[this.module]);this.subtitle = element('p', descriptions[this.module], 'subtitle');this.identity = element('p');
    this.logout = element('button', 'Cerrar sesión', 'secondary-button');this.logout.type = 'button';this.logout.onclick = () => onLogout();
    this.tools = element('div', undefined, 'gestion-tools');this.search = element('form');
    this.query = element('input');this.query.type = 'search';this.query.placeholder = 'Buscar por nombre';this.query.setAttribute('aria-label', 'Buscar catálogo por nombre');
    const search = element('button', 'Buscar', 'secondary-button');search.type = 'submit';
    this.search.append(this.query, search);this.newButton = element('button', 'Nuevo registro', 'primary-button');this.newButton.type = 'button';
    this.tools.append(this.logout);
    this.heading = element('div');this.heading.append(this.title, this.subtitle);this.header = element('div', undefined, 'catalogo-header');this.header.append(this.heading, this.newButton);this.newButton.hidden = true;
    this.results = element('div', undefined, 'panel table-scroll');this.total = element('p');
    this.previous = element('button', 'Anterior', 'pagination-button');this.next = element('button', 'Siguiente', 'pagination-button');
    this.previous.type = this.next.type = 'button';const pager = element('div', undefined, 'pagination');pager.append(this.total, this.previous, this.next);
    this.content = element('div');this.content.append(this.identity, this.tools, this.results, pager);this.content.hidden = true;
    this.dialog = element('dialog', undefined, 'gestion-dialog');this.form = element('form');this.formFields = element('div', undefined, 'gestion-fields');
    this.save = element('button', 'Guardar', 'primary-button');this.save.type = 'submit';
    this.cancel = element('button', 'Cancelar', 'secondary-button');this.cancel.type = 'button';
    this.remove = element('button', 'Eliminar registro', 'secondary-button');this.remove.type = 'button';
    const actions = element('div', undefined, 'gestion-tools');actions.append(this.cancel, this.remove, this.save);
    this.form.append(this.formFields, actions);this.dialog.append(this.form);
    root.append(this.header, this.notice, this.login, this.content, this.dialog);
    this.login.onsubmit = async event => {
      event.preventDefault();this.enter.disabled = true;this.notice.hidden = true;
      try { await onLogin(this.login.elements.usuario.value, this.login.elements.clave.value);this.login.elements.clave.value = ''; }
      catch (error) { this.error(error); }
      finally { this.enter.disabled = false; }
    };
    this.search.onsubmit = event => { event.preventDefault();this.control?.load({ first: 0, nombre: this.query.value.trim() }); };
    this.newButton.onclick = () => this.control?.create();
    this.previous.onclick = () => this.control.load({ first: Math.max(0, this.control.state.first - this.control.state.max) });
    this.next.onclick = () => this.control.load({ first: this.control.state.first + this.control.state.max });
    this.cancel.onclick = () => this.control.cancel();
    this.dialog.oncancel = event => { event.preventDefault();this.control.cancel(); };
    this.form.onsubmit = event => {
      event.preventDefault();const data = {};
      for (const key of fields[this.module]) {
        const input = this.form.elements[key];data[key] = key === 'activo' ? input.checked : input.value;
      }
      this.control.save(data);
    };
    this.remove.onclick = () => {
      if (confirm('¿Eliminar este registro? Si tiene referencias la operación será rechazada.')) this.control.remove();
    };
  }
  connect(control) {
    this.unsubscribe?.();this.control = control;
    this.login.hidden = true;this.content.hidden = false;this.newButton.hidden = false;
    this.unsubscribe = control.subscribe(state => this.render(state));
  }
  signedOut() {
    this.unsubscribe?.();this.control = null;this.login.hidden = false;this.content.hidden = true;this.newButton.hidden = true;
    if (this.dialog.open) this.dialog.close();
  }
  error(error) { this.notice.className='action-error';this.notice.setAttribute('role','alert');this.notice.textContent = gestionError(error);this.notice.hidden = false; }
  open(module) {
    this.module = module;this.title.textContent = names[module];this.subtitle.textContent = descriptions[module];
    this.query.value = '';
    if (this.control) this.control.open(module).catch(error => this.error(error));
  }
  render(state) {
    this.module = state.module;this.title.textContent = names[state.module];this.subtitle.textContent = descriptions[state.module];
    this.identity.textContent = `${state.contexto.actor} · ${state.contexto.puedeEscribir ? 'Edición autorizada' : 'Solo lectura'}`;
    this.newButton.disabled = !state.contexto.puedeEscribir || state.writing;
    this.logout.disabled = state.writing;this.query.disabled = state.writing;
    this.previous.disabled = state.writing || state.status !== 'ready' || state.first === 0;
    this.next.disabled = state.writing || state.status !== 'ready' || state.first + state.max >= state.total;
    this.total.textContent = state.status === 'loading' ? 'Cargando…' : `${state.total} registros`;
    this.notice.className = state.error ? 'action-error' : 'gestion-success';
    this.notice.setAttribute('role',state.error ? 'alert' : 'status');
    this.notice.hidden = !state.error && !state.message;
    this.notice.textContent = state.error ? gestionError(state.error) : state.message;
    if (state.status === 'loading') this.results.setAttribute('aria-busy', 'true');else this.results.removeAttribute('aria-busy');
    this.results.replaceChildren();
    const table = element('table');const head = element('tr');
    const extra = fields[state.module].filter(key => !['nombre', 'activo'].includes(key));
    head.append(element('th', 'Nombre'), element('th', 'Estado'));for (const key of extra) head.append(element('th', labels[key]));if (['procedimiento','examen'].includes(state.module)) head.append(element('th', 'Acciones'));const thead = element('thead');thead.append(head);table.append(thead);
    head.firstChild.append(this.search);
    const body = element('tbody');
    const idKey = 'id' + state.module[0].toUpperCase() + state.module.slice(1);
    for (const row of state.rows) {
      const tr = element('tr');tr.append(element('td', row.nombre ?? 'Sin nombre'), element('td', row.activo ? 'Activo' : 'Inactivo'));for (const key of extra) tr.append(element('td', row[key] || 'Sin dato'));
      editableRecord(tr, () => this.control.edit(row[idKey]), !state.writing);
      const cell = element('td');if(["procedimiento","examen"].includes(state.module) && this.onRelations){const flow=element("button",state.module === "procedimiento" ? "Gestionar pasos" : "Tipos de examen","text-button");flow.type="button";flow.disabled=state.writing;flow.onclick=()=>this.onRelations(row,state.module);cell.append(flow);}if (cell.childElementCount) tr.append(cell);body.append(tr);
    }
    table.append(body);this.results.append(table);
    if (!state.rows.length && state.status === 'ready') this.results.append(element('p', 'No hay registros para esta búsqueda.'));
    if (state.editor && !this.dialog.open) {
      this.formFields.replaceChildren(element('h2', state.editor === 'create' ? 'Nuevo registro' : 'Editar registro'));
      for (const key of fields[state.module]) {
        const input = element(['indicaciones', 'observaciones', 'comentarios'].includes(key) ? 'textarea' : 'input');
        input.name = key;input.id = `catalogo-${key}`;
        if (key === 'activo') { input.type = 'checkbox';input.checked = state.selected ? Boolean(state.selected.activo) : ['rol', 'clinica', 'examen', 'procedimiento'].includes(state.module); }
        else input.value = state.selected?.[key] ?? '';
        if (key === 'nombre') { input.required = true;input.maxLength = ['clinica', 'tipoExamen', 'examen'].includes(state.module) ? 255 : 155; }
        if (key === 'tipo' && state.module === 'clinica') { input.required = true;input.maxLength = 20; }
        if (key === 'indicaciones' && state.module === 'tipoMedioContacto') input.required = true;
        const label = element('label', labels[key]);label.htmlFor = input.id;this.formFields.append(label, input);
        if (key === 'expresionRegular') {
          const formatos = element('select');formatos.id = 'catalogo-formato';
          const title = element('label', 'Formato sugerido');title.htmlFor = formatos.id;
          formatosSugeridos.forEach(([nombre, regex], index) => {
            const option = element('option', nombre);option.value = String(index);formatos.append(option);
            if (regex !== null && regex === input.value) formatos.value = String(index);
          });
          formatos.onchange = () => { const regex = formatosSugeridos[Number(formatos.value)][1];if (regex !== null) input.value = regex; };
          input.oninput = () => { formatos.value = '0'; };
          this.formFields.append(title, formatos);
        }
      }
      this.dialog.showModal();
    }
    this.form.querySelectorAll('input, textarea, select').forEach(node => { node.disabled = state.writing || !state.contexto.puedeEscribir; });
    this.save.textContent=state.writing?'Guardando…':'Guardar';
    this.form.setAttribute('aria-busy',String(state.writing));
    this.save.disabled = state.writing || !state.contexto.puedeEscribir;this.cancel.disabled = state.writing;
    this.remove.hidden = !['clinica', 'rol', 'procedimiento'].includes(state.module) || state.editor !== 'edit' || !state.contexto.puedeEscribir;
    this.remove.disabled = state.writing;
    if (!state.editor && this.dialog.open) this.dialog.close();
  }
}
