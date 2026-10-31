/** Apertura accesible compartida por filas y registros; ignora sus acciones anidadas. */
export function editableRecord(record, open, enabled = true) {
  record.classList.add('editable-record');
  record.tabIndex = enabled ? 0 : -1;
  record.setAttribute('aria-disabled', String(!enabled));
  record.title = enabled ? 'Doble clic o Enter para abrir el registro' : '';
  function activate(event) {
    if (!enabled || event.defaultPrevented) return;
    if (event.composedPath().some(node => node !== record && node.matches?.('button,a,input,select,textarea'))) return;
    if (event.type === 'keydown' && (event.target !== record || !['Enter', ' '].includes(event.key) || event.repeat)) return;
    event.preventDefault();
    open();
  }
  record.ondblclick = activate;
  record.onkeydown = activate;
}
