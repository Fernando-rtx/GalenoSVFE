import { API_ROUTES } from './api-routes.js';
import { isUuid, restRange, arrayOf } from '../control/rest-validators.js';

const source = 'docs/api-gestion-v2.md';
const schemas = {
  clinica: ['idClinica', 'nombre', 'tipo', 'comentarios', 'activo'],
  rol: ['idRol', 'nombre', 'observaciones', 'activo'],
  tipoDocumento: ['idTipoDocumento', 'nombre', 'indicaciones', 'expresionRegular', 'activo'],
  tipoMedioContacto: ['idTipoMedioContacto', 'nombre', 'indicaciones', 'expresionRegular', 'activo'],
  tipoExamen: ['idTipoExamen', 'nombre', 'observaciones', 'activo']
};
const paths = { clinica: 'clinica', rol: 'rol', tipoDocumento: 'tipo_documento', tipoMedioContacto: 'tipo_medio_contacto', tipoExamen: 'tipo_examen' };
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function dto(fields) {
  return value => object(value) && Object.keys(value).length === fields.length && fields.every((key, index) =>
    Object.hasOwn(value, key) && (index === 0 ? isUuid(value[key]) : value[key] === null || typeof value[key] === (key === 'activo' ? 'boolean' : 'string')));
}
const routes = { ...API_ROUTES };
for (const [resource, fields] of Object.entries(schemas)) {
  const path = `v2/${paths[resource]}`;
  const validateResponse = dto(fields);
  const validateData = value => object(value) && Object.keys(value).every(key => fields.slice(1).includes(key)) &&
    fields.slice(1).every(key => value[key] === undefined || value[key] === null || typeof value[key] === (key === 'activo' ? 'boolean' : 'string'));
  const operations = {
    findRange: { method: 'GET', path, response: 'json', successStatuses: [200],
      pagination: { firstParam: 'first', maxParam: 'max', totalHeader: 'Total-registros', requireTotal: true },
      validateRange: restRange, validateResponse: arrayOf(validateResponse), query: { nombre: { validate: v => typeof v === 'string' } } },
    findById: { method: 'GET', path: `${path}/{id}`, response: 'json', successStatuses: [200], validateId: isUuid, validateResponse },
    create: { method: 'POST', path, body: 'json', response: 'json', successStatuses: [201], validateData, validateResponse },
    update: { method: 'PUT', path: `${path}/{id}`, body: 'json', response: 'json', successStatuses: [200], validateId: isUuid, validateData, validateResponse }
  };
  if (['clinica', 'rol'].includes(resource)) operations.deleteById = {
    method: 'DELETE', path: `${path}/{id}`, response: 'none', successStatuses: [204], validateId: isUuid
  };
  routes[resource] = { status: 'verified', source, credentials: 'omit', operations };
}
routes.contexto = { status: 'verified', source, credentials: 'omit', operations: {
  get: { method: 'GET', path: 'v2/contexto', response: 'json', successStatuses: [200],
    validateResponse: v => object(v) && typeof v.actor === 'string' && typeof v.puedeEscribir === 'boolean' && Array.isArray(v.clinicas) && v.clinicas.every(isUuid) }
} };
export const API_V2_ROUTES = routes;

// Flujo clínico sintético; ninguna operación habilita los contratos v1 pendientes.
const clinicQuery = { idClinica: { required: true, validate: isUuid } };
const stringOrNull = v => v === null || typeof v === 'string';
const uuidOrNull = v => v === null || isUuid(v);
function recordSchema(schema) {
  return v => object(v) && Object.keys(v).length === Object.keys(schema).length && Object.entries(schema).every(([key, check]) => Object.hasOwn(v, key) && check(v[key]));
}
const consultaSchema = { idConsulta: isUuid, idPersonaRol: uuidOrNull, idClinica: uuidOrNull, personaNombre: stringOrNull,
  rolNombre: stringOrNull, clinicaNombre: stringOrNull, fechaInicio: stringOrNull, fechaFin: stringOrNull, referenciaExterna: stringOrNull, observaciones: stringOrNull };
