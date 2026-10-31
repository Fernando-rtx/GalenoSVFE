import { expect } from 'chai';
import { editableRecord } from '../../src/js/boundary/editable-record.js';

describe('Apertura de registros sin botón Editar', () => {
  function setup(enabled = true) {
    let opened = 0;
    const attributes = {};
    const record = { classList: { add() {} }, setAttribute(key, value) { attributes[key] = value; } };
    editableRecord(record, () => opened++, enabled);
    const event = (changes = {}) => ({ type: 'dblclick', target: record, defaultPrevented: false, composedPath: () => [record], preventDefault() {}, ...changes });
    return { record, attributes, event, opened: () => opened };
  }
  it('abre por doble clic y permite descubrir el registro con teclado', () => {
    const s = setup();s.record.ondblclick(s.event());
    expect(s.opened()).to.equal(1);expect(s.record.tabIndex).to.equal(0);
  });
  it('Enter y espacio abren, otras teclas y repeticiones no', () => {
    const s = setup();
    for (const key of ['Enter', ' ', 'Escape']) s.record.onkeydown(s.event({ type: 'keydown', key }));
    s.record.onkeydown(s.event({ type: 'keydown', key: 'Enter', repeat: true }));
    expect(s.opened()).to.equal(2);
  });
  it('no edita al activar una acción o campo dentro de la fila', () => {
    const s = setup();
    const button = { matches: () => true };
    s.record.ondblclick(s.event({ composedPath: () => [button, s.record] }));
    s.record.onkeydown(s.event({ type: 'keydown', key: 'Enter', target: button }));
    expect(s.opened()).to.equal(0);
  });
  it('respeta el estado deshabilitado y los eventos ya consumidos', () => {
    const s = setup(false);s.record.ondblclick(s.event());s.record.onkeydown(s.event({ type: 'keydown', key: 'Enter' }));
    expect(s.opened()).to.equal(0);expect(s.record.tabIndex).to.equal(-1);expect(s.attributes['aria-disabled']).to.equal('true');
    const enabled = setup();enabled.record.ondblclick(enabled.event({ defaultPrevented: true }));expect(enabled.opened()).to.equal(0);
  });
});
