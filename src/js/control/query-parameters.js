import DefaultError from '../entity/DefaultError.js';

/** Solo serializa parámetros declarados; los filtros nunca se concatenan a la URL. */
export function appendQuery(url, query = {}, contract) {
  if (!query || typeof query !== 'object' || Array.isArray(query) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(query))) {
    throw DefaultError.validation('query debe ser un objeto plano de parámetros.');
  }
  const schema = contract.query || {};
  if (Object.keys(query).some(name => !Object.prototype.hasOwnProperty.call(schema, name))) {
    throw DefaultError.validation('La consulta contiene parámetros no admitidos por el contrato.', 'INVALID_QUERY');
  }
  Object.keys(schema).forEach(name => {
    const rule = schema[name];
    const value = Object.prototype.hasOwnProperty.call(query, name) ? query[name] : undefined;
    if (value === undefined && !rule.required) return;
    if (value === undefined || value === null ||
        !['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        (rule.validate && rule.validate(value) === false)) {
      throw DefaultError.validation(`Parámetro ${name} ausente o inválido.`, 'INVALID_QUERY');
    }
    url.searchParams.set(name, String(value));
  });
  if (contract.validateQuery && contract.validateQuery(query) === false) {
    throw DefaultError.validation('Los filtros no forman un rango válido.', 'INVALID_QUERY');
  }
}
