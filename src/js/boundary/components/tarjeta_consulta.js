import './tarjeta_simple.js';
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
          this._consulta?.portalPaciente ? 'descargar-ticket' : 'consulta-seleccionada',
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
    card.append(title, content, procedures, button);
    this.shadowRoot.append(stylesheet, card);
    this._nodes = { title, values, button, procedures };
  }

  _render() {
    if (!this._nodes) return;
    const consulta = this._consulta || {};
    const { title, values, button, procedures } = this._nodes;
    const patient = consulta.portalPaciente === true;
    title.textContent = displayText(
      patient ? consulta.clinicaNombre : consulta.personaNombre,
      patient ? 'Clínica' : 'Persona sin nombre',
    );
    values.rolNombre.textContent = displayText(consulta.rolNombre);
    values.clinicaNombre.textContent = displayText(consulta.clinicaNombre);
    values.fechaInicio.textContent = formatUtcDate(consulta.fechaInicio);
    values.fechaFin.textContent = formatUtcDate(consulta.fechaFin);
    if (patient) {
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
    button.textContent = patient ? 'Descargar ticket PDF' : 'Ver detalle';
    button.disabled = typeof consulta.idConsulta !== 'string' || !consulta.idConsulta.trim();
    button.setAttribute(
      'aria-label',
      `${patient ? 'Descargar ticket de' : 'Ver detalle de'} ${title.textContent}`,
    );
  }
}

if (!customElements.get('tarjeta-consulta')) {
  customElements.define('tarjeta-consulta', TarjetaConsulta);
}
