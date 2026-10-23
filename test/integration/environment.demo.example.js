import { createApiConfig, TipoDocumentoDAO, ClinicaDAO, ConsultaDAO } from '../../src/js/index.js';

// Copiar como environment.local.js SOLO para el demo oficial sintético de Fernando.
// Completar baseUrl con ./demo info. No emplear una base clínica real.
export const config = createApiConfig({ baseUrl: null });
if (!config.baseUrl) throw new Error('Completa baseUrl con la conexión pública de ./demo info.');

const tipos = await new TipoDocumentoDAO({ config }).findRange(0, 1);
const clinicas = await new ClinicaDAO({ config }).findRange(0, 2);
if (tipos.totalDatos !== 2 || clinicas.totalDatos !== 2 || clinicas.datos.length !== 2) {
  throw new Error('El dataset no coincide con los fixtures del demo oficial.');
}
const query = { idClinica: clinicas.datos[0].idClinica };
const consultas = await new ConsultaDAO({ config }).findRange(0, 1, { query });
if (consultas.totalDatos !== 5 || consultas.datos.length !== 1) {
  throw new Error('Se esperaban cinco consultas sintéticas en la primera clínica del demo.');
}

function listCheck(name, first, max, expectedTotal, expectedLength, filters) {
  return { name, first, max, expectedTotal, expectedLength, query: filters };
}

// Los conteos/fechas son expectativas de test/fixtures/* del backend, no respuestas simuladas.
// Todos los UUID se descubren por HTTP o se generan para verificar ausencia con 404.
export const cases = [
  {
    resource: 'tipoDocumento', first: 0, max: 1, id: tipos.datos[0].idTipoDocumento,
    missingId: crypto.randomUUID(), missingStatus: 404,
    listChecks: [
      listCheck('segunda página del catálogo', 1, 1, 2, 1),
      listCheck('página vacía conserva total del catálogo', 2, 1, 2, 0)
    ],
    listErrors: [{ name: 'máximo del demo excedido conserva HTTP 422', first: 0, max: 101, status: 422 }]
  },
  {
    resource: 'clinica', first: 0, max: 1,
    listChecks: [
      listCheck('segunda página de clínicas activas', 1, 1, 2, 1),
      listCheck('página vacía conserva total de clínicas', 2, 1, 2, 0)
    ],
    listErrors: [{ name: 'máximo del demo excedido conserva HTTP 422', first: 0, max: 101, status: 422 }]
  },
  {
    resource: 'consulta', first: 0, max: 1, id: consultas.datos[0].idConsulta, query,
    missingId: crypto.randomUUID(), missingStatus: 404,
    listChecks: [
      listCheck('segunda página de consultas', 1, 1, 5, 1, query),
      listCheck('página vacía conserva total de consultas', 5, 1, 5, 0, query),
      listCheck('límites inclusivos del día clínico', 0, 10, 2, 2,
        { ...query, fechaDesde: '2026-10-22', fechaHasta: '2026-10-22' }),
      listCheck('rango sin coincidencias devuelve lista y total vacíos', 0, 10, 0, 0,
        { ...query, fechaDesde: '2000-01-01', fechaHasta: '2000-01-01' }),
      listCheck('filtro de PersonaRol cuenta el conjunto filtrado', 0, 1, 3, 1,
        { ...query, idPersonaRol: consultas.datos[0].idPersonaRol })
    ],
    listErrors: [{ name: 'máximo del demo excedido conserva HTTP 422', first: 0, max: 101, query, status: 422 }],
    detailErrors: [{ name: 'detalle de otra clínica conserva HTTP 404', id: consultas.datos[0].idConsulta,
      query: { idClinica: clinicas.datos[1].idClinica }, status: 404 }]
  }
];
