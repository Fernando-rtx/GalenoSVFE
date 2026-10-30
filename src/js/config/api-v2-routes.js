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
