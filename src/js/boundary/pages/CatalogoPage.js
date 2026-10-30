import { errorMessage } from './dashboard-presentation.js';

const names = { clinica: 'Clínicas', rol: 'Roles', tipoDocumento: 'Tipos de documento', tipoMedioContacto: 'Tipos de medio de contacto', tipoExamen: 'Tipos de examen' };
const fields = {
  clinica: ['nombre', 'tipo', 'comentarios', 'activo'], rol: ['nombre', 'observaciones', 'activo'],
  tipoDocumento: ['nombre', 'expresionRegular', 'indicaciones', 'activo'],
  tipoMedioContacto: ['nombre', 'expresionRegular', 'indicaciones', 'activo'], tipoExamen: ['nombre', 'observaciones', 'activo']
};
const labels = { nombre: 'Nombre', tipo: 'Tipo de clínica', comentarios: 'Comentarios', observaciones: 'Observaciones', activo: 'Activo', indicaciones: 'Indicaciones', expresionRegular: 'Expresión regular Java' };
function element(tag, text, className) {
  const node = document.createElement(tag);if (text !== undefined) node.textContent = text;if (className) node.className = className;return node;
}
function publicError(error) {
  if (error?.status === 401) return 'Usuario o contraseña no válidos. Inicia sesión nuevamente.';
  if (error?.status === 403) return 'La sesión no tiene permiso para esta operación.';
  if ([409, 422].includes(error?.status) && typeof error.details?.mensaje === 'string') return error.details.mensaje;
  return errorMessage(error);
}

