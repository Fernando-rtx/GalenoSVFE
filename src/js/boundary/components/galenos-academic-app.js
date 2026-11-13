import AcademicCareService from '../../control/AcademicCareService.js';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (value) => value ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/El_Salvador' }).format(new Date(value)) : 'Pendiente';

class GalenosAcademicApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.abort = null;
    this.person = null;
    this.care = null;
    this.onNetwork = () => this.updateNetwork();
  }
  configure(config, sessions = {}) { this.api = new AcademicCareService(config); this.sessions = sessions; this.render(); this.refreshSessions(); }
  connectedCallback() { if (!this.api) this.render(); window.addEventListener('online', this.onNetwork); window.addEventListener('offline', this.onNetwork); this.updateNetwork(); }
  disconnectedCallback() { this.abort?.abort(); window.removeEventListener('online', this.onNetwork); window.removeEventListener('offline', this.onNetwork); }
  updateNetwork() { const status = this.q('[data-network]'); if (status) { status.textContent = navigator.onLine ? 'Conexión disponible. La información clínica no se guarda en este dispositivo.' : 'Sin conexión. La aplicación está abierta, pero las consultas requieren conexión; no se conserva información clínica localmente.'; status.className = navigator.onLine ? 'status' : 'status error'; } }
  render() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:#162b3c;font:inherit}*{box-sizing:border-box}main{max-width:1120px;margin:auto;padding:clamp(1rem,3vw,2.4rem)}
      h1{font-size:clamp(1.7rem,4vw,2.5rem);margin:.2rem 0}.lead{color:#526779;max-width:65ch}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:#287c77;font-size:.75rem;font-weight:700}
      nav,.toolbar,.grid,.actions{display:flex;gap:.75rem;flex-wrap:wrap;align-items:end}nav{border-bottom:1px solid #d9e3e9;padding:.8rem 0;margin-bottom:1.25rem}button,.tab{font:inherit;border:0;border-radius:.55rem;padding:.75rem 1rem;background:#e7eff3;color:#163348;cursor:pointer;font-weight:650}.active,.primary{background:#176b66;color:white}button:disabled{opacity:.55;cursor:wait}
      section{background:white;border:1px solid #dce6eb;border-radius:1rem;padding:clamp(1rem,2.5vw,1.5rem);margin:1rem 0;box-shadow:0 8px 24px #1231}label{display:grid;gap:.35rem;font-weight:600;min-width:min(100%,13rem);flex:1}input,select,textarea{font:inherit;padding:.7rem;border:1px solid #9eb2bf;border-radius:.45rem;background:white;color:#162b3c}textarea{min-height:8rem;width:100%;resize:vertical}.status{min-height:1.5rem;color:#536a79}.error{color:#a02f37}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:.8rem}.card{border:1px solid #dce6eb;border-radius:.75rem;padding:1rem}.card h3{margin:.1rem 0 .5rem}.meta{color:#536a79;font-size:.94rem;line-height:1.6}details{margin-top:.6rem}summary{cursor:pointer;font-weight:650}ol{padding-left:1.3rem}.step{padding:.45rem 0;border-bottom:1px solid #edf1f3}.sr{position:absolute;clip:rect(0,0,0,0)}[hidden]{display:none!important}:focus-visible{outline:3px solid #df9d30;outline-offset:2px}
      @media(max-width:560px){main{padding:.8rem}.toolbar>*{width:100%}button{min-height:44px}.actions button{flex:1}}
    </style><main><p class="eyebrow">GalenosSV · atención académica</p><h1>Consultas y atención</h1><p class="lead">Consulta tus citas y atiende los casos asociados a la sesión académica que hayas iniciado.</p>
      <nav aria-label="Historias de usuario"><button class="tab active" data-tab="paciente">HU1 · Citas</button><button class="tab" data-tab="empleado">HU2 · Empleado</button><button class="tab" data-tab="dashboard" hidden>HU3 · Bandeja</button></nav><p class="status" data-network role="status" aria-live="polite"></p>
    <section data-panel="paciente"><h2>Mis citas</h2><p>La identidad se comparte de forma segura con el portal de paciente.</p><p class="status" data-patient-status role="status" aria-live="polite"></p><a href="#pacientes">Abrir portal de paciente</a><form data-patient hidden></form><button data-retry-types hidden>Reintentar carga</button><div data-clinic-area hidden><label>Clínica<select data-patient-clinic></select></label><form data-patient-dates class="toolbar"><label>Desde<input type="date" name="fechaDesde"></label><label>Hasta<input type="date" name="fechaHasta"></label><button class="primary">Consultar citas</button></form><div class="cards" data-patient-cards></div></div></section>
    <section data-panel="empleado" hidden><h2>Identidad de empleado</h2><p>La identidad se comparte de forma segura con el portal de empleado.</p><p class="status" data-employee-status role="status" aria-live="polite"></p><a href="#empleados">Abrir portal de empleado</a><form data-employee hidden></form><div data-employee-context hidden><p data-person-label></p><div class="grid"><label>Clínica<select data-staff-clinic></select></label><label>Asignación<select data-staff-role></select></label></div><form data-staff-dates class="toolbar"><label>Desde<input type="date" name="fechaDesde" value="${today()}"></label><label>Hasta<input type="date" name="fechaHasta" value="${today()}"></label><button class="primary">Actualizar bandeja</button></form><p class="status" data-queue-status role="status" aria-live="polite"></p><div class="cards" data-queue></div></div></section>
    <section data-panel="atencion" hidden><button data-back>← Regresar a la bandeja</button><p class="status" data-care-status role="status" aria-live="polite"></p><div data-care-content></div></section></main>`;
    this.bind();
  }
  q(s) { return this.shadowRoot.querySelector(s); }
  bind() {
    this.shadowRoot.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => this.show(button.dataset.tab)));
    this.q('[data-patient]').addEventListener('submit', (e) => { e.preventDefault(); this.searchPatient(e.currentTarget); });
    this.q('[data-patient-dates]').addEventListener('submit', (e) => { e.preventDefault(); this.loadPatientAppointments(); });
    this.q('[data-employee]').addEventListener('submit', (e) => { e.preventDefault(); this.login(e.currentTarget); });
    this.q('[data-staff-dates]').addEventListener('submit', (e) => { e.preventDefault(); this.loadQueue(); });
    this.q('[data-staff-clinic]').addEventListener('change', () => this.roles()); this.q('[data-staff-role]').addEventListener('change', () => this.loadQueue());
    this.q('[data-patient-clinic]').addEventListener('change', () => this.loadPatientAppointments());
    this.q('[data-back]').addEventListener('click', () => this.show('dashboard'));
    this.q('[data-retry-types]').addEventListener('click', () => this.loadDocumentTypes());
    this.updateNetwork();
  }
  show(name) { this.shadowRoot.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; }); this.shadowRoot.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name)); }
  async request(fn, status) { if (!this.api) { status.textContent = 'Falta configurar la conexión con el backend.'; status.className = 'status error'; return null; } this.abort?.abort(); this.abort = new AbortController(); status.className = 'status'; status.textContent = 'Cargando…'; try { const result = await fn({ signal: this.abort.signal }); status.textContent = ''; return result.datos; } catch (error) { if (error.code !== 'CANCELLED') { status.textContent = error.status === 401 ? 'Identidad o acceso no válido.' : error.status === 403 ? 'Esta identidad no tiene acceso a esa clínica, rol o consulta.' : 'No se pudo conectar. Revisa la red y vuelve a intentar.'; status.className = 'status error'; } return null; } }
  form(form) { return Object.fromEntries(new FormData(form).entries()); }
  sessionHeaders(session, assignment) { return { headers: { Authorization: `Bearer ${session.token}`, ...(assignment ? { 'X-Persona-Rol': assignment } : {}) } }; }
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
    if (this.employeeSession) {
      const context = employee.contexto;
      const clinics = [...new Map(context.asignaciones.map((a) => [a.idClinica, { idClinica: a.idClinica, nombre: a.clinicaNombre }])).values()];
      this.person = { idPersona: context.idPersona, nombres: context.personaNombre, apellidos: '', clinicas, roles: context.asignaciones };
      this.q('[data-person-label]').textContent = `Sesión activa: ${context.personaNombre}`;
      this.q('[data-employee-context]').hidden = false;
      this.q('[data-panel="empleado"]').dataset.panel = 'dashboard';
      this.q('[data-staff-clinic]').innerHTML = clinics.map((c) => `<option value="${esc(c.idClinica)}">${esc(c.nombre)}</option>`).join('');
      this.q('[data-tab="dashboard"]').hidden = false;
      this.q('[data-employee-status]').textContent = '';
      this.roles();
    } else {
      this.person = null;
      this.q('[data-employee-context]').hidden = true;
      this.q('[data-panel="empleado"]').dataset.panel = 'empleado';
      this.q('[data-tab="dashboard"]').hidden = true;
      this.q('[data-employee-status]').textContent = 'Identifícate en el portal de empleado para abrir la bandeja.';
    }
  }
  async loadDocumentTypes() { const status = this.q('[data-patient-status]'); if (!this.api) return; this.q('[data-retry-types]').hidden = true; const rows = await this.request((o) => this.api.findDocumentTypes(0, 100, o), status); if (!rows) { this.q('[data-retry-types]').hidden = false; return; } const options = rows.filter((row) => row.activo).map((row) => `<option value="${esc(row.idTipoDocumento)}">${esc(row.nombre)}</option>`).join(''); this.shadowRoot.querySelectorAll('select[name="idTipoDocumento"]').forEach((select) => { select.innerHTML = `<option value="">Selecciona…</option>${options}`; }); }
  async searchPatient() { await this.refreshSessions(); }
  async loadPatientAppointments() { const clinic = this.q('[data-patient-clinic]').value; if (!clinic || !this.patientSession) return; const dates = this.form(this.q('[data-patient-dates]')); const query = { idClinica: clinic, ...Object.fromEntries(Object.entries(dates).filter(([,v]) => v)) }; if (query.fechaDesde && query.fechaHasta && query.fechaDesde > query.fechaHasta) { this.q('[data-patient-status]').textContent = 'La fecha inicial debe ser anterior a la fecha final.'; return; } const assignment = this.patientSession.contexto.asignaciones.find((a) => a.idClinica === clinic); const options = this.sessionHeaders(this.patientSession, assignment?.idPersonaRol); const rows = await this.request((o) => this.api.findPatientAppointments(0, 100, query, { ...o, ...options }), this.q('[data-patient-status]')); if (!rows) return; this.q('[data-patient-cards]').innerHTML = rows.map((a) => `<article class="card"><h3>${esc(a.procedimiento || 'Cita')}</h3><p class="meta">${esc(fmt(a.fechaInicio))} · ${esc(a.clinica || '')}<br>Paciente: ${esc(a.paciente || '')}</p><details><summary>Pasos registrados</summary>${this.history(a.historial)}</details><button data-ticket="${esc(a.idConsulta)}" class="primary">Descargar ticket PDF</button></article>`).join('') || '<p>No hay citas para los filtros seleccionados.</p>'; this.q('[data-patient-cards]').querySelectorAll('[data-ticket]').forEach((b) => b.addEventListener('click', () => this.download(b.dataset.ticket, query))); }
  async download(id, query) { const status = this.q('[data-patient-status]'); const clinic = query.idClinica; const assignment = this.patientSession?.contexto.asignaciones.find((a) => a.idClinica === clinic); const blob = await this.request((o) => this.api.getTicket(id, { idClinica: clinic }, { ...o, ...this.sessionHeaders(this.patientSession, assignment?.idPersonaRol) }), status); if (!blob) return; const href = URL.createObjectURL(blob); const link = Object.assign(document.createElement('a'), { href, download: 'galenos-ticket.pdf' }); link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000); }
  async login() { await this.refreshSessions(); if (this.person) this.show('dashboard'); }
  roles() { const clinic = this.q('[data-staff-clinic]').value; const roles = this.person?.roles.filter((r) => r.idClinica === clinic) || []; this.q('[data-staff-role]').innerHTML = roles.map((r) => `<option value="${esc(r.idPersonaRol)}">${esc(r.rolNombre)}</option>`).join(''); this.loadQueue(); }
  async loadQueue() { if (!this.person || !this.q('[data-staff-role]').value) return; const assignment = this.person.roles.find((r) => r.idPersonaRol === this.q('[data-staff-role]').value); if (!assignment) return; const dates = this.form(this.q('[data-staff-dates]')); if (dates.fechaDesde && dates.fechaHasta && dates.fechaDesde > dates.fechaHasta) { this.q('[data-queue-status]').textContent = 'La fecha inicial debe ser anterior a la fecha final.'; return; } const query = { idPersona: this.person.idPersona, idClinica: this.q('[data-staff-clinic]').value, idRol: assignment.idRol, ...dates }; const options = this.sessionHeaders(this.employeeSession, assignment.idPersonaRol); const rows = await this.request((o) => this.api.findEmployeeAppointments(0, 100, query, { ...o, ...options }), this.q('[data-queue-status]')); if (!rows) return; this.q('[data-queue]').innerHTML = rows.map((a) => `<article class="card"><h3>${esc(a.paciente || 'Paciente')}</h3><p class="meta">${esc(fmt(a.fechaInicio))}<br>${esc(a.procedimiento || '')}<br>Paso actual: ${esc(a.pasoActual || 'Sin paso')}</p><details><summary>Historial de pasos</summary>${this.history(a.historial)}</details><button class="primary" data-open-care="${esc(a.idConsulta)}">Abrir atención</button></article>`).join('') || '<p>No hay consultas asignadas en este rango de fechas.</p>'; this.q('[data-queue]').querySelectorAll('[data-open-care]').forEach((button) => button.addEventListener('click', (event) => this.openCare(event.currentTarget.dataset.openCare))); }
  history(items = []) { return items.length ? `<ol>${items.map((i) => `<li class="step"><strong>${esc(i.nombre || 'Paso')}</strong> · ${esc(i.estado || '')}<div class="meta">Responsable: ${esc(i.responsable || 'No registrado')} · ${esc(fmt(i.fechaInicio))}${i.fechaFin ? ` – ${esc(fmt(i.fechaFin))}` : ''}<details><summary>Ver registro</summary><p>${esc(i.valor || 'Sin datos registrados')}</p></details></div></li>`).join('')}</ol>` : '<p>Aún no hay pasos registrados.</p>'; }
  context() { const assignment = this.person.roles.find((r) => r.idPersonaRol === this.q('[data-staff-role]').value); return { idPersona: this.person.idPersona, idClinica: this.q('[data-staff-clinic]').value, idRol: assignment?.idRol }; }
  async openCare(id) { this.consultation = id; this.show('atencion'); await this.loadCare(); }
  async loadCare() { const assignment = this.person.roles.find((r) => r.idPersonaRol === this.q('[data-staff-role]').value); const options = this.sessionHeaders(this.employeeSession, assignment?.idPersonaRol); const data = await this.request((o) => this.api.getCare(this.consultation, this.context(), { ...o, ...options }), this.q('[data-care-status]')); if (!data) return; this.care = data; this.renderCare(); }
  renderCare() { const d = this.care; this.q('[data-care-content]').innerHTML = `<h2>Atención de consulta</h2><p class="meta">Paciente: ${esc(d.paciente)} · Clínica: ${esc(d.clinica)} · Rol: ${esc(d.rol)}<br>Procedimiento: ${esc(d.procedimiento)} · Paso actual: ${esc(d.pasoActual)}</p><details open><summary>Historial</summary>${this.history(d.historial)}</details><form data-care-form><label>Registro de atención<textarea name="valor" required minlength="1" maxlength="10000">${esc(d.valorActual || '')}</textarea></label><fieldset><legend>Exámenes permitidos para este paso</legend>${d.examenes.map((e) => `<label><input type="checkbox" name="examenes" value="${esc(e.idExamen)}"> ${esc(e.nombre)}</label>`).join('') || '<p>No hay exámenes configurados.</p>'}</fieldset><div class="actions"><button class="primary" name="accion" value="GUARDAR_PARCIAL">Guardar avance</button>${d.siguientes.length ? `<label>Siguiente paso<select name="idPasoSiguiente">${d.siguientes.map((s) => `<option value="${esc(s.idPaso)}">${esc(s.nombre)}</option>`).join('')}</select></label><button class="primary" name="accion" value="AVANZAR">Guardar y avanzar</button>` : ''}${d.puedeRetroceder ? '<button name="accion" value="RETROCEDER">Retroceder</button>' : ''}${d.pasoFinal ? '<button name="accion" value="FINALIZAR">Finalizar procedimiento</button>' : ''}</div><p class="status" data-save-status role="status"></p></form>`; this.q('[data-care-form]').addEventListener('submit', (e) => { e.preventDefault(); this.saveCare(e); }); }
  async saveCare(event) { const form = event.currentTarget; const button = event.submitter; const status = this.q('[data-save-status]'); const value = form.elements.valor.value.trim(); if (!value) { status.textContent = 'Registra la atención antes de guardar.'; return; } const data = { ...this.context(), idConsulta: this.consultation, idConsultaProcedimientoPaso: this.care.idConsultaProcedimientoPaso, accion: button.value, valor: value, idPasoSiguiente: form.elements.idPasoSiguiente?.value || null, examenes: [...form.querySelectorAll('[name=examenes]:checked')].map((e) => e.value) };
    if (!data.idConsultaProcedimientoPaso) { status.textContent = 'No se recibió el identificador del paso actual.'; return; }
    const assignment = this.person.roles.find((r) => r.idPersonaRol === this.q('[data-staff-role]').value); const options = this.sessionHeaders(this.employeeSession, assignment?.idPersonaRol); form.querySelectorAll('button').forEach((b) => { b.disabled = true; }); const result = await this.request((o) => this.api.register(data, { ...o, ...options }), status); form.querySelectorAll('button').forEach((b) => { b.disabled = false; }); if (result) { if (button.value === 'GUARDAR_PARCIAL') { await this.loadCare(); this.q('[data-save-status]').textContent = 'Atención parcial guardada.'; } else { this.show('dashboard'); await this.loadQueue(); this.q('[data-queue-status]').textContent = result.finalizada ? 'Procedimiento finalizado correctamente.' : 'Transición guardada. La consulta ya puede corresponder a otro rol.'; } }
  }
}
if (!customElements.get('galenos-academic-app')) customElements.define('galenos-academic-app', GalenosAcademicApp);
