import { expect } from 'chai';
import AcademicCareControl from '../../src/js/control/AcademicCareControl.js';

// Fixtures sintéticos de Control: no prueban persistencia.
const session = { token: 'sintetico', contexto: { tipo: 'EMPLEADO', idPersona: 'persona',
  asignaciones: [{ idPersonaRol: 'asignacion', idRol: 'rol', idClinica: 'clinica' }] } };
const care = { idConsulta: 'consulta', idConsultaProcedimientoPaso: 'ejecucion',
  examenes: [{ idExamen: 'permitido' }], siguientes: [{ idPaso: 'siguiente' }],
  pasoFinal: false, puedeRetroceder: false, anteriores: [] };
describe('HU4: preparación del registro de atención', () => {
  let control;
  beforeEach(() => { control = new AcademicCareControl(); control.selected = { idConsulta: care.idConsulta }; });
  const values = (changes = {}) => ({ accion: 'GUARDAR_PARCIAL', valor: ' Nota ', examenes: [], ...changes });
  const prepare = (control, data = {}, detail = care) => control.prepararAtencion(session, 'asignacion', detail, values(data));
  it('deriva contexto y ejecución de la sesión/detalle, sin aceptar UUID de formulario', () => {
    const { data, options } = prepare(control, { idPersona: 'ajena', idClinica: 'ajena', idConsultaProcedimientoPaso: 'ajena' });
    expect(data).to.include({ idPersona: 'persona', idClinica: 'clinica', idRol: 'rol', idConsultaProcedimientoPaso: 'ejecucion', valor: 'Nota' });
    expect(options.headers).to.deep.equal({ Authorization: 'Bearer sintetico', 'X-Persona-Rol': 'asignacion' });
    expect(data).not.to.have.property('idPasoSiguiente');
  });
  it('rechaza notas vacías o extensas sin modificar el detalle', () => {
    for (const valor of ['', '  ', 'a'.repeat(10001), null])
      expect(() => prepare(control, { valor })).to.throw('10000');
    expect(prepare(control, { valor: 'a'.repeat(10000) }).data.valor).to.have.length(10000);
    expect(care).not.to.have.property('valor');
  });
  it('solo acepta exámenes permitidos sin duplicarlos', () => {
    for (const examenes of [['ajeno'], ['permitido', 'permitido']])
      expect(() => prepare(control, { examenes })).to.throw('exámenes permitidos');
    expect(prepare(control, { examenes: ['permitido'] }).data.examenes).to.deep.equal(['permitido']);
  });
  it('exige una transición de avance devuelta por REST', () => {
    expect(() => prepare(control, { accion: 'AVANZAR' })).to.throw('siguiente paso');
    expect(() => prepare(control, { accion: 'AVANZAR', idPasoSiguiente: 'ajeno' })).to.throw();
    expect(prepare(control, { accion: 'AVANZAR', idPasoSiguiente: 'siguiente' }).data.idPasoSiguiente).to.equal('siguiente');
  });
  it('respeta primer y último paso', () => {
    expect(() => prepare(control, { accion: 'RETROCEDER' })).to.throw('paso anterior');
    expect(() => prepare(control, { accion: 'FINALIZAR' })).to.throw('finalizar');
    expect(prepare(control, { accion: 'FINALIZAR' }, { ...care, pasoFinal: true }).data.accion).to.equal('FINALIZAR');
  });
  it('selecciona un predecesor real y rechaza ejecuciones ajenas en una convergencia', () => {
    const detail = { ...care, puedeRetroceder: true, anteriores: [
      { idConsultaProcedimientoPaso: 'anterior-a' }, { idConsultaProcedimientoPaso: 'anterior-b' }] };
    expect(() => prepare(control, { accion: 'RETROCEDER' }, detail)).to.throw('Selecciona');
    expect(() => prepare(control, { accion: 'RETROCEDER', idConsultaProcedimientoPasoAnterior: 'ajena' }, detail)).to.throw();
    expect(prepare(control, { accion: 'RETROCEDER', idConsultaProcedimientoPasoAnterior: 'anterior-b' }, detail)
      .data.idConsultaProcedimientoPasoAnterior).to.equal('anterior-b');
    expect(() => prepare(control, { accion: 'RETROCEDER', idConsultaProcedimientoPasoAnterior: 'ajena' },
      { ...detail, anteriores: detail.anteriores.slice(0, 1) })).to.throw();
  });
  it('rechaza detalle obsoleto de otra consulta y asignaciones ajenas', () => {
    expect(() => prepare(control, {}, { ...care, idConsulta: 'otra' })).to.throw('bandeja');
    expect(() => control.prepararAtencion(session, 'ajena', care, values())).to.throw('asignación');
    expect(() => prepare(control, { accion: 'BORRAR' })).to.throw('acción disponible');
  });
});
