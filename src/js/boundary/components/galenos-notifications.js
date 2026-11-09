import { NOTIFICATION_EVENT } from '../notifications.js';

const TYPES = new Set(['error', 'informacion', 'confirmacion', 'advertencia']);

export class GalenosNotifications extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.onNotification = this.onNotification.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  connectedCallback() {
    if (!this.shadowRoot.firstChild) {
      const style = document.createElement('style');
      style.textContent = `:host{position:fixed;right:1rem;bottom:1rem;z-index:1000;max-width:min(28rem,calc(100vw - 2rem));font:inherit;color:var(--text-color,#263b52)} .notice{background:var(--surface,#fff);border:1px solid #9eafbf;border-left:4px solid #245a8e;border-radius:.4rem;box-shadow:0 4px 18px #0003;padding:.8rem;margin-top:.5rem;display:flex;gap:1rem;align-items:start} .error{border-left-color:#a72536}.advertencia{border-left-color:#ac7500}.confirmacion{border-left-color:#267349} button{background:transparent;border:0;color:inherit;cursor:pointer;font:inherit}`;
      const list = document.createElement('div');
      list.setAttribute('aria-live', 'polite');
      this.shadowRoot.append(style, list);
    }
    document.addEventListener(NOTIFICATION_EVENT, this.onNotification);
    this.shadowRoot.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    document.removeEventListener(NOTIFICATION_EVENT, this.onNotification);
    this.shadowRoot.removeEventListener('click', this.onClick);
  }

  onNotification(event) {
    const { tipo, mensaje } = event.detail || {};
    if (!TYPES.has(tipo) || typeof mensaje !== 'string' || !mensaje.trim()) return;
    const list = this.shadowRoot.querySelector('[aria-live]');
    if ([...list.children].some((node) => node.dataset.message === `${tipo}:${mensaje}`)) return;
    const notice = document.createElement('div');
    notice.className = `notice ${tipo}`;
    notice.dataset.message = `${tipo}:${mensaje}`;
    notice.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    const message = document.createElement('span');
    message.textContent = mensaje;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar aviso');
    notice.append(message, close);
    list.append(notice);
  }

  onClick(event) {
    if (event.target.closest('button')) event.target.closest('.notice')?.remove();
  }
}

if (!customElements.get('galenos-notifications'))
  customElements.define('galenos-notifications', GalenosNotifications);
