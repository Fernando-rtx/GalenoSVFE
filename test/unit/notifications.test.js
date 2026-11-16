import { expect } from 'chai';
import sinon from 'sinon';
import { notify, notifyFailure } from '../../src/js/boundary/notifications.js';

suite('Notificaciones académicas', () => {
  test('emite el evento existente entre Web Components sin interpretar HTML', () => {
    const target = { dispatchEvent: sinon.stub() };
    notify(target, 'confirmacion', 'Atención guardada correctamente', { id: 'atencion' });
    const event = target.dispatchEvent.firstCall.args[0];
    expect(event.type).to.equal('galenos:notificacion');
    expect(event.bubbles && event.composed).to.equal(true);
    expect(event.detail).to.deep.equal({ tipo: 'confirmacion', mensaje: 'Atención guardada correctamente', id: 'atencion' });
  });

  test('401, 403 y 409 son advertencias sin divulgar el cuerpo REST', () => {
    for (const status of [401, 403, 409]) {
      const target = { dispatchEvent: sinon.stub() };
      notifyFailure(target, { status, message: 'Dato privado', details: { paciente: 'Dato privado' } });
      const { tipo, mensaje } = target.dispatchEvent.firstCall.args[0].detail;
      expect(tipo).to.equal('advertencia');
      expect(mensaje).not.to.include('Dato privado');
    }
  });

  test('un error REST no produce confirmación ni expone mensajes internos', () => {
    const target = { dispatchEvent: sinon.stub() };
    notifyFailure(target, { status: 500, message: 'SQL interno' });
    expect(target.dispatchEvent.firstCall.args[0].detail.tipo).to.equal('error');
    expect(target.dispatchEvent.firstCall.args[0].detail.mensaje).not.to.include('SQL');
  });
});
