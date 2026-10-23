import { expect } from 'chai';
import sinon from 'sinon';
import DashboardControl from '../../src/js/control/DashboardControl.js';
import { DefaultResponse, DefaultError } from '../../src/js/index.js';
import { CLINICAS, CONSULTAS } from '../helpers/rest-fixtures.js';
import { consultaCardModel, errorMessage, formatDate } from '../../src/js/boundary/pages/dashboard-presentation.js';
import { rejection } from '../helpers/http-fixture.js';

// Datos exclusivamente sintéticos. Estos DAO son dobles, no integración con REST.
const response = (datos, totalDatos = null) => new DefaultResponse({ datos, totalDatos, status: 200 });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('Dashboard Control — coordinación sin DOM ni Fetch', () => {
  let clinicaDAO, consultaDAO, control;
  beforeEach(async () => {
    clinicaDAO = { findRange: sinon.stub().resolves(response(CLINICAS, CLINICAS.length)) };
    consultaDAO = {
      findRange: sinon.stub().resolves(response(CONSULTAS.slice(0, 2), 5)),
      findById: sinon.stub().resolves(response(CONSULTAS[0]))
    };
    control = new DashboardControl({ clinicaDAO, consultaDAO, pageSize: 2 });
    await control.loadClinicas();
  });
  afterEach(() => control.destroy());

  it('exige dependencias DAO y una paginación válida', () => {
    expect(() => new DashboardControl({})).to.throw(DefaultError);
    expect(() => new DashboardControl({ clinicaDAO, consultaDAO, pageSize: 0 })).to.throw(DefaultError);
  });

  it('no consulta antes de seleccionar una clínica recibida por REST', async () => {
    sinon.assert.notCalled(consultaDAO.findRange);
    expect(await rejection(control.selectClinica('no-disponible'))).to.be.instanceOf(DefaultError);
    sinon.assert.notCalled(consultaDAO.findRange);
  });

  it('carga todas las páginas de clínicas para no ocultar opciones después de la primera', async () => {
    clinicaDAO.findRange.reset();
    clinicaDAO.findRange.onFirstCall().resolves(response([CLINICAS[0]], 2));
    clinicaDAO.findRange.onSecondCall().resolves(response([CLINICAS[1]], 2));
    await control.loadClinicas();
    expect(clinicaDAO.findRange.secondCall.args.slice(0, 2)).to.deep.equal([1, 2]);
    expect(control.state.clinicas).to.deep.equal(CLINICAS);
  });

  it('no entra en bucle si el dataset de clínicas se vacía entre páginas', async () => {
    clinicaDAO.findRange.resolves(response([], 3));
    await control.loadClinicas();
    expect(control.state.clinicas).to.deep.equal([]);
    expect(control.state.clinicasStatus).to.equal('ready');
  });

  it('selecciona clínica y conserva datos, total y estado de carga separados', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    const [first, max, options] = consultaDAO.findRange.firstCall.args;
    expect([first, max]).to.deep.equal([0, 2]);
    expect(options.query).to.deep.equal({ idClinica: CLINICAS[0].idClinica });
    expect(options.signal).to.be.instanceOf(AbortSignal);
    expect(control.state.totalDatos).to.equal(5);
    expect(control.state.consultas).to.have.lengthOf(2);
    expect(control.state.consultasStatus).to.equal('ready');
  });

  it('aplica filtros y reinicia first conservando clínica y fechas UTC originales', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    await control.setPage(2);
    const filtros = { fechaDesde: '2026-10-22', fechaHasta: '2026-10-23', idPersonaRol: CONSULTAS[0].idPersonaRol };
    await control.setFilters(filtros);
    expect(consultaDAO.findRange.lastCall.args.slice(0, 2)).to.deep.equal([0, 2]);
    expect(consultaDAO.findRange.lastCall.args[2].query).to.deep.equal({ ...filtros, idClinica: CLINICAS[0].idClinica });
    expect(control.state.consultas[0].fechaInicio).to.equal(CONSULTAS[0].fechaInicio);
    filtros.fechaDesde = '2000-01-01';
    expect(control.state.filtros.fechaDesde).to.equal('2026-10-22');
  });

  it('rechaza filtros ajenos, UUID y fechas inválidos antes de usar los DAO', async () => {
    for (const filters of [{ estado: 'inventado' }, { fechaDesde: null }, { idPersonaRol: 'invalido' },
      { fechaDesde: '2026-10-23', fechaHasta: '2026-10-22' }, { fechaDesde: '2026-02-29' }]) {
      expect(await rejection(control.setFilters(filters))).to.be.instanceOf(DefaultError);
    }
    sinon.assert.notCalled(consultaDAO.findRange);
  });

  it('representa vacío con total cero y páginas vacías con su total real', async () => {
    consultaDAO.findRange.resolves(response([], 0));
    await control.selectClinica(CLINICAS[0].idClinica);
    expect(control.state.consultas).to.deep.equal([]);
    expect(control.state.totalDatos).to.equal(0);
    consultaDAO.findRange.resolves(response([], 5));
    await control.setPage(6);
    expect(control.state.totalDatos).to.equal(5);
    expect(control.state.consultasStatus).to.equal('ready');
  });

  it('limpia filtros, detalle y solicitudes al cambiar de clínica o quitar la selección', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    await control.setFilters({ fechaDesde: '2026-10-22' });
    await control.selectConsulta(CONSULTAS[0].idConsulta);
    const signal = consultaDAO.findById.lastCall.args[1].signal;
    await control.selectClinica(CLINICAS[1].idClinica);
    expect(signal.aborted).to.equal(true);
    expect(control.state.filtros).to.deep.equal({});
    expect(control.state.detalle).to.equal(null);
    const count = consultaDAO.findRange.callCount;
    await control.selectClinica(null);
    expect(control.state.idClinica).to.equal(null);
    expect(control.state.consultasStatus).to.equal('idle');
    expect(consultaDAO.findRange.callCount).to.equal(count);
  });

  it('consulta detalle únicamente de la página actual y envía solo idClinica como contexto', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    await control.setFilters({ fechaDesde: '2026-10-22' });
    await control.selectConsulta(CONSULTAS[0].idConsulta);
    expect(consultaDAO.findById.lastCall.args[1].query).to.deep.equal({ idClinica: CLINICAS[0].idClinica });
    expect(control.state.detalle).to.deep.equal(CONSULTAS[0]);
    expect(await rejection(control.selectConsulta('ajena'))).to.be.instanceOf(DefaultError);
    sinon.assert.calledOnce(consultaDAO.findById);
  });

  ['clinic', 'filters', 'page'].forEach(change => {
    it(`cancela e ignora una respuesta obsoleta al cambiar ${change}, incluso si el DAO ignora AbortSignal`, async () => {
      const old = deferred();
      consultaDAO.findRange.onFirstCall().returns(old.promise);
      const pending = control.selectClinica(CLINICAS[0].idClinica);
      const signal = consultaDAO.findRange.firstCall.args[2].signal;
      const latestRows = [CONSULTAS[1]];
      consultaDAO.findRange.onSecondCall().resolves(response(latestRows, 1));
      if (change === 'clinic') await control.selectClinica(CLINICAS[1].idClinica);
      if (change === 'filters') await control.setFilters({ fechaDesde: '2026-10-22' });
      if (change === 'page') await control.setPage(2);
      expect(signal.aborted).to.equal(true);
      old.resolve(response([CONSULTAS[0]], 999));
      await pending;
      expect(control.state.consultas).to.deep.equal(latestRows);
      expect(control.state.totalDatos).to.equal(1);
    });
  });

  it('ignora errores tardíos de una lista cancelada', async () => {
    const old = deferred();
    consultaDAO.findRange.onFirstCall().returns(old.promise);
    const pending = control.selectClinica(CLINICAS[0].idClinica);
    await control.selectClinica(CLINICAS[1].idClinica);
    old.reject(new Error('Error tardío sintético'));
    await pending;
    expect(control.state.consultasStatus).to.equal('ready');
    expect(control.state.consultasError).to.equal(null);
  });

  it('no publica filas de la clínica anterior al notificar una selección nueva', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    consultaDAO.findRange.returns(new Promise(() => {}));
    const seen = [];
    const unsubscribe = control.subscribe(state => seen.push(state));
    control.selectClinica(CLINICAS[1].idClinica);
    expect(seen.filter(state => state.idClinica === CLINICAS[1].idClinica).every(state => state.consultas.length === 0)).to.equal(true);
    unsubscribe();
  });

  it('cancela detalle al cambiar lista e ignora su respuesta tardía', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    const old = deferred();
    consultaDAO.findById.returns(old.promise);
    const pending = control.selectConsulta(CONSULTAS[0].idConsulta);
    const signal = consultaDAO.findById.firstCall.args[1].signal;
    await control.setPage(2);
    old.resolve(response(CONSULTAS[0]));
    await pending;
    expect(signal.aborted).to.equal(true);
    expect(control.state.detalle).to.equal(null);
  });

  it('mantiene únicamente el último detalle seleccionado', async () => {
    await control.selectClinica(CLINICAS[0].idClinica);
    const old = deferred();
    consultaDAO.findById.onFirstCall().returns(old.promise);
    consultaDAO.findById.onSecondCall().resolves(response(CONSULTAS[1]));
    const pending = control.selectConsulta(CONSULTAS[0].idConsulta);
    await control.selectConsulta(CONSULTAS[1].idConsulta);
    old.resolve(response(CONSULTAS[0]));
    await pending;
    expect(control.state.detalle).to.deep.equal(CONSULTAS[1]);
  });

  ['clinicas', 'consultas', 'detalle'].forEach(resource => {
    it(`conserva DefaultError de ${resource} y permite reintentar`, async () => {
      const error = new DefaultError({ type: 'http', code: 'HTTP_ERROR', status: 500, message: 'Error sintético' });
      if (resource !== 'clinicas') await control.selectClinica(CLINICAS[0].idClinica);
      const stub = resource === 'clinicas' ? clinicaDAO.findRange : resource === 'detalle' ? consultaDAO.findById : consultaDAO.findRange;
      const action = () => resource === 'clinicas' ? control.loadClinicas() : resource === 'detalle' ? control.selectConsulta(CONSULTAS[0].idConsulta) : control.loadConsultas();
      stub.rejects(error);
      await action();
      expect(control.state[`${resource}Status`]).to.equal('error');
      expect(control.state[`${resource}Error`]).to.equal(error);
      stub.resolves(response(resource === 'clinicas' ? CLINICAS : resource === 'detalle' ? CONSULTAS[0] : CONSULTAS.slice(0, 2), 2));
      await action();
      expect(control.state[`${resource}Status`]).to.equal('ready');
    });
  });

  it('publica snapshots inmutables y permite retirar suscripciones', async () => {
    const listener = sinon.spy();
    const unsubscribe = control.subscribe(listener);
    unsubscribe();
    await control.selectClinica(CLINICAS[0].idClinica);
    sinon.assert.calledOnce(listener);
    expect(Object.isFrozen(control.state.consultas[0])).to.equal(true);
    expect(() => { control.state.idClinica = 'otra'; }).to.throw(TypeError);
  });

  it('destruir la página cancela solicitudes y evita notificar respuestas posteriores', async () => {
    const old = deferred();
    consultaDAO.findRange.returns(old.promise);
    const pending = control.selectClinica(CLINICAS[0].idClinica);
    const listener = sinon.spy();
    control.subscribe(listener);
    control.destroy();
    old.resolve(response(CONSULTAS, 5));
    await pending;
    expect(consultaDAO.findRange.firstCall.args[2].signal.aborted).to.equal(true);
    sinon.assert.calledOnce(listener);
  });

  it('evita una paginación inválida y exige clínica antes de cargar una página', async () => {
    for (const [first, max] of [[-1, 2], [0, 0], [2147483648, 1], [0, 1]]) {
      expect(await rejection(control.setPage(first, max))).to.be.instanceOf(DefaultError);
    }
    sinon.assert.notCalled(consultaDAO.findRange);
  });
});

