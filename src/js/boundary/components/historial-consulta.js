import { arbolHistorial } from '../modelos/historial-presentacion.js';

const css = new URL('../../../resources/estilos/historial-consulta.css', import.meta.url);
const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  return element;
};
export class HistorialConsulta extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._procedimientos = null;
  }
  set procedimientos(value) {
    this._procedimientos = value;
    this.render();
  }
  get procedimientos() {
    return this._procedimientos;
  }
  connectedCallback() {
    this.render();
  }
  fecha(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return 'No registrada';
    return new Intl.DateTimeFormat('es-SV', {
      timeZone: this.zonaHoraria || 'America/El_Salvador',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
  render() {
    this.shadowRoot.replaceChildren();
    const style = node('link');
    style.rel = 'stylesheet';
    style.href = css.href;
    this.shadowRoot.append(style);
    if (!Array.isArray(this._procedimientos)) {
      this.shadowRoot.append(
        node('p', 'El servidor no proporciona el historial por procedimiento.'),
      );
      return;
    }
    if (!this._procedimientos.length)
      this.shadowRoot.append(node('p', 'Sin procedimientos asociados.'));
    for (const group of this._procedimientos) {
      const details = node('details');
      details.open = true;
      details.append(node('summary', group.nombre || 'Procedimiento sin nombre'));
      const roots = arbolHistorial(group);
      if (!roots.length) details.append(node('p', 'Aún no hay pasos anteriores realizados.'));
      else details.append(this.list(roots));
      this.shadowRoot.append(details);
    }
  }
  list(items) {
    const list = node('ul');
    for (const item of items) {
      const li = node('li');
      if (item.referencia) {
        li.append(
          node(
            'p',
            `${item.ciclo ? 'Enlace cíclico registrado' : 'Enlace compartido'} hacia ${item.nombre || 'paso sin nombre'}.`,
          ),
        );
      } else {
        li.append(node('h4', item.nombre || 'Paso sin nombre'));
        if (item.relation) li.append(node('p', `Relación: ${item.relation}`));
        for (const step of item.ejecuciones) {
          const article = node('article');
          article.dataset.execution = step.idConsultaProcedimientoPaso;
          article.append(
            node(
              'p',
              `Responsable: ${step.responsable || 'No registrado'} · Rol: ${step.rol || 'No registrado'} · Estado: ${step.estado}`,
            ),
          );
          article.append(
            node(
              'p',
              `Inicio: ${this.fecha(step.fechaInicio)} · Finalización: ${this.fecha(step.fechaFin)}`,
            ),
          );
          const record = node('details');
          record.append(node('summary', 'Ver registro'));
          const value = node('p', step.valor || 'Sin texto registrado.');
          value.className = 'registered';
          record.append(value);
          for (const order of step.ordenes || []) {
            const exam = node('section');
            exam.append(node('h5', order.examen || 'Examen sin nombre'));
            exam.append(
              node(
                'p',
                `Orden: ${this.fecha(order.fechaCreacion)} · ${order.indicaciones || 'Sin indicaciones registradas'}`,
              ),
            );
            exam.append(node('p', `Estado de la orden: ${order.resultados?.length ? 'Con resultados registrados' : 'Sin resultados registrados'}`));
            exam.append(node('p', `Origen: ${step.nombre || 'Paso sin nombre'} · Responsable: ${step.responsable || 'No registrado'}`));
            for (const result of order.resultados || []) {
              exam.append(
                node(
                  'p',
                  `Resultado (${this.fecha(result.fechaCreacion)}): ${result.resultado || 'No registrado'}`,
                ),
              );
              exam.append(node('p', `Interpretación: ${result.interpretacion || 'No registrada'}`));
            }
            record.append(exam);
          }
          article.append(record);
          li.append(article);
        }
        if (item.children.length) li.append(this.list(item.children));
      }
      list.append(li);
    }
    return list;
  }
}
if (!customElements.get('historial-consulta'))
  customElements.define('historial-consulta', HistorialConsulta);
