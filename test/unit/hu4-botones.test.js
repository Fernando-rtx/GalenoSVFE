import { expect } from 'chai';
import sinon from 'sinon';
import AcademicCareControl from '../../src/js/control/AcademicCareControl.js';

suite('HU4: acciones de los botones de atención', () => {
  let Component;
  let app;
  let form;
  let content;

  suiteSetup(async () => {
    // Solo se simulan las interfaces DOM necesarias para importar el componente.
    const previous = Object.fromEntries(['HTMLElement', 'customElements', 'window'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const registry = new Map();
    globalThis.HTMLElement = class {};
    globalThis.customElements = { get: (name) => registry.get(name), define: (name, value) => registry.set(name, value) };
    globalThis.window = { addEventListener: sinon.stub() };
    try {
      await import('../../src/js/boundary/components/galenos-academic-app.js');
      Component = registry.get('galenos-academic-app');
    } finally {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });

  setup(() => {
    // El formulario y REST son dobles; no hay conexión al backend ni a PostgreSQL.
    app = Object.create(Component.prototype);
    app.employeeSession = { token: 'sesion-sintetica', contexto: { tipo: 'EMPLEADO', idPersona: 'empleado', asignaciones: [
      { idPersonaRol: 'asignacion', idRol: 'enfermeria', idClinica: 'clinica' },
    ] } };
    app.care = { idConsulta: 'consulta', idConsultaProcedimientoPaso: 'ejecucion', rol: 'enfermera',
      valorActual: '', historial: [], examenes: [], siguientes: [{ idPaso: 'destino', nombre: 'Evaluación médica' }],
      puedeRetroceder: false, pasoFinal: false };
    app.consultation = 'consulta';
    app.control = new AcademicCareControl();
    app.control.selected = app.care;
    app.sessions = {};
    app.dispatchEvent = sinon.stub().returns(true);
    app.api = { register: sinon.stub().resolves({ datos: { finalizada: false } }) };
    app.loadCare = sinon.stub().resolves();
    app.loadQueue = sinon.stub().resolves();
    app.show = sinon.stub();
    app.form = sinon.stub().returns({ valor: 'Nota sintética de preparación', idPasoSiguiente: 'destino' });
    form = { isConnected: true, addEventListener: sinon.stub(), buttons: [{ disabled: false }], querySelectorAll: (selector) => selector === '[name=examenes]:checked' ? [] : form.buttons, setAttribute: sinon.stub() };
    content = { innerHTML: '' };
    const nodes = { '[data-care-form]': form, '[data-care-content]': content, '[data-staff-role]': { value: 'asignacion' } };
    app.q = (selector) => nodes[selector] ||= {};
    sinon.spy(app, 'saveCare');
    app.renderCare();
  });

  // Usa el valor del botón que renderiza producción y el listener real del formulario.
  async function submitButton(label) {
    const button = [...content.innerHTML.matchAll(/<button[^>]*value="([^"]+)"[^>]*>([^<]+)<\/button>/g)]
      .find((match) => match[2] === label);
    expect(button, `Botón ${label}`).not.to.equal(undefined);
    const event = { currentTarget: form, submitter: { value: button[1] }, preventDefault: sinon.stub() };
    form.addEventListener.withArgs('submit').firstCall.args[1](event);
    await app.saveCare.firstCall.returnValue;
    sinon.assert.calledOnce(event.preventDefault);
    sinon.assert.calledOnce(app.api.register);
  }

  test('Guardar avance envía GUARDAR_PARCIAL aunque haya un siguiente paso seleccionado', async () => {
    await submitButton('Guardar avance');
    const data = app.api.register.firstCall.args[0];
    expect(data.accion).to.equal('GUARDAR_PARCIAL');
    expect(data.valor).to.equal('Nota sintética de preparación');
    expect(data).not.to.have.property('idPasoSiguiente');
    sinon.assert.calledOnce(app.loadCare);
    sinon.assert.notCalled(app.loadQueue);
    sinon.assert.notCalled(app.show);
  });

  test('Guardar y avanzar envía AVANZAR con el destino seleccionado', async () => {
    await submitButton('Guardar y avanzar');
    const data = app.api.register.firstCall.args[0];
    expect(data.accion).to.equal('AVANZAR');
    expect(data.idPasoSiguiente).to.equal('destino');
    expect(data.valor).to.equal('Nota sintética de preparación');
    sinon.assert.calledOnce(app.loadQueue);
    sinon.assert.calledWith(app.show, 'dashboard');
    sinon.assert.notCalled(app.loadCare);
  });
  test('espera confirmación REST antes del éxito y bloquea un segundo envío', async () => {
    let confirm;
    app.api.register.returns(new Promise((resolve) => { confirm = resolve; }));
    const saving = submitButton('Guardar avance');
    expect(form.buttons[0].disabled).to.equal(true);
    expect(app.dispatchEvent.args.map(([event]) => event.detail.tipo)).to.deep.equal(['cargando']);
    await app.saveCare({ currentTarget: form, submitter: { value: 'GUARDAR_PARCIAL' } });
    sinon.assert.calledOnce(app.api.register);

    confirm({ datos: { finalizada: false } });
    await saving;

    expect(form.buttons[0].disabled).to.equal(false);
    expect(app.dispatchEvent.lastCall.args[0].detail).to.include({ tipo: 'confirmacion', mensaje: 'Atención guardada correctamente' });
  });

  test('un conflicto REST conserva el formulario y nunca anuncia éxito', async () => {
    app.api.register.rejects({ status: 409 });
    await submitButton('Guardar avance');
    const notices = app.dispatchEvent.args.map(([event]) => event.detail);
    expect(notices.map((notice) => notice.tipo)).to.deep.equal(['cargando', 'advertencia']);
    expect(app.careConflicted).to.equal(true);
    expect(form.buttons[0].disabled).to.equal(true);
    expect(app.form.firstCall.returnValue.valor).to.equal('Nota sintética de preparación');
    sinon.assert.notCalled(app.loadCare);
    sinon.assert.notCalled(app.loadQueue);
  });

  test('la sesión vencida avisa aunque se cierre el formulario al invalidarla', async () => {
    app.api.register.rejects({ status: 401 });
    app.sessions.invalidate = () => { app.employeeSession = null; };
    await submitButton('Guardar avance');
    const notices = app.dispatchEvent.args.map(([event]) => event.detail);
    expect(notices.some((notice) => notice.tipo === 'advertencia' && notice.id === 'session-warning')).to.equal(true);
    expect(notices.some((notice) => notice.tipo === 'confirmacion')).to.equal(false);
  });

});