/** Vista de los cinco catálogos, integrada en el shell del dashboard. No llama a la API. */
export default class CatalogoPage {
  constructor(root, { onLogin, onLogout }) {
    this.root = root;this.control = null;this.module = 'tipoDocumento';
    this.login = element('form', undefined, 'panel gestion-login');
    this.login.append(element('h2', 'Acceso a gestión'), element('p', 'Utiliza una identidad autorizada del entorno sintético.'));
    for (const [key, label] of [['usuario', 'Usuario'], ['clave', 'Contraseña']]) {
      const input = element('input');input.name = key;input.id = `gestion-${key}`;input.required = true;input.type = key === 'clave' ? 'password' : 'text';input.autocomplete = key === 'clave' ? 'current-password' : 'username';
      const title = element('label', label);title.htmlFor = input.id;this.login.append(title, input);
    }
    this.enter = element('button', 'Iniciar sesión', 'primary-button');this.enter.type = 'submit';this.login.append(this.enter);
    this.notice = element('p', undefined, 'action-error');this.notice.setAttribute('role', 'alert');this.notice.hidden = true;
    this.title = element('h1', names[this.module]);this.identity = element('p');
    this.logout = element('button', 'Cerrar sesión', 'secondary-button');this.logout.type = 'button';this.logout.onclick = () => onLogout();
    this.tools = element('div', undefined, 'gestion-tools');this.search = element('form');
    this.query = element('input');this.query.type = 'search';this.query.placeholder = 'Buscar por nombre';this.query.setAttribute('aria-label', 'Buscar catálogo por nombre');
    const search = element('button', 'Buscar', 'secondary-button');search.type = 'submit';
    this.search.append(this.query, search);this.newButton = element('button', 'Nuevo registro', 'primary-button');this.newButton.type = 'button';
    this.tools.append(this.search, this.newButton, this.logout);
    this.results = element('div', undefined, 'panel table-scroll');this.total = element('p');
    this.previous = element('button', 'Anterior', 'pagination-button');this.next = element('button', 'Siguiente', 'pagination-button');
    this.previous.type = this.next.type = 'button';const pager = element('div', undefined, 'pagination');pager.append(this.total, this.previous, this.next);
    this.content = element('div');this.content.append(this.identity, this.tools, this.results, pager);this.content.hidden = true;
    this.dialog = element('dialog', undefined, 'gestion-dialog');this.form = element('form');this.formFields = element('div', undefined, 'gestion-fields');
    this.save = element('button', 'Guardar', 'primary-button');this.save.type = 'submit';
    this.cancel = element('button', 'Cancelar', 'secondary-button');this.cancel.type = 'button';
    this.remove = element('button', 'Eliminar registro', 'secondary-button');this.remove.type = 'button';
    this.formError = element('p', undefined, 'action-error');this.formError.setAttribute('role', 'alert');
    const actions = element('div', undefined, 'gestion-tools');actions.append(this.cancel, this.remove, this.save);
    this.form.append(this.formFields, this.formError, actions);this.dialog.append(this.form);
    root.append(this.title, this.notice, this.login, this.content, this.dialog);
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
    this.login.hidden = true;this.content.hidden = false;
    this.unsubscribe = control.subscribe(state => this.render(state));
  }
  signedOut() {
    this.unsubscribe?.();this.control = null;this.login.hidden = false;this.content.hidden = true;
    if (this.dialog.open) this.dialog.close();
  }
  error(error) { this.notice.textContent = publicError(error);this.notice.hidden = false; }
  open(module) {
    this.module = module;this.title.textContent = names[module];
    this.query.value = '';
    if (this.control) this.control.open(module).catch(error => this.error(error));
  }
  render(state) {
    this.module = state.module;this.title.textContent = names[state.module];
    this.identity.textContent = `${state.contexto.actor} · ${state.contexto.puedeEscribir ? 'Edición autorizada' : 'Solo lectura'}`;
    this.newButton.disabled = !state.contexto.puedeEscribir || state.writing;
    this.logout.disabled = state.writing;this.query.disabled = state.writing;
    this.previous.disabled = state.writing || state.status !== 'ready' || state.first === 0;
    this.next.disabled = state.writing || state.status !== 'ready' || state.first + state.max >= state.total;
    this.total.textContent = state.status === 'loading' ? 'Cargando…' : `${state.total} registros`;
    this.notice.hidden = !state.error && !state.message;
    this.notice.textContent = state.error ? publicError(state.error) : state.message;
    if (state.status === 'loading') this.results.setAttribute('aria-busy', 'true');else this.results.removeAttribute('aria-busy');
    this.results.replaceChildren();
    const table = element('table');const head = element('tr');
    head.append(element('th', 'Nombre'), element('th', 'Estado'), element('th', 'Acciones'));const thead = element('thead');thead.append(head);table.append(thead);
    const body = element('tbody');
    const idKey = 'id' + state.module[0].toUpperCase() + state.module.slice(1);
    for (const row of state.rows) {
      const tr = element('tr');tr.append(element('td', row.nombre ?? 'Sin nombre'), element('td', row.activo ? 'Activo' : 'Inactivo'));
      const cell = element('td');const edit = element('button', state.contexto.puedeEscribir ? 'Editar' : 'Ver detalle', 'text-button');
      edit.type = 'button';edit.disabled = state.writing;edit.onclick = () => this.control.edit(row[idKey]);cell.append(edit);tr.append(cell);body.append(tr);
    }
    table.append(body);this.results.append(table);
    if (!state.rows.length && state.status === 'ready') this.results.append(element('p', 'No hay registros para esta búsqueda.'));
    if (state.editor && !this.dialog.open) {
      this.formFields.replaceChildren(element('h2', state.editor === 'create' ? 'Nuevo registro' : 'Editar registro'));
      for (const key of fields[state.module]) {
        const input = element(['indicaciones', 'observaciones', 'comentarios'].includes(key) ? 'textarea' : 'input');
        input.name = key;input.id = `catalogo-${key}`;
        if (key === 'activo') { input.type = 'checkbox';input.checked = state.selected ? Boolean(state.selected.activo) : ['rol', 'clinica'].includes(state.module); }
        else input.value = state.selected?.[key] ?? '';
        if (key === 'nombre') { input.required = true;input.maxLength = ['clinica', 'tipoExamen'].includes(state.module) ? 255 : 155; }
        if (key === 'tipo' && state.module === 'clinica') { input.required = true;input.maxLength = 20; }
        if (key === 'indicaciones' && state.module === 'tipoMedioContacto') input.required = true;
        const label = element('label', labels[key]);label.htmlFor = input.id;this.formFields.append(label, input);
      }
      this.dialog.showModal();
    }
    this.form.querySelectorAll('input, textarea').forEach(node => { node.disabled = state.writing || !state.contexto.puedeEscribir; });
    this.save.disabled = state.writing || !state.contexto.puedeEscribir;this.cancel.disabled = state.writing;
    this.remove.hidden = !['clinica', 'rol'].includes(state.module) || state.editor !== 'edit' || !state.contexto.puedeEscribir;
    this.remove.disabled = state.writing;this.formError.textContent = state.error ? publicError(state.error) : '';
    if (!state.editor && this.dialog.open) this.dialog.close();
  }
}
