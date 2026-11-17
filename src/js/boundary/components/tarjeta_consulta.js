import './tarjeta_simple.js';
import './historial-consulta.js';
import { formatUtcDate } from '../modelos/format-utc-date.js';

const stylesheetUrl = new URL('../../../resources/estilos/tarjeta_consulta.css', import.meta.url);

function displayText(value, fallback = 'Sin especificar') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** Tarjeta de consulta: recibe datos de presentación, nunca llama a la API. */
export default class TarjetaConsulta extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._consulta = null;
    this._nodes = null;
  }

  get consulta() {
    return this._consulta;
  }

  set consulta(value) {
    this._consulta = value && typeof value === 'object' ? value : null;
    this._render();
  }

  connectedCallback() {
    if (!this._nodes) this._build();
    this._render();
  }

  _build() {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetUrl.href;

    const card = document.createElement('tarjeta-simple');
    const title = document.createElement('h3');
    title.slot = 'titulo';

    const content = document.createElement('dl');
    content.slot = 'contenido';
    const values = {};
    for (const [field, label] of [
      ['rolNombre', 'Rol'],
      ['clinicaNombre', 'Clínica'],
      ['fechaInicio', 'Inicio'],
      ['fechaFin', 'Fin'],
    ]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      row.append(term, description);
      content.append(row);
      values[field] = description;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.slot = 'pie';
    button.textContent = 'Ver detalle';
    button.addEventListener('click', () => {
      const idConsulta = this._consulta?.idConsulta;
      if (typeof idConsulta !== 'string' || !idConsulta.trim()) return;
      button.dispatchEvent(
        new CustomEvent(
          this._consulta?.portalPaciente
            ? 'descargar-ticket'
            : this._consulta?.portalEmpleado
              ? 'consulta-atender'
              : 'consulta-seleccionada',
          {
            detail: { idConsulta },
            bubbles: true,
            composed: true,
          },
        ),
      );
    });

    const procedures = document.createElement('ul');
    procedures.slot = 'contenido';
    procedures.hidden = true;
    const employeeContent = document.createElement('div');
    employeeContent.className = 'employee-details';
    employeeContent.slot = 'contenido';
    employeeContent.hidden = true;
    const staffValues = {};
    for (const field of ['procedimiento', 'pasoActual', 'estadoPasoActual']) {
      const paragraph = document.createElement('p');
      paragraph.dataset.field = field;
      staffValues[field] = paragraph;
      employeeContent.append(paragraph);
    }
    const historyDetails = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Historial de pasos anteriores';
    const history = document.createElement('historial-consulta');
    historyDetails.append(summary, history);
    employeeContent.append(historyDetails);
    card.append(title, content, procedures, employeeContent, button);
    this.shadowRoot.append(stylesheet, card);
    this._nodes = { card, title, values, button, procedures, employeeContent, staffValues, history };
  }

  _render() {
    if (!this._nodes) return;
    const consulta = this._consulta || {};
    const { card, title, values, button, procedures, employeeContent, staffValues, history } =
      this._nodes;
    const patient = consulta.portalPaciente === true;
    const employee = consulta.portalEmpleado === true;
    title.textContent = displayText(
      patient ? consulta.clinicaNombre : employee ? consulta.paciente : consulta.personaNombre,
      patient ? 'Clínica' : 'Persona sin nombre',
    );
    values.rolNombre.textContent = displayText(consulta.rolNombre);
    values.clinicaNombre.textContent = displayText(
      employee ? consulta.clinica : consulta.clinicaNombre,
    );
    values.fechaInicio.textContent = formatUtcDate(consulta.fechaInicio);
    values.fechaFin.textContent = formatUtcDate(consulta.fechaFin);
    if (patient || employee) {
      const formatter = new Intl.DateTimeFormat('es-SV', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: consulta.zonaHoraria,
      });
      for (const field of ['fechaInicio', 'fechaFin']) {
        values[field].textContent = consulta[field]
          ? `${formatter.format(new Date(consulta[field]))} · ${consulta.zonaHoraria}`
          : 'Sin especificar';
      }
    }
    card.classList.toggle('employee-card', employee);
    employeeContent.hidden = !employee;
    if (employee) {
      staffValues.procedimiento.textContent = `Procedimiento: ${displayText(consulta.procedimiento)}`;
      staffValues.pasoActual.textContent = `Paso actual: ${displayText(consulta.pasoActual)}`;
      staffValues.estadoPasoActual.textContent = `Estado del paso: ${displayText(consulta.estadoPasoActual, 'No informado')}`;
      history.zonaHoraria = consulta.zonaHoraria;
      history.procedimientos = consulta.procedimientos;
    } else {
      history.procedimientos = null;
    }
    procedures.hidden = !patient;
    procedures.replaceChildren();
    if (patient) {
      const names = consulta.procedimientos?.length
        ? consulta.procedimientos.map((p) => p.procedimientoNombre)
        : ['Sin procedimientos asociados'];
      for (const name of names) {
        const li = document.createElement('li');
        li.textContent = name;
        procedures.append(li);
      }
    }
    button.textContent = patient
      ? 'Descargar ticket PDF'
      : employee
        ? 'Atender consulta'
        : 'Ver detalle';
    button.disabled = typeof consulta.idConsulta !== 'string' || !consulta.idConsulta.trim();
    button.setAttribute(
      'aria-label',
      `${patient ? 'Descargar ticket de' : employee ? 'Atender consulta de' : 'Ver detalle de'} ${title.textContent}`,
    );
  }
}

if (!customElements.get('tarjeta-consulta')) {
  customElements.define('tarjeta-consulta', TarjetaConsulta);
}
