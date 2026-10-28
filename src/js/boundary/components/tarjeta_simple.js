const stylesheetUrl = new URL('../../../resources/estilos/tarjeta.css', import.meta.url);

function slot(name, fallback) {
  const element = document.createElement('slot');
  element.name = name;
  element.textContent = fallback;
  return element;
}

/** Tarjeta genérica con tres regiones para contenido provisto por su padre. */
export default class TarjetaSimple extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.shadowRoot.childElementCount) return;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetUrl.href;

    const article = document.createElement('article');
    article.className = 'card';
    article.setAttribute('part', 'card');

    const header = document.createElement('header');
    header.append(slot('titulo', 'Sin título'));
    const content = document.createElement('div');
    content.className = 'card-content';
    content.append(slot('contenido', 'Sin contenido'));
    const footer = document.createElement('footer');
    footer.append(slot('pie', 'Sin contenido adicional'));

    article.append(header, content, footer);
    this.shadowRoot.append(stylesheet, article);
  }
}

if (!customElements.get('tarjeta-simple')) {
  customElements.define('tarjeta-simple', TarjetaSimple);
}
