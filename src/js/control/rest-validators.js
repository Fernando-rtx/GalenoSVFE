// Restricciones del contrato API 0.2; independientes de entidades JPA y de la UI.
export function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

export function orderedDates(query) {
  return query.fechaDesde === undefined || query.fechaHasta === undefined || query.fechaDesde <= query.fechaHasta;
}

export function restRange(first, max) {
  // Java Integer del contrato; el máximo de página del despliegue lo valida el servidor.
  return first <= 2147483647 && max <= 2147483647;
}

const nullableString = value => value === null || typeof value === 'string';
const nullableUuid = value => value === null || isUuid(value);
const nullableBoolean = value => value === null || typeof value === 'boolean';
const nullableInstant = value => value === null || (typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(value) &&
  isCalendarDate(value.slice(0, 10)));

function dtoMatches(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(fields).every(key => Object.prototype.hasOwnProperty.call(value, key) && fields[key](value[key]));
}

export const tipoDocumentoDto = value => dtoMatches(value, {
  idTipoDocumento: isUuid, nombre: nullableString, indicaciones: nullableString,
  expresionRegular: nullableString, activo: nullableBoolean
});

export const clinicaDto = value => dtoMatches(value, { idClinica: isUuid, nombre: nullableString });

export const consultaDto = value => dtoMatches(value, {
  idConsulta: isUuid, fechaInicio: nullableInstant, fechaFin: nullableInstant,
  idPersonaRol: nullableUuid, personaNombre: nullableString, rolNombre: nullableString,
  idClinica: nullableUuid, clinicaNombre: nullableString
});

export const arrayOf = validate => value => Array.isArray(value) && value.every(validate);
