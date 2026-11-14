import { expect } from 'chai';
import AcademicCareControl from '../../src/js/control/AcademicCareControl.js';
import { rejection } from '../helpers/http-fixture.js';
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
describe('Atención: coordinación de solicitudes', () => {
  it('descarta una respuesta anterior aunque Fetch ignore la cancelación', async () => {
    const control = new AcademicCareControl(); const old = deferred();
    const pending = control.read('bandeja', () => old.promise);
    expect(await control.read('bandeja', async () => 'actual')).to.equal('actual');
    old.resolve('anterior'); expect(await pending).to.equal(null);
  });
  it('no cancela la carga de pacientes al consultar la bandeja', async () => {
    const control = new AcademicCareControl(); const old = deferred();
    const pending = control.read('paciente', () => old.promise);
    await control.read('bandeja', async () => []);
    old.resolve('paciente'); expect(await pending).to.equal('paciente');
  });
  it('cancelar impide recuperar información de la sesión anterior', async () => {
    const control = new AcademicCareControl(); const old = deferred();
    const pending = control.read('atencion', () => old.promise);
    control.cancel(); old.resolve('privado'); expect(await pending).to.equal(null);
  });
  it('conserva los errores HTTP para la presentación', async () => {
    const error = { status: 403 }; const control = new AcademicCareControl();
    expect(await rejection(control.read('atencion', async () => { throw error; }))).to.equal(error);
  });
});
