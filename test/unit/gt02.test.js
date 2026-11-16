import { expect } from 'chai';
import { rejection } from '../helpers/http-fixture.js';
import { IdentidadAcademicaService } from '../../src/js/control/IdentidadAcademicaService.js';
import {
  IdentificacionControl,
  validarDocumento,
} from '../../src/js/control/IdentificacionControl.js';
import { BusquedaCitasControl, validarRango } from '../../src/js/control/BusquedaCitasControl.js';
import { CitasPacienteService } from '../../src/js/control/CitasPacienteService.js';
import {
  conectarEmpleado,
  obtenerContextoEmpleado,
  obtenerAsignacionEmpleado,
  solicitudEmpleado,
} from '../../src/js/control/contexto-empleado.js';
// Todos los datos de este archivo son sintéticos; Fetch simulado, sin PostgreSQL.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tipo = { idTipoDocumento: uuid(1), nombre: 'Documento sintético', indicaciones: null, expresionRegular: null, activo: true };
const contexto = {
  tipo: 'EMPLEADO',
  idPersona: uuid(2),
  personaNombre: 'Empleado ficticio',
  zonaHoraria: 'America/El_Salvador',
  asignaciones: [
    {
      idPersonaRol: uuid(3),
      idRol: uuid(4),
      rolNombre: 'Doctor ficticio',
      idClinica: uuid(5),
      clinicaNombre: 'Clínica ficticia',
    },
    {
      idPersonaRol: uuid(6),
      idRol: uuid(7),
      rolNombre: 'Recepción ficticia',
      idClinica: uuid(8),
      clinicaNombre: 'Otra clínica ficticia',
    },
  ],
};
const session = () => ({
  token: 'A'.repeat(43),
  expiraEn: '2026-11-11T20:00:00Z',
  contexto: structuredClone(contexto),
});
async function reject(work, type, status) {
  const error = await rejection(work());
  expect(error.type).to.equal(type);
  if (status) expect(error.status).to.equal(status);
  return error;
}
suite('GT02: controles con fixtures sintéticos', () => {
  teardown(() => conectarEmpleado(null));
  test('valida el formato del tipo seleccionado sin convertir Pasaporte en DUI', () => {
    const dui = { ...tipo, expresionRegular: '^[0-9]{8}-[0-9]$', nombre: 'DUI' };
    const passport = { ...tipo, idTipoDocumento: uuid(9), nombre: 'Pasaporte', expresionRegular: '^[A-Za-z0-9]+$' };
    expect(validarDocumento([dui, passport], dui.idTipoDocumento, '12345678-9').valor).to.equal('12345678-9');
    expect(() => validarDocumento([dui, passport], passport.idTipoDocumento, '12345678-9')).to.throw('Pasaporte');
    expect(() => validarDocumento([dui], dui.idTipoDocumento, '123456789')).to.throw('formato');
    // No reinterpretar sintaxis exclusiva de Java como un rechazo del navegador.
    expect(validarDocumento([{ ...tipo, expresionRegular: '^\\p{L}+$' }], tipo.idTipoDocumento, 'Ána').valor).to.equal('Ána');
  });
  test('comparte solo asignaciones propias y limpia la selección al cerrar sesión', async () => {
    const c = new IdentificacionControl({ identificar: async () => ({ data: session() }), cerrar: async () => {} }, 'empleado');
    c.tipos = [tipo]; const reasons = []; const unsubscribe = c.subscribe((reason) => reasons.push(reason));
    await c.entrar(tipo.idTipoDocumento, 'EMP');
    conectarEmpleado(c);
    c.seleccionarAsignacion(uuid(6)); expect(c.asignacionActiva).to.equal(uuid(6));
    expect(obtenerAsignacionEmpleado()).to.deep.equal(contexto.asignaciones[1]);
    const copied = obtenerAsignacionEmpleado(); copied.idClinica = uuid(99);
    expect(obtenerAsignacionEmpleado().idClinica).to.equal(uuid(8));
    expect(() => c.seleccionarAsignacion(uuid(99))).to.throw('asignación');
    expect(c.asignacionActiva).to.equal(uuid(6));
    await c.salir(); expect(c.asignacionActiva).to.equal(null); expect(c.session).to.equal(null);
    expect(obtenerAsignacionEmpleado()).to.equal(null);
    expect(reasons).to.include('asignacion'); unsubscribe();
  });
  test('rechaza un contexto actualizado de otra persona sin reemplazar la sesión', async () => {
    const c = new IdentificacionControl({ contexto: async () => ({ data: { ...contexto, idPersona: uuid(99) } }) }, 'empleado');
    c.session = session(); const previous = c.session.contexto;
    await reject(() => c.actualizar(), 'processing'); expect(c.session.contexto).to.equal(previous);
  });
  test('no restaura un contexto tardío después del cierre de sesión', async () => {
    let resolve;
    const c = new IdentificacionControl({ contexto: () => new Promise((done) => { resolve = done; }), cerrar: async () => {} }, 'empleado');
    c.session = session(); c.asignacionActiva = uuid(3);
    const pending = c.actualizar(); await c.salir(); resolve({ data: contexto });
    expect((await rejection(pending)).name).to.equal('AbortError'); expect(c.session).to.equal(null);
  });
  test('borra identidad y selección si no puede confirmar el cierre por desconexión', async () => {
    const error = { type: 'network' };
    const c = new IdentificacionControl({ cerrar: async () => { throw error; } }, 'empleado');
    c.session = session(); c.asignacionActiva = uuid(3);
    expect(await rejection(c.salir())).to.equal(error);
    expect(c.session).to.equal(null); expect(c.asignacionActiva).to.equal(null);
  });
  for (const status of [401, 403]) test(`descarta el contexto al revalidar con HTTP ${status}`, async () => {
    const c = new IdentificacionControl({ contexto: async () => { throw { status }; } }, 'empleado');
    c.session = session(); c.asignacionActiva = uuid(3);
    expect((await rejection(c.actualizar())).status).to.equal(status);
    expect(c.session).to.equal(null); expect(c.asignacionActiva).to.equal(null);
  });
  test('exige tipo y documento no vacío', () => {
    for (const [id, valor] of [
      ['', 'ABC'],
      [uuid(1), ''],
      [uuid(1), '  '],
      [uuid(99), 'ABC'],
    ])
      expect(() => validarDocumento([tipo], id, valor)).to.throw();
    expect(validarDocumento([tipo], uuid(1), ' ABC ').valor).to.equal('ABC');
  });
  test('rechaza fechas inexistentes, incompletas e invertidas', () => {
    for (const [a, b] of [
      ['', ''],
      ['2026-02-30', '2026-03-01'],
      ['2026-11-12', '2026-11-11'],
      ['2026-1-01', '2026-11-11'],
    ])
      expect(() => validarRango(a, b)).to.throw();
    expect(() => validarRango('2026-11-11', '2026-11-11')).not.to.throw();
  });
  test('obtiene varias asignaciones y cierra la sesión antes de descartar el contexto', async () => {
    let closed;
    const c = new IdentificacionControl(
      {
        identificar: async () => ({ data: session() }),
        cerrar: async (...args) => {
          closed = args;
        },
      },
      'empleado',
    );
    c.tipos = [tipo];
    const context = await c.entrar(uuid(1), 'EMP');
    expect(context.asignaciones).to.have.length(2);
    expect(c.asignacionActiva).to.equal(uuid(3));
    await c.salir();
    expect(closed.slice(0, 2)).to.deep.equal(['empleado', 'A'.repeat(43)]);
    expect(c.session).to.equal(null);
  });
  test('no acepta un contexto de paciente como empleado ni una asignación corrupta', async () => {
    const data = session();
    data.contexto.tipo = 'PACIENTE';
    const c = new IdentificacionControl({ identificar: async () => ({ data }) }, 'empleado');
    c.tipos = [tipo];
    await reject(() => c.entrar(uuid(1), 'EMP'), 'processing');
    expect(c.session).to.equal(null);
    data.contexto.tipo = 'EMPLEADO';
    data.contexto.asignaciones[0].idPersonaRol = 'ajeno';
    await reject(() => c.entrar(uuid(1), 'EMP'), 'processing');
  });
  test('cancelación no restaura la identidad', async () => {
    const signal = AbortSignal.abort();
    const c = new IdentificacionControl(
      { identificar: async () => ({ data: session() }) },
      'empleado',
    );
    c.tipos = [tipo];
    const error = await rejection(c.entrar(uuid(1), 'EMP', signal));
    expect(error.name).to.equal('AbortError');
    expect(c.session).to.equal(null);
  });
  test('impide clínica ajena antes de Fetch y admite vacío y múltiples', async () => {
    let calls = 0;
    const identification = { session: session() };
    const c = new BusquedaCitasControl(identification, {
      buscar: async () => {
        calls++;
        return { data: calls === 1 ? [] : [{ idConsulta: uuid(10) }, { idConsulta: uuid(11) }] };
      },
    });
    await reject(() => c.buscar(uuid(99), '2026-11-11', '2026-11-11', 0), 'validation');
    expect(calls).to.equal(0);
    expect((await c.buscar(uuid(5), '2026-11-11', '2026-11-11', 0)).data).to.have.length(0);
    expect((await c.buscar(uuid(5), '2026-11-11', '2026-11-11', 0)).data).to.have.length(2);
  });
  test('HU3/HU4 consume copia del contexto y no permite asignación ajena', async () => {
    const c = { session: session(), http: { request: async (_path, opts) => opts } };
    conectarEmpleado(c);
    const copy = obtenerContextoEmpleado();
    copy.asignaciones.length = 0;
    expect(obtenerContextoEmpleado().asignaciones).to.have.length(2);
    try {
      await solicitudEmpleado('v2/consulta', uuid(99));
      throw new Error('Debió fallar');
    } catch (e) {
      expect(e.message).to.include('asignación');
    }
    const opts = await solicitudEmpleado('v2/consulta', uuid(3));
    expect(opts.asignacion).to.equal(uuid(3));
    expect(opts.token).to.equal(c.session.token);
    conectarEmpleado(null);
    expect(obtenerContextoEmpleado()).to.equal(null);
  });
});
suite('GT02: transporte Fetch simulado', () => {
  test('muestra el error público de identificación sin mencionar campos de citas', async () => {
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () => Response.json({ mensaje: 'Formato de documento inválido' }, { status: 422 }),
    });
    try {
      await http.identificar('empleado', { idTipoDocumento: uuid(1), valor: 'ABC-123' });
      throw new Error('Se esperaba el rechazo de formato');
    } catch (error) {
      expect(error.status).to.equal(422);
      expect(error.message).to.equal('Formato de documento inválido');
    }
  });
  test('no muestra mensajes internos aunque lleguen dentro de JSON', async () => {
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () => Response.json({ mensaje: 'SQL java.internal.trace' }, { status: 422 }),
    });
    try {
      await http.identificar('empleado', {});
      throw new Error('Se esperaba un error HTTP');
    } catch (error) {
      expect(error.status).to.equal(422);
      expect(error.message).to.equal('Revisa el tipo y el formato del número de documento.');
    }
  });
  test('distingue desconexión y reconexión sin convertirlo en lista vacía', async () => {
    let online = false;
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () => {
        if (!online) throw new TypeError('sin backend');
        return Response.json([tipo], { headers: { 'Total-registros': '1' } });
      },
    });
    await reject(() => http.tipos(), 'network');
    online = true;
    expect(await http.tipos()).to.deep.equal([tipo]);
  });
  for (const status of [400, 401, 403, 404, 409, 422, 500])
    test(`maneja HTTP ${status} sin mostrar trazas`, async () => {
      const http = new IdentidadAcademicaService({
        baseUrl: 'http://localhost/',
        fetchImpl: async () => new Response('SQL java.internal.trace', { status }),
      });
      const error = await reject(() => http.identificar('empleado', {}), 'http', status);
      expect(error.message).not.to.include('SQL');
    });
  test('pagína catálogo y oculta tipos inactivos', async () => {
    let count = 0;
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () =>
        Response.json(count++ ? [{ ...tipo, activo: false }] : [tipo], {
          headers: { 'Total-registros': '2' },
        }),
    });
    expect(await http.tipos()).to.deep.equal([tipo]);
    expect(count).to.equal(2);
  });
  test('descarga sólo PDF y envía token fuera de URL, sin caché ni cookies', async () => {
    let captured;
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async (url, opts) => {
        captured = { url, opts };
        return new Response('%PDF-1.4\nsynthetic', {
          headers: { 'Content-Type': 'application/pdf' },
        });
      },
    });
    const blob = await new CitasPacienteService(http).ticket('token', uuid(9));
    expect(blob.size).to.be.greaterThan(5);
    expect(captured.opts.headers.Authorization).to.equal('Bearer token');
    expect(captured.url.search).to.equal('');
    expect(captured.opts.cache).to.equal('no-store');
    expect(captured.opts.credentials).to.equal('omit');
    http.fetch = async () =>
      new Response('not pdf', { headers: { 'Content-Type': 'application/pdf' } });
    await reject(() => new CitasPacienteService(http).ticket('token', uuid(9)), 'processing');
  });
  test('propaga AbortError', async () => {
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () => {
        throw new DOMException('cancelado', 'AbortError');
      },
    });
    const error = await rejection(http.tipos());
    expect(error.name).to.equal('AbortError');
  });
});
