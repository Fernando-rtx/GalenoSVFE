/** Interacciones visuales del shell; no accede a datos ni cambia permisos. */
export function mountAppearance(root) {
  const menu = root.querySelector('.sidebar');
  const toggle = root.querySelector('.layout-menu-toggle');
  const theme = root.querySelector('#themeToggle');
  const session = root.querySelector('[data-session]');
  const context = root.querySelector('[data-context-access]');
  let sessionAction = () => {};
  function toggleMenu() {
    menu.hidden = !menu.hidden;
    root.classList.toggle('menu-closed', menu.hidden);
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  }
  function updateTheme() {
    theme.textContent = document.documentElement.dataset.theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
  const observer = new MutationObserver(updateTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  toggle.addEventListener('click', toggleMenu);
  const openSession = () => sessionAction();
  session.addEventListener('click', openSession);
  context.addEventListener('click', openSession);
  updateTheme();
  return {
    connectSession(action) { sessionAction = action; },
    sessionChanged(identity) {
      root.querySelector('[data-session-name]').textContent = identity?.actor ?? 'Iniciar sesión';
      session.querySelector('small').textContent = identity ? (identity.puedeEscribir ? 'Edición autorizada' : 'Solo lectura') : 'Contexto autorizado';
    },
    destroy() { observer.disconnect(); toggle.removeEventListener('click', toggleMenu); session.removeEventListener('click', openSession); context.removeEventListener('click', openSession); }
  };
}
