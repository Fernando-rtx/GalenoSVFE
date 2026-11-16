/** Interacciones visuales del shell; no accede a datos ni cambia permisos. */
export function mountAppearance(root) {
  const menu = root.querySelector('.sidebar');
  const toggle = root.querySelector('.layout-menu-toggle');
  const theme = root.querySelector('#themeToggle');
  const themeIcon = theme.querySelector('[data-theme-icon]');
  const storageKey = 'galenos.theme';
  const savedTheme = () => {
    try {
      return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark';
    } catch {
      return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    }
  };
  const applyTheme = (value) => {
    const next = value === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
  };
  function toggleMenu() {
    menu.hidden = !menu.hidden;
    root.classList.toggle('menu-closed', menu.hidden);
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  }
  function updateTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    themeIcon.src = `/resources/iconos/temas${dark ? 'oscuro' : 'claro'}.svg`;
    theme.setAttribute('aria-label', label);
    theme.title = label;
  }
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // La preferencia sigue activa durante esta visita.
    }
  }
  const restoreTheme = () => applyTheme(savedTheme());
  const observer = new MutationObserver(updateTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  toggle.addEventListener('click', toggleMenu);
  theme.addEventListener('click', toggleTheme);
  window.addEventListener('pageshow', restoreTheme);
  restoreTheme();
  updateTheme();
  return {
    destroy() {
      observer.disconnect();
      toggle.removeEventListener('click', toggleMenu);
      theme.removeEventListener('click', toggleTheme);
      window.removeEventListener('pageshow', restoreTheme);
    },
  };
}