describe('Presentación del dashboard y modelo compartido', () => {
  it('entrega solo los seis campos aceptados, preservando null y cadenas UTC', () => {
    const consulta = { ...CONSULTAS[0], personaNombre: null, fechaFin: null };
    const model = consultaCardModel(consulta);
    expect(Object.keys(model)).to.deep.equal(['idConsulta', 'personaNombre', 'rolNombre', 'clinicaNombre', 'fechaInicio', 'fechaFin']);
    expect(model.personaNombre).to.equal(null);
    expect(model.fechaFin).to.equal(null);
    expect(model.fechaInicio).to.equal(consulta.fechaInicio);
    expect(formatDate(null)).to.equal('Sin especificar');
    expect(formatDate(consulta.fechaInicio)).to.include('UTC');
  });

  [
    [{ type: 'connection', code: 'TIMEOUT' }, 'tardó demasiado'],
    [{ type: 'connection', code: 'NETWORK_ERROR' }, 'conectar'],
    [{ type: 'validation', code: 'INVALID_QUERY' }, 'filtros'],
    [{ type: 'validation', code: 'BASE_URL_REQUIRED' }, 'configurada'],
    [{ type: 'processing', code: 'INVALID_RESPONSE' }, 'formato'],
    [{ type: 'http', status: 404 }, 'clínica seleccionada'],
    [{ type: 'http', status: 403 }, 'no permite'],
    [{ type: 'http', status: 422 }, 'parámetros'],
    [{ type: 'http', status: 500 }, 'Intenta nuevamente']
  ].forEach(([error, text]) => {
    it(`presenta un mensaje seguro para ${JSON.stringify(error)}`, () => {
      expect(errorMessage({ ...error, message: 'SQL o contenido interno sintético' })).to.include(text);
      expect(errorMessage(error)).not.to.include('SQL');
    });
  });
});