function flowRoutes(resource, path, schema, writable, { create = true, update = true, query = clinicQuery, listQuery = {}, validateQuery } = {}) {
  const validateResponse = recordSchema(schema);
  const data = v => object(v) && Object.keys(v).every(key => writable.includes(key)) && Object.entries(v).every(([key, value]) => schema[key](value));
  const operations = {
    findRange: { method: 'GET', path: `v2/${path}`, response: 'json', successStatuses: [200],
      pagination: { firstParam: 'first', maxParam: 'max', totalHeader: 'Total-registros', requireTotal: true }, validateRange: restRange,
      validateResponse: arrayOf(validateResponse), query: { ...query, ...listQuery }, ...(validateQuery ? { validateQuery } : {}) },
    findById: { method: 'GET', path: `v2/${path}/{id}`, response: 'json', successStatuses: [200], validateId: isUuid, validateResponse, query }
  };
  if (create) operations.create = { method: 'POST', path: `v2/${path}`, body: 'json', response: 'json', successStatuses: [201], validateData: data, validateResponse, query };
  if (update) operations.update = { method: 'PUT', path: `v2/${path}/{id}`, body: 'json', response: 'json', successStatuses: [200], validateId: isUuid, validateData: data, validateResponse, query };
  routes[resource] = { status: 'verified', source, credentials: 'omit', operations };
}
flowRoutes('consulta', 'consulta', consultaSchema, ['idPersonaRol','fechaInicio','fechaFin','referenciaExterna','observaciones'], {
  listQuery: API_ROUTES.consulta.operations.findRange.query, validateQuery: API_ROUTES.consulta.operations.findRange.validateQuery
});
flowRoutes('consultaProcedimiento', 'consulta_procedimiento', {
  idConsultaProcedimiento: isUuid, idConsulta: isUuid, idProcedimiento: isUuid, fechaInicio: stringOrNull, fechaFin: stringOrNull, observaciones: stringOrNull
}, ['idConsulta','idProcedimiento','fechaInicio','fechaFin','observaciones'], { listQuery: { idConsulta: { required: true, validate: isUuid } } });
flowRoutes('consultaProcedimientoPaso', 'consulta_procedimiento_paso', {
  idConsultaProcedimientoPaso: isUuid, idConsultaProcedimiento: isUuid, idPersonaRol: isUuid, fechaInicio: stringOrNull, fechaFin: stringOrNull, estado: stringOrNull
}, ['idConsultaProcedimiento','idPersonaRol','fechaInicio','fechaFin','estado'], { create: false, listQuery: { idConsulta: { required: true, validate: isUuid } } });
routes.personaRol = { status: 'verified', source, credentials: 'omit', operations: {
  get: { method: 'GET', path: 'v2/persona_rol/pacientes', response: 'json', successStatuses: [200], query: { ...clinicQuery, buscar: { required: true, validate: v => typeof v === 'string' && Boolean(v.trim()) } },
    validateResponse: arrayOf(recordSchema({ idPersonaRol: isUuid, idPersona: isUuid, idClinica: isUuid, nombres: stringOrNull, apellidos: stringOrNull, rolNombre: stringOrNull })) }
} };
routes.procedimiento = { status: 'verified', source, credentials: 'omit', operations: {
  findRange: { method: 'GET', path: 'v2/procedimiento', response: 'json', successStatuses: [200],
    pagination: { firstParam: 'first', maxParam: 'max', totalHeader: 'Total-registros', requireTotal: true }, validateRange: restRange,
    validateResponse: arrayOf(recordSchema({ idProcedimiento: isUuid, nombre: stringOrNull, observaciones: stringOrNull, activo: v => v === null || typeof v === 'boolean' })) }
} };
export const API_V2_DASHBOARD_ROUTES = { ...routes, clinica: { ...routes.clinica, operations: {
  findRange: { ...API_ROUTES.clinica.operations.findRange, path: 'v2/clinica_disponible' }
} } };

flowRoutes('persona','persona',{ idPersona:isUuid,nombres:stringOrNull,apellidos:stringOrNull,fechaNacimiento:stringOrNull,fechaCreacion:stringOrNull },
  ['nombres','apellidos','fechaNacimiento'],{ query:{},listQuery:{nombres:{validate:v=>typeof v==='string'},apellidos:{validate:v=>typeof v==='string'}} });
flowRoutes('documento','documento',{ idDocumento:isUuid,idPersona:isUuid,idTipoDocumento:isUuid,valor:stringOrNull,rutaFisica:stringOrNull },
  ['idPersona','idTipoDocumento','valor','rutaFisica'],{query:{},listQuery:{idPersona:{required:true,validate:isUuid}}});
flowRoutes('medioContacto','medio_contacto',{idMedioContacto:isUuid,idPersona:isUuid,idTipoMedioContacto:isUuid,valor:stringOrNull,fechaCreacion:stringOrNull},
  ['idPersona','idTipoMedioContacto','valor'],{query:{},listQuery:{idPersona:{required:true,validate:isUuid}}});
const patientGet = routes.personaRol.operations.get;
flowRoutes('personaRol','persona_rol',{idPersonaRol:isUuid,idPersona:isUuid,idRol:isUuid,idClinica:isUuid,fechaCreacion:stringOrNull},
  ['idPersona','idRol','idClinica'],{query:{},listQuery:{idPersona:{required:true,validate:isUuid}}});
routes.personaRol.operations.get = patientGet;
for (const [resource,path] of [['documento','documento'],['medioContacto','medio_contacto'],['personaRol','persona_rol']]) {
  routes[resource].operations.deleteById={method:'DELETE',path:`v2/${path}/{id}`,response:'none',successStatuses:[204],validateId:isUuid};
}
// Las rutas clínicas del dashboard no necesitan los contratos de Persona añadidos después.
