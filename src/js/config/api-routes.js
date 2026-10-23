import {
  isUuid, isCalendarDate, orderedDates, restRange,
  tipoDocumentoDto, clinicaDto, consultaDto, arrayOf
} from '../control/rest-validators.js';

// Código REST y contrato contrastados en esta revisión, sin inferir rutas de JPA.
const source = 'https://github.com/Fernando-rtx/Galenos/blob/e4edd6c6da3baa0988182d60f48cb9eccfd54e93/docs/api-contract.md';

function list(path, validateDto, query = {}, validateQuery) {
  return {
    method: 'GET', path, response: 'json', successStatuses: [200],
    pagination: { firstParam: 'first', maxParam: 'max', totalHeader: 'Total-registros', requireTotal: true },
    validateRange: restRange, validateResponse: arrayOf(validateDto), query, validateQuery
  };
}

function detail(path, validateDto, query = {}) {
  return { method: 'GET', path, response: 'json', successStatuses: [200], validateId: isUuid, validateResponse: validateDto, query };
}

function readOnly(operations) {
  return { status: 'verified', source, credentials: 'omit', operations };
}

function freezeTree(value) {
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => freezeTree(value[key]));
    Object.freeze(value);
  }
  return value;
}

const clinicQuery = { idClinica: { required: true, validate: isUuid } };

const routes = {
  tipoDocumento: readOnly({
    findRange: list('v1/tipo_documento', tipoDocumentoDto),
    findById: detail('v1/tipo_documento/{id}', tipoDocumentoDto)
  }),
  clinica: readOnly({ findRange: list('v1/clinica', clinicaDto) }),
  consulta: readOnly({
    findRange: list('v1/consulta', consultaDto, Object.assign({}, clinicQuery, {
      fechaDesde: { validate: isCalendarDate }, fechaHasta: { validate: isCalendarDate },
      idPersonaRol: { validate: isUuid }
    }), orderedDates),
    findById: detail('v1/consulta/{id}', consultaDto, clinicQuery)
  })
};

// Entidades/DAO Java revisados; no existe recurso ni DTO REST publicado.
// Solo se registran claves del cliente: nunca se derivan URLs de nombres JPA.
[
  'consultaProcedimiento', 'consultaProcedimientoPaso', 'documento', 'examen',
  'examenResultado', 'examenTipoExamen', 'medioContacto', 'ordenExamen', 'persona',
  'personaRol', 'procedimiento', 'procedimientoPaso', 'procedimientoPasoExamen',
  'procedimientoPasoSecuencia', 'rol', 'tipoExamen', 'tipoMedioContacto'
].forEach(resource => {
  routes[resource] = {
    status: 'pending', source,
    reason: 'Entidad y DAO Java verificados; recurso y DTO REST pendientes de Fernando.',
    operations: {}
  };
});

export const API_ROUTES = freezeTree(routes);
