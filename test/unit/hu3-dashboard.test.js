import { expect } from 'chai';
import AcademicCareControl, {
  fechaClinica,
  rangoPeriodo,
} from '../../src/js/control/AcademicCareControl.js';
import { arbolHistorial } from '../../src/js/boundary/modelos/historial-presentacion.js';
// Datos sintéticos; estos tests no certifican persistencia PostgreSQL.
const step = (id, estado = 'COMPLETADO') => ({
  idPaso: id,
  idConsultaProcedimientoPaso: `ej-${id}`,
  estado,
  nombre: id,
  valor: `Registro ${id}`,
});
const edge = (from, to) => ({ idPasoOrigen: from, idPasoDestino: to, tipoSecuencia: 'CONTINUAR' });
suite('HU3: fechas clínicas y preparación de solicitudes', () => {
  test('calcula hoy en El Salvador aunque UTC ya sea el día siguiente', () => {
    const now = new Date('2026-12-01T01:00:00Z');
    expect(fechaClinica(now)).to.equal('2026-11-30');
    expect(rangoPeriodo('today', now)).to.deep.equal({
      fechaDesde: '2026-11-30',
      fechaHasta: '2026-11-30',
    });
    expect(rangoPeriodo('past', now)).to.deep.equal({ fechaDesde: '', fechaHasta: '2026-11-29' });
    expect(rangoPeriodo('future', now)).to.deep.equal({ fechaDesde: '2026-12-01', fechaHasta: '' });
  });
  test('utiliza exclusivamente la asignación seleccionada y no mezcla clínica/rol', () => {
    const control = new AcademicCareControl();
    const session = {
      token: 'sintetico',
      contexto: {
        tipo: 'EMPLEADO',
        idPersona: 'persona',
        asignaciones: [
          { idPersonaRol: 'uno', idClinica: 'clinica-a', idRol: 'rol-a' },
          { idPersonaRol: 'dos', idClinica: 'clinica-b', idRol: 'rol-b' },
        ],
      },
    };
    const { query, options } = control.prepararBandeja(session, 'dos', {
      fechaDesde: '2026-11-14',
      fechaHasta: '2026-11-14',
    });
    expect(query).to.include({ idPersona: 'persona', idClinica: 'clinica-b', idRol: 'rol-b' });
    expect(options.headers).to.deep.equal({
      Authorization: 'Bearer sintetico',
      'X-Persona-Rol': 'dos',
    });
    expect(() => control.prepararBandeja(session, 'ajena', {})).to.throw('asignación');
    for (const dates of [
      { fechaDesde: '2026-02-30' },
      { fechaDesde: '2026-12-01', fechaHasta: '2026-11-01' },
    ])
      expect(() => control.prepararBandeja(session, 'uno', dates)).to.throw();
  });
  test('solo selecciona consultas de la página vigente sin cambiar estado clínico', () => {
    const control = new AcademicCareControl();
    const consulta = { idConsulta: 'propia', estadoPasoActual: 'PENDIENTE' };
    control.queue = [consulta];
    expect(control.seleccionarConsulta('propia')).to.equal(consulta);
    expect(consulta.estadoPasoActual).to.equal('PENDIENTE');
    control.queue = [];
    expect(() => control.seleccionarConsulta('propia')).to.throw('bandeja actual');
  });
});
suite('HU3: jerarquía de ejecuciones persistidas (fixture sintético)', () => {
  test('representa bifurcaciones y convergencias sin repetir el registro compartido', () => {
    const tree = arbolHistorial({
      pasos: ['a', 'b', 'c', 'd'].map((id) => step(id)),
      secuencias: [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')],
    });
    expect(tree).to.have.length(1);
    expect(tree[0].children.map((n) => n.id)).to.deep.equal(['b', 'c']);
    expect(tree[0].children[0].children[0].ejecuciones[0].valor).to.equal('Registro d');
    expect(tree[0].children[1].children[0].referencia).to.equal(true);
  });
  test('conserva repeticiones y retrocesos, pero nunca presenta pasos futuros como realizados', () => {
    const repeated = {
      ...step('a', 'RETROCEDIDO'),
      idConsultaProcedimientoPaso: 'segunda',
      fechaInicio: '2026-11-14T10:00:00Z',
    };
    const tree = arbolHistorial({
      pasos: [step('a'), repeated, step('futuro', 'PENDIENTE'), step('actual', 'EN_CURSO')],
      secuencias: [edge('a', 'futuro')],
    });
    expect(tree).to.have.length(1);
    expect(tree[0].ejecuciones).to.have.length(2);
    expect(tree[0].children).to.deep.equal([]);
  });
  test('termina con ciclos registrados y conserva datos sin inventar un orden lineal', () => {
    const tree = arbolHistorial({
      pasos: [step('a'), step('b')],
      secuencias: [edge('a', 'b'), edge('b', 'a')],
    });
    expect(tree[0].children[0].children[0]).to.include({ referencia: true, ciclo: true });
  });
  test('no cruza procedimientos al construir los árboles', () => {
    expect(
      arbolHistorial({ pasos: [step('a')], secuencias: [edge('a', 'otro-procedimiento')] })[0]
        .children,
    ).to.deep.equal([]);
  });
});
