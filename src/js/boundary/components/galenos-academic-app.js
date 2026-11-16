import { offerTicketDownload } from '../ticket-options.js';
import { getLocale } from '../language.js';
import './tarjeta_consulta.js';
import AcademicCareControl, {
  fechaClinica,
  rangoPeriodo,
} from '../../control/AcademicCareControl.js';
import AcademicCareService from '../../control/AcademicCareService.js';
import { gestionError } from '../modelos/dashboard-presentation.js';

const today = () => fechaClinica();
const esc = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat(getLocale(), {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/El_Salvador',
      }).format(new Date(value))
    : 'Pendiente';

const time = (value) =>
  value ? `<time datetime="${esc(value)}">${esc(fmt(value))}</time>` : 'Pendiente';

class GalenosAcademicApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.control = new AcademicCareControl();
    this.saving = false;
    this.first = 0;
    this.person = null;
    this.care = null;
    this.onNetwork = () => this.updateNetwork();
  }
  configure(config, sessions = {}) { this.api = new AcademicCareService(config); this.sessions = sessions; this.render(); this.refreshSessions(); }
  connectedCallback() { if (!this.api) this.render(); window.addEventListener('online', this.onNetwork); window.addEventListener('offline', this.onNetwork); this.updateNetwork(); }
  disconnectedCallback() { this.control.cancel(); window.removeEventListener('online', this.onNetwork); window.removeEventListener('offline', this.onNetwork); }
  updateNetwork() { const status = this.q('[data-network]'); if (status) { status.textContent = navigator.onLine ? 'Conexión disponible. La información clínica no se guarda en este dispositivo.' : 'Sin conexión. La aplicación está abierta, pero las consultas requieren conexión; no se conserva información clínica localmente.'; status.className = navigator.onLine ? 'status' : 'status error'; } }
  render() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--gs-text);font:inherit}*{box-sizing:border-box}main{max-width:1120px;margin:auto;padding:clamp(1rem,3vw,2.4rem)}
      h1{font-size:clamp(1.7rem,4vw,2.5rem);margin:.2rem 0}.lead{color:var(--gs-muted);max-width:65ch}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--gs-accent);font-size:.75rem;font-weight:700}
      nav,.toolbar,.grid,.actions{display:flex;gap:.75rem;flex-wrap:wrap;align-items:end}nav{border-bottom:1px solid var(--gs-border);padding:.8rem 0;margin-bottom:1.25rem}button,.tab{font:inherit;border:0;border-radius:.55rem;padding:.75rem 1rem;background:var(--gs-raised);color:var(--gs-text);cursor:pointer;font-weight:650}.active,.primary{background:var(--gs-blue);color:var(--gs-on-blue)}button:disabled{opacity:.55;cursor:wait}
      section{background:var(--gs-surface);border:1px solid var(--gs-border);border-radius:1rem;padding:clamp(1rem,2.5vw,1.5rem);margin:1rem 0;box-shadow:0 8px 24px var(--gs-shadow-dialog)}label{display:grid;gap:.35rem;font-weight:600;min-width:min(100%,13rem);flex:1}input,select,textarea{font:inherit;padding:.7rem;border:1px solid var(--gs-border);border-radius:.45rem;background:var(--gs-surface);color:var(--gs-text)}a{color:var(--gs-accent)}input,select,textarea{background:var(--gs-input)}.card{background:var(--gs-raised)}textarea{min-height:8rem;width:100%;resize:vertical}.status{min-height:1.5rem;color:var(--gs-muted)}.error{color:var(--gs-error)}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:.8rem}.card{border:1px solid var(--gs-border);border-radius:.75rem;padding:1rem}.card h3{margin:.1rem 0 .5rem}.meta{color:var(--gs-muted);font-size:.94rem;line-height:1.6}details{margin-top:.6rem}summary{cursor:pointer;font-weight:650}ol{padding-left:1.3rem}.step{padding:.45rem 0;border-bottom:1px solid var(--gs-soft-border)}.sr{position:absolute;clip:rect(0,0,0,0)}[hidden]{display:none!important}:focus-visible{outline:3px solid var(--gs-accent);outline-offset:2px}
      @media(max-width:560px){main{padding:.8rem}.toolbar>*{width:100%}button{min-height:44px}.actions button{flex:1}}
      [data-care-form] fieldset{min-width:0;margin:1rem 0;padding:1rem;border:1px solid var(--gs-border);border-radius:.55rem}
      [data-care-form] fieldset label{display:flex;align-items:center;gap:.6rem;min-width:0;margin:.6rem 0;font-weight:400}
      [data-care-form] input[type=checkbox]{width:1.15rem;height:1.15rem;flex:0 0 auto}
      @media(max-width:560px){[data-care-form] .actions>*{width:100%;flex-basis:100%}}
    </style><main><p class="eyebrow">GalenosSV · atención académica</p><h1>Dashboard</h1><p class="lead">Consulta tus citas y atiende los casos asociados a la sesión académica que hayas iniciado.</p>
      <nav aria-label="Historias de usuario"><button class="tab active" data-tab="dashboard">Bandeja de consultas</button><button class="tab" data-tab="paciente">Mis citas</button></nav><p class="status" data-network role="status" aria-live="polite"></p>
    <section data-panel="paciente" hidden><h2>Mis citas</h2><p>La identidad se comparte de forma segura con el portal de paciente.</p><p class="status" data-patient-status role="status" aria-live="polite"></p><a href="#pacientes">Abrir portal de paciente</a><form data-patient hidden></form><button data-retry-types hidden>Reintentar carga</button><div data-clinic-area hidden><label>Clínica<select data-patient-clinic></select></label><form data-patient-dates class="toolbar"><label>Desde<input type="date" name="fechaDesde"></label><label>Hasta<input type="date" name="fechaHasta"></label><button class="primary">Consultar citas</button></form><div class="cards" data-patient-cards></div></div></section>
    <section data-panel="dashboard"><h2>Bandeja de consultas</h2><p data-employee-intro>Inicia sesión como empleado para ver las consultas asignadas a tu clínica y rol.</p><p class="status" data-employee-status role="status" aria-live="polite"></p><a data-employee-login-link href="#empleados">Abrir portal de empleado</a><form data-employee hidden></form><div data-employee-context hidden><p data-person-label></p><p data-clinic-date>Fecha clínica: ${today()}</p><div class="actions"><a href="#empleados">Cambiar asignación</a><button type="button" data-logout>Cerrar sesión</button></div><div class="grid"><label>Clínica<select data-staff-clinic></select></label><label>Asignación<select data-staff-role></select></label></div><div class="actions"><button type="button" data-period="today">Hoy</button><button type="button" data-period="past">Fechas pasadas</button><button type="button" data-period="future">Fechas futuras</button></div><form data-staff-dates class="toolbar"><label>Desde<input type="date" name="fechaDesde" value="${today()}"></label><label>Hasta<input type="date" name="fechaHasta" value="${today()}"></label><label>Tipo de documento del paciente<select name="idTipoDocumento"><option value="">Sin filtro de paciente</option></select></label><label>Número de documento<input name="numero" autocomplete="off" disabled></label><button class="primary">Buscar consultas</button><button type="button" data-clear-filters>Restablecer filtros</button></form><p class="status" data-queue-status role="status" aria-live="polite"></p><button type="button" data-retry-queue hidden>Reintentar conexión</button><div class="cards" data-queue aria-busy="false"></div><div class="actions"><button type="button" data-page-prev disabled>Anterior</button><p data-page-summary role="status"></p><button type="button" data-page-next disabled>Siguiente</button></div></div></section>
    <section data-panel="atencion" hidden><button data-back>← Regresar a la bandeja</button><p class="status" data-care-notice role="status" aria-live="polite"></p><p class="status" data-care-status role="status" aria-live="polite"></p><button type="button" data-retry-care hidden>Actualizar paso</button><div data-care-content aria-busy="false"></div></section></main>`;
    this.bind();
  }
  q(s) { return this.shadowRoot.querySelector(s); }
  bind() {
    this.shadowRoot
      .querySelectorAll('[data-tab]')
      .forEach((button) => button.addEventListener('click', () => this.show(button.dataset.tab)));
    this.q('[data-patient]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.searchPatient(e.currentTarget);
    });
    this.q('[data-patient-dates]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.loadPatientAppointments();
    });
    this.q('[data-employee]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.login(e.currentTarget);
    });
    this.q('[data-staff-dates]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.first = 0;
      this.loadQueue();
    });
    this.q('[data-staff-dates]').elements.idTipoDocumento.addEventListener('change', (event) => {
      const input = this.q('[data-staff-dates]').elements.numero;
      input.disabled = !event.target.value;
      input.value = '';
    });
    this.q('[data-staff-clinic]').addEventListener('change', () => this.roles());
    this.q('[data-staff-role]').addEventListener('change', () => {
      this.resetFilters();
    });
    this.q('[data-clear-filters]').addEventListener('click', () => this.resetFilters());
    this.q('[data-retry-queue]').addEventListener('click', () => this.loadQueue());
    for (const name of ['fechaDesde', 'fechaHasta'])
      this.q('[data-staff-dates]').elements[name].addEventListener('change', () => {
        this.first = 0;
        this.loadQueue();
      });
    this.q('[data-queue]').addEventListener('consulta-atender', (event) =>
      this.openCare(event.detail.idConsulta),
    );
    this.q('[data-patient-clinic]').addEventListener('change', () =>
      this.loadPatientAppointments(),
    );
    this.shadowRoot.querySelectorAll('[data-period]').forEach((button) =>
      button.addEventListener('click', () => {
        const dates = rangoPeriodo(
          button.dataset.period,
          new Date(),
          this.employeeSession?.contexto.zonaHoraria,
        );
        const form = this.q('[data-staff-dates]');
        form.elements.fechaDesde.value = dates.fechaDesde;
        form.elements.fechaHasta.value = dates.fechaHasta;
        this.first = 0;
        this.loadQueue();
      }),
    );
    this.q('[data-page-prev]').addEventListener('click', () => {
      this.first = Math.max(0, this.first - 20);
      this.loadQueue();
    });
    this.q('[data-page-next]').addEventListener('click', () => {
      this.first += 20;
      this.loadQueue();
    });
    this.q('[data-back]').addEventListener('click', () => {
      if (this.saving) return;
      this.control.cancel(this.q('[data-care-status]'));
      this.show('dashboard');
      this.loadQueue();
    });
    this.q('[data-retry-care]').addEventListener('click', () => this.loadCare());
    this.q('[data-retry-types]').addEventListener('click', () => this.loadDocumentTypes());
    this.q('[data-logout]').addEventListener('click', async () => {
      if (this.saving) return;
      const button = this.q('[data-logout]');
      button.disabled = true;
      try {
        await this.sessions.logout();
        await this.refreshSessions();
      } catch (error) {
        this.q('[data-employee-status]').textContent = gestionError(error);
      } finally {
        button.disabled = false;
      }
    });
    this.updateNetwork();
  }
  show(name) { this.q('h1').textContent = ({ dashboard: 'Dashboard', atencion: 'Atención activa', paciente: 'Mis citas' })[name] || 'Dashboard'; this.shadowRoot.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; }); this.shadowRoot.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name)); }
  async request(fn, status, complete = false) {
    if (!this.api) {
      status.textContent = 'Falta configurar la conexión con el backend.';
      return null;
    }
    status.className = 'status';
    status.textContent = 'Cargando…';
    try {
      const result = await this.control.read(status, fn);
      if (!result) return null;
      status.textContent = '';
      return complete ? result : result.datos;
    } catch (error) {
      if (error.status === 401) this.sessions.invalidate?.();
      status.textContent = gestionError(error);
      status.className = 'status error';
      if (status === this.q('[data-queue-status]'))
        this.q('[data-retry-queue]').hidden = !(
          ['network', 'connection'].includes(error.type) || error.status >= 500
        );
      return null;
    }
  }
  form(form) { return Object.fromEntries(new FormData(form).entries()); }
  sessionHeaders(session, assignment) { return { headers: { Authorization: `Bearer ${session.token}`, ...(assignment ? { 'X-Persona-Rol': assignment } : {}) } }; }
  clearEmployee(clearIdentity = true) {
    this.control.queue = [];
    this.control.selected = null;
    for (const selector of [
      '[data-queue-status]',
      '[data-care-status]',
      '[data-employee-status]',
      '[data-save-status]',
      '[data-care-notice]',
    ]) {
      const status = this.q(selector);
      if (status) {
        this.control.cancel(status);
        status.textContent = '';
      }
    }
    this.care = null;
    this.consultation = null;
    this.q('[data-retry-care]').hidden = true;
    this.first = 0;
    this.q('[data-care-content]').replaceChildren();
    this.q('[data-queue]').replaceChildren();
    this.q('[data-page-summary]').textContent = '';
    this.q('[data-page-prev]').disabled = this.q('[data-page-next]').disabled = true;
    if (clearIdentity) {
      this.person = null;
      this.employeeSession = null;
      this.q('[data-person-label]').textContent = '';
      this.q('[data-staff-clinic]').replaceChildren();
      this.q('[data-staff-role]').replaceChildren();
      this.q('[data-staff-dates]').reset();
      this.q('[data-staff-dates]').elements.numero.disabled = true;
      this.q('[data-employee-context]').hidden = true;
    }
  }
  async refreshSessions() {
    if (!this.api || !this.sessions) return;
    const patient = this.sessions.patient?.();
    this.patientSession = patient?.contexto?.tipo === 'PACIENTE' ? patient : null;
    if (this.patientSession) {
      const assignments = patient.contexto.asignaciones;
      const clinics = [...new Map(assignments.map((a) => [a.idClinica, { idClinica: a.idClinica, nombre: a.clinicaNombre }])).values()];
      this.q('[data-patient-clinic]').innerHTML = clinics.map((c) => `<option value="${esc(c.idClinica)}">${esc(c.nombre)}</option>`).join('');
      this.q('[data-clinic-area]').hidden = clinics.length === 0;
      this.q('[data-patient-status]').textContent = clinics.length ? 'Sesión de paciente activa.' : 'La cuenta no tiene clínicas activas.';
      if (clinics.length) this.loadPatientAppointments();
    } else {
      this.q('[data-clinic-area]').hidden = true;
      this.q('[data-patient-status]').textContent = 'Identifícate en el portal de paciente para consultar tus citas.';
    }
    const employee = this.sessions.employee?.();
    this.employeeSession = employee?.contexto?.tipo === 'EMPLEADO' ? employee : null;
    const patientTab = this.q('[data-tab="paciente"]');
    patientTab.hidden = Boolean(this.employeeSession);
    if (this.employeeSession && patientTab.classList.contains('active')) this.show('dashboard');
    this.q('[data-employee-intro]').hidden = !!this.employeeSession;
    this.q('[data-employee-login-link]').hidden = !!this.employeeSession;
    if (this.employeeSession) {
      const context = employee.contexto;
      const selected = context.asignaciones.find((a) => a.idPersonaRol === this.sessions.assignment?.());
      const previousClinic = selected?.idClinica || '';
      const clinics = [...new Map(context.asignaciones.map((a) => [a.idClinica, { idClinica: a.idClinica, nombre: a.clinicaNombre }])).values()];
      this.person = { idPersona: context.idPersona, nombres: context.personaNombre, apellidos: '', clinicas: clinics, roles: context.asignaciones };
      this.q('[data-person-label]').textContent = `Sesión activa: ${context.personaNombre}`;
      this.q('[data-employee-context]').hidden = false;
      this.q('[data-staff-clinic]').innerHTML = clinics.map((c) => `<option value="${esc(c.idClinica)}">${esc(c.nombre)}</option>`).join('');
      if (clinics.some((clinic) => clinic.idClinica === previousClinic)) this.q('[data-staff-clinic]').value = previousClinic;
      this.q('[data-employee-status]').textContent = '';
      this.roles();
      this.loadDocumentTypes();
    } else {
      this.control.cancel(this.q('[data-queue-status]'));
      this.control.cancel(this.q('[data-care-status]'));
      this.care = null; this.q('[data-care-content]').replaceChildren(); this.q('[data-queue]').replaceChildren();
      this.person = null;
      this.q('[data-employee-context]').hidden = true;
      this.q('[data-employee-status]').textContent = 'Identifícate en el portal de empleado para abrir la bandeja.';
    }
  }
  async loadDocumentTypes() { const status = this.q('[data-employee-status]'); if (!this.api) return; this.q('[data-retry-types]').hidden = true; const rows = await this.request((o) => this.api.findDocumentTypes(0, 100, o), status); if (!rows) { this.q('[data-retry-types]').hidden = false; return; } const options = rows.filter((row) => row.activo).map((row) => `<option value="${esc(row.idTipoDocumento)}">${esc(row.nombre)}</option>`).join(''); this.shadowRoot.querySelectorAll('select[name="idTipoDocumento"]').forEach((select) => { const previous = select.value; select.innerHTML = `<option value="">Selecciona…</option>${options}`; select.value = previous; }); }
  async searchPatient() { await this.refreshSessions(); }
  async loadPatientAppointments() { const clinic = this.q('[data-patient-clinic]').value; if (!clinic || !this.patientSession) return; this.q('[data-patient-cards]').replaceChildren(); const dates = this.form(this.q('[data-patient-dates]')); const query = { idClinica: clinic, ...Object.fromEntries(Object.entries(dates).filter(([,v]) => v)) }; if (query.fechaDesde && query.fechaHasta && query.fechaDesde > query.fechaHasta) { this.q('[data-patient-status]').textContent = 'La fecha inicial debe ser anterior a la fecha final.'; return; } const assignment = this.patientSession.contexto.asignaciones.find((a) => a.idClinica === clinic); const options = this.sessionHeaders(this.patientSession, assignment?.idPersonaRol); const rows = await this.request((o) => this.api.findPatientAppointments(0, 100, query, { ...o, ...options }), this.q('[data-patient-status]')); if (!rows) return; this.q('[data-patient-cards]').innerHTML = rows.map((a) => `<article class="card"><h3>${esc(a.procedimiento || 'Cita')}</h3><p class="meta">${time(a.fechaInicio)} · ${esc(a.clinica || '')}<br>Paciente: ${esc(a.paciente || '')}</p><details><summary>Pasos registrados</summary>${this.history(a.historial)}</details><button data-ticket="${esc(a.idConsulta)}" class="primary">Descargar ticket PDF</button></article>`).join('') || '<p>No hay citas para los filtros seleccionados.</p>'; this.q('[data-patient-cards]').querySelectorAll('[data-ticket]').forEach((b) => b.addEventListener('click', () => this.download(b.dataset.ticket, query))); }
  async download(id, query) { if (!await offerTicketDownload()) return; const status = this.q('[data-patient-status]'); const clinic = query.idClinica; const assignment = this.patientSession?.contexto.asignaciones.find((a) => a.idClinica === clinic); const blob = await this.request((o) => this.api.getTicket(id, { idClinica: clinic }, { ...o, ...this.sessionHeaders(this.patientSession, assignment?.idPersonaRol) }), status); if (!blob) return; const href = URL.createObjectURL(blob); const link = Object.assign(document.createElement('a'), { href, download: 'galenos-ticket.pdf' }); link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000); }
  async login() { await this.refreshSessions(); if (this.person) this.show('dashboard'); }
  roles() {
    this.first = 0;
    const clinic = this.q('[data-staff-clinic]').value;
    const roles = this.person?.roles.filter((r) => r.idClinica === clinic) || [];
    const selected = this.sessions.assignment?.();
    this.q('[data-staff-role]').innerHTML = roles
      .map((r) => `<option value="${esc(r.idPersonaRol)}">${esc(r.rolNombre)}</option>`)
      .join('');
    if (roles.some((r) => r.idPersonaRol === selected))
      this.q('[data-staff-role]').value = selected;
    this.resetFilters();
  }
  resetFilters() {
    const form = this.q('[data-staff-dates]');
    const dates = rangoPeriodo('today', new Date(), this.employeeSession?.contexto.zonaHoraria);
    form.elements.fechaDesde.value = dates.fechaDesde;
    form.elements.fechaHasta.value = dates.fechaHasta;
    form.elements.idTipoDocumento.value = '';
    form.elements.numero.value = '';
    form.elements.numero.disabled = true;
    this.q('[data-clinic-date]').textContent = `Fecha clínica: ${dates.fechaDesde}`;
    this.first = 0;
    this.loadQueue();
  }
  async loadQueue() {
    this.control.cancel(this.q('[data-queue-status]'));
    this.q('[data-queue]').replaceChildren();
    this.q('[data-page-summary]').textContent = '';
    this.q('[data-page-prev]').disabled = true;
    this.q('[data-page-next]').disabled = true;
    this.q('[data-retry-queue]').hidden = true;
    this.control.queue = [];
    this.control.selected = null;
    if (!this.person || !this.q('[data-staff-role]').value) return;
    const assignment = this.person.roles.find(
      (r) => r.idPersonaRol === this.q('[data-staff-role]').value,
    );
    if (!assignment) return;
    this.sessions.selectAssignment?.(assignment.idPersonaRol);
    this.control.cancel(this.q('[data-care-status]'));
    this.care = null;
    this.q('[data-care-content]').replaceChildren();
    this.q('[data-queue]').replaceChildren();
    let query, options;
    try {
      ({ query, options } = this.control.prepararBandeja(
        this.employeeSession,
        assignment.idPersonaRol,
        this.form(this.q('[data-staff-dates]')),
      ));
    } catch (error) {
      this.q('[data-queue-status]').textContent = error.message;
      this.q('[data-queue-status]').className = 'status error';
      return;
    }
    this.q('[data-queue]').setAttribute('aria-busy', 'true');
    const page = await this.request(
      (o) => this.api.findEmployeeAppointments(this.first, 20, query, { ...o, ...options }),
      this.q('[data-queue-status]'),
      true,
    );
    this.q('[data-queue]').setAttribute(
      'aria-busy',
      String(this.control.requests.has(this.q('[data-queue-status]'))),
    );
    if (!page) return;
    const rows = page.datos;
    this.control.queue = rows;
    this.q('[data-page-prev]').disabled = this.first === 0;
    this.q('[data-page-next]').disabled = this.first + rows.length >= page.totalDatos;
    this.q('[data-page-summary]').textContent =
      `${page.totalDatos} consultas · ${rows.length ? this.first + 1 : 0}–${this.first + rows.length}`;
    for (const row of rows) {
      const card = document.createElement('tarjeta-consulta');
      card.consulta = {
        ...row,
        portalEmpleado: true,
        rolNombre: assignment.rolNombre,
        zonaHoraria: this.employeeSession.contexto.zonaHoraria,
      };
      this.q('[data-queue]').append(card);
    }
    if (!rows.length)
      this.q('[data-queue]').textContent = page.totalDatos === 0
        ? 'No hay consultas asignadas para este rango de fechas'
        : 'No hay consultas en esta página. Vuelve a la página anterior.';
  }
  history(items = []) { return items.length ? `<ol>${items.map((i) => `<li class="step"><strong>${esc(i.nombre || 'Paso')}</strong> · ${esc(i.estado || '')}<div class="meta">Responsable: ${esc(i.responsable || 'No registrado')} · Rol: ${esc(i.rol || 'No registrado')} · ${time(i.fechaInicio)}${i.fechaFin ? ` – ${time(i.fechaFin)}` : ''}<details><summary>Ver registro</summary><p>${esc(i.valor || 'Sin datos registrados')}</p>${(i.ordenes || []).map((order) => `<article><h4>${esc(order.examen || 'Examen')}</h4><p>${esc(order.indicaciones || '')} · ${time(order.fechaCreacion)}</p>${order.resultados.map((result) => `<p>${time(result.fechaCreacion)}<br>Resultado: ${esc(result.resultado || 'Pendiente')}<br>Interpretación: ${esc(result.interpretacion || 'No registrada')}</p>`).join('') || '<p>Sin resultados registrados.</p>'}</article>`).join('')}</details></div></li>`).join('')}</ol>` : '<p>Aún no hay pasos registrados.</p>'; }
  context() { return this.control.prepararBandeja(this.employeeSession, this.q('[data-staff-role]').value, {}).query; }
  async openCare(id) {
    if (this.saving) return;
    if (!this.employeeSession) { this.sessions.invalidate?.(); return; }
    try {
      this.control.seleccionarConsulta(id);
    } catch (error) {
      this.q('[data-queue-status]').textContent = error.message;
      return;
    }
    this.consultation = id;
    this.show('atencion');
    await this.loadCare();
  }
  async loadCare(keepNotice = false) {
    if (this.saving || !this.employeeSession || !this.consultation) return false;
    this.care = null;
    this.careConflicted = false;
    this.q('[data-care-content]').replaceChildren();
    this.q('[data-retry-care]').hidden = true;
    if (!keepNotice) this.q('[data-care-notice]').textContent = '';
    const assignment = this.q('[data-staff-role]').value;
    this.q('[data-care-content]').setAttribute('aria-busy', 'true');
    const data = await this.request((o) => this.api.getCare(this.consultation, this.context(),
      { ...o, ...this.sessionHeaders(this.employeeSession, assignment) }), this.q('[data-care-status]'));
    this.q('[data-care-content]').setAttribute('aria-busy', String(this.control.requests.has(this.q('[data-care-status]'))));
    if (!data) {
      this.q('[data-retry-care]').hidden = this.control.requests.has(this.q('[data-care-status]'))
        || !this.employeeSession || !this.consultation;
      return false;
    }
    this.care = data;
    this.renderCare();
    return true;
  }
  renderCare() {
    const d = this.care;
    this.q('[data-care-content]').innerHTML = `<h2>Atención de consulta</h2>
      <p class="meta">Paciente: ${esc(d.paciente || 'Nombre no registrado')} · Clínica: ${esc(d.clinica || 'No registrada')}<br>
      Empleado: ${esc(d.empleado || this.employeeSession.contexto.personaNombre)} · Rol: ${esc(d.rol)}<br>
      Fecha de consulta: ${time(d.fechaConsulta)}<br>Procedimiento: ${esc(d.procedimiento)} · Paso actual: ${esc(d.pasoActual)}<br>
      Estado del paso: ${esc(d.estadoPasoActual || 'No informado')}</p>
      <details><summary>Historial previo</summary>${this.history(d.historial)}</details>
      <details><summary>Órdenes y resultados de este paso</summary>${this.orders(d.ordenesActuales || [])}</details>
      <form data-care-form><label>Registro de atención<textarea name="valor" required minlength="1" maxlength="10000">${esc(d.valorActual || '')}</textarea></label>
      <fieldset><legend>Exámenes permitidos para este paso</legend>${d.examenes.map((e) => `<label><input type="checkbox" name="examenes" value="${esc(e.idExamen)}"> ${esc(e.nombre || 'Examen sin nombre')}</label>`).join('') || '<p>No hay exámenes configurados.</p>'}</fieldset>
      <div class="actions"><button class="primary" name="accion" value="GUARDAR_PARCIAL">Guardar avance</button>
      ${d.siguientes.length ? `<label>Siguiente paso<select name="idPasoSiguiente"><option value="">Selecciona un paso</option>${d.siguientes.map((s) => `<option value="${esc(s.idPaso)}">${esc(s.nombre)}${s.tipoSecuencia ? ` · ${esc(s.tipoSecuencia)}` : ''}</option>`).join('')}</select></label><button class="primary" name="accion" value="AVANZAR">Guardar y avanzar</button>` : ''}
      ${d.puedeRetroceder ? `${d.anteriores?.length > 1 ? `<label>Paso anterior<select name="idConsultaProcedimientoPasoAnterior"><option value="">Selecciona un paso</option>${d.anteriores.map((s) => `<option value="${esc(s.idConsultaProcedimientoPaso)}">${esc(s.nombre)}</option>`).join('')}</select></label>` : ''}<button name="accion" value="RETROCEDER">Retroceder</button>` : ''}
      ${d.pasoFinal ? '<button name="accion" value="FINALIZAR">Finalizar procedimiento</button>' : ''}</div>
      <p class="status" data-save-status role="status" aria-live="polite"></p></form>`;
    this.q('[data-care-form]').addEventListener('submit', (event) => { event.preventDefault(); this.saveCare(event); });
  }
  orders(orders) {
    return orders.map((order) => `<article><h4>${esc(order.examen || 'Examen no identificado')}</h4><p>${esc(order.indicaciones || '')} · ${time(order.fechaCreacion)}</p>${(order.resultados || []).map((result) => `<p>${time(result.fechaCreacion)}<br>Resultado: ${esc(result.resultado || 'Pendiente')}<br>Interpretación: ${esc(result.interpretacion || 'No registrada')}</p>`).join('') || '<p>Sin resultados registrados.</p>'}</article>`).join('') || '<p>Sin órdenes registradas.</p>';
  }
  async saveCare(event) {
    if (this.saving || this.careConflicted) return;
    const form = event.currentTarget;
    const care = this.care;
    const session = this.employeeSession;
    const assignment = this.q('[data-staff-role]').value;
    const status = this.q('[data-save-status]');
    this.q('[data-care-notice]').textContent = '';
    let data, options;
    try {
      ({ data, options } = this.control.prepararAtencion(session, assignment, care, {
        ...this.form(form), accion: event.submitter?.value || 'GUARDAR_PARCIAL',
        examenes: [...form.querySelectorAll('[name=examenes]:checked')].map((input) => input.value),
      }));
    } catch (error) {
      status.textContent = error.type === 'validation' ? error.message : gestionError(error);
      status.className = 'status error';
      return;
    }
    this.saving = true;
    const controls = [...form.querySelectorAll('button,input,textarea,select'), this.q('[data-back]')];
    controls.forEach((node) => { node.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Guardando atención…';
    status.className = 'status';
    let saved;
    const current = () => this.care === care && this.consultation === care.idConsulta && this.employeeSession?.token === session?.token
      && this.q('[data-staff-role]').value === assignment && form.isConnected;
    try {
      saved = (await this.api.register(data, options)).datos;
    } catch (error) {
      if (error.status === 401) this.sessions.invalidate?.();
      if (!current()) return;
      status.textContent = gestionError(error);
      status.className = 'status error';
      this.careConflicted = error.status === 409 || error.status === 403 || error.status >= 500
        || ['connection', 'network'].includes(error.type);
      if (this.careConflicted) {
        status.textContent += ' No se confirmó el guardado. Actualiza el paso antes de reenviar; el texto permanece en el formulario.';
        this.q('[data-retry-care]').hidden = false;
      }
    } finally {
      this.saving = false;
      form.setAttribute('aria-busy', 'false');
      controls.forEach((node) => { node.disabled = false; });
      if (this.careConflicted) form.querySelectorAll('button').forEach((node) => { node.disabled = true; });
    }
    if (!saved || !current()) return;
    if (data.accion === 'GUARDAR_PARCIAL') {
      this.q('[data-care-notice]').textContent = 'Atención guardada correctamente.';
      await this.loadCare(true);
    } else {
      this.show('dashboard');
      await this.loadQueue();
      if (this.employeeSession?.token === session?.token)
        this.q('[data-employee-status]').textContent = saved.finalizada
          ? 'Procedimiento finalizado correctamente.' : 'Transición guardada. La consulta puede corresponder a otro rol.';
    }
  }
}
if (!customElements.get('galenos-academic-app'))
  customElements.define('galenos-academic-app', GalenosAcademicApp);
