import { expect } from 'chai';
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
  try {
    await work();
    throw new Error('Se esperaba error');
  } catch (e) {
    expect(e.type).to.equal(type);
    if (status) expect(e.status).to.equal(status);
  }
}
describe('GT02: controles con fixtures sintéticos', () => {
  it('exige tipo y documento no vacío', () => {
    for (const [id, valor] of [
      ['', 'ABC'],
      [uuid(1), ''],
      [uuid(1), '  '],
      [uuid(99), 'ABC'],
    ])
      expect(() => validarDocumento([tipo], id, valor)).to.throw();
    expect(validarDocumento([tipo], uuid(1), ' ABC ').valor).to.equal('ABC');
  });
  it('rechaza fechas inexistentes, incompletas e invertidas', () => {
    for (const [a, b] of [
      ['', ''],
      ['2026-02-30', '2026-03-01'],
      ['2026-11-12', '2026-11-11'],
      ['2026-1-01', '2026-11-11'],
    ])
      expect(() => validarRango(a, b)).to.throw();
    expect(() => validarRango('2026-11-11', '2026-11-11')).not.to.throw();
  });
  it('obtiene varias asignaciones y cierra la sesión antes de descartar el contexto', async () => {
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
  it('no acepta un contexto de paciente como empleado ni una asignación corrupta', async () => {
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
  it('cancelación no restaura la identidad', async () => {
    const signal = AbortSignal.abort();
    const c = new IdentificacionControl(
      { identificar: async () => ({ data: session() }) },
      'empleado',
    );
    c.tipos = [tipo];
    try {
      await c.entrar(uuid(1), 'EMP', signal);
    } catch (e) {
      expect(e.name).to.equal('AbortError');
    }
    expect(c.session).to.equal(null);
  });
  it('impide clínica ajena antes de Fetch y admite vacío y múltiples', async () => {
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
  it('HU3/HU4 consume copia del contexto y no permite asignación ajena', async () => {
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
describe('GT02: transporte Fetch simulado', () => {
  it('distingue desconexión y reconexión sin convertirlo en lista vacía', async () => {
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
    it(`maneja HTTP ${status} sin mostrar trazas`, async () => {
      const http = new IdentidadAcademicaService({
        baseUrl: 'http://localhost/',
        fetchImpl: async () => new Response('SQL java.internal.trace', { status }),
      });
      await reject(() => http.identificar('empleado', {}), 'http', status);
      try {
        await http.identificar('empleado', {});
      } catch (e) {
        expect(e.message).not.to.include('SQL');
      }
    });
  it('pagína catálogo y oculta tipos inactivos', async () => {
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
  it('descarga sólo PDF y envía token fuera de URL, sin caché ni cookies', async () => {
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
  it('propaga AbortError', async () => {
    const http = new IdentidadAcademicaService({
      baseUrl: 'http://localhost/',
      fetchImpl: async () => {
        throw new DOMException('cancelado', 'AbortError');
      },
    });
    try {
      await http.tipos();
    } catch (e) {
      expect(e.name).to.equal('AbortError');
    }
  });
});
