import { NOTIFICATION_EVENT } from '../notifications.js';

const TYPES = new Set(['error', 'informacion', 'confirmacion', 'advertencia', 'cargando']);

export class GalenosNotifications extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timers = new Map();
    this.onNotification = this.onNotification.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  connectedCallback() {
    if (!this.shadowRoot.firstChild) {
      const style = document.createElement('style');
      style.textContent = `:host{position:fixed;right:1rem;bottom:1rem;z-index:1000;max-width:min(28rem,calc(100vw - 2rem));font:inherit;color:var(--text-color,#263b52)} .notice{overflow-wrap:anywhere;color:#20384d;background:#fff;border:1px solid #9eafbf;border-left:4px solid #245a8e;border-radius:.4rem;box-shadow:0 4px 18px #0003;padding:.8rem;margin-top:.5rem;display:flex;gap:1rem;align-items:start} .error{border-left-color:#a72536}.advertencia{border-left-color:#ac7500}.confirmacion{border-left-color:#245a8e} .cargando span:before{content:"";display:inline-block;width:.8em;height:.8em;margin-right:.6em;border:2px solid #9eafbf;border-top-color:#245a8e;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.cargando span:before{animation:none}}@media(max-width:480px){:host{left:.75rem;right:.75rem;bottom:.75rem;max-width:none}} button{background:transparent;border:0;color:inherit;cursor:pointer;font:inherit;min-width:2rem;min-height:2rem;border-radius:.25rem}button:focus-visible{outline:2px solid #245a8e;outline-offset:2px}`;
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
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  onNotification(event) {
    const { tipo, mensaje, id } = event.detail || {};
    if (tipo === 'cerrar' && id) {
      for (const node of this.shadowRoot.querySelector('[aria-live]').children)
        if (node.dataset.id === id) this.removeNotice(node);
      return;
    }
    if (!TYPES.has(tipo) || typeof mensaje !== 'string' || !mensaje.trim()) return;
    const list = this.shadowRoot.querySelector('[aria-live]');
    if (id) for (const node of [...list.children]) {
      if (node.dataset.id === id) this.removeNotice(node);
    }
    if ([...list.children].some((node) => node.dataset.message === `${tipo}:${mensaje}`)) return;
    const notice = document.createElement('div');
    notice.className = `notice ${tipo}`;
    if (id) notice.dataset.id = id;
    notice.dataset.message = `${tipo}:${mensaje}`;
    notice.setAttribute('role', ['error', 'advertencia'].includes(tipo) ? 'alert' : 'status');
    notice.setAttribute('aria-live', ['error', 'advertencia'].includes(tipo) ? 'assertive' : 'polite');
    notice.setAttribute('aria-atomic', 'true');
    const message = document.createElement('span');
    message.textContent = mensaje;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar aviso');
    notice.append(message, close);
    list.append(notice);
    if (tipo === 'confirmacion' || tipo === 'informacion')
      this.timers.set(notice, setTimeout(() => this.removeNotice(notice), 5500));
  }

  removeNotice(notice) {
    if (!notice) return;
    clearTimeout(this.timers.get(notice));
    this.timers.delete(notice);
    notice.remove();
  }

  onClick(event) {
    if (event.target.closest('button')) this.removeNotice(event.target.closest('.notice'));
  }
}

if (!customElements.get('galenos-notifications'))
  customElements.define('galenos-notifications', GalenosNotifications);
