/** Interacciones visuales del shell; no accede a datos ni cambia permisos. */
export function mountAppearance(root) {
  const menu = root.querySelector('.sidebar');
  const toggle = root.querySelector('.layout-menu-toggle');
  const theme = root.querySelector('#themeToggle');
  function toggleMenu() {
    menu.hidden = !menu.hidden;
    root.classList.toggle('menu-closed', menu.hidden);
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  }
  function updateTheme() {
    theme.textContent =
      document.documentElement.dataset.theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
  const observer = new MutationObserver(updateTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  toggle.addEventListener('click', toggleMenu);
  updateTheme();
  return {
    destroy() {
      observer.disconnect();
      toggle.removeEventListener('click', toggleMenu);
    },
  };
}
