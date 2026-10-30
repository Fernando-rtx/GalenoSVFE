import DefaultError from '../entity/DefaultError.js';
import DefaultResponse from '../entity/DefaultResponse.js';
import { createApiConfig } from '../config/api-config.js';
import { appendQuery } from './query-parameters.js';

const METHODS = Object.freeze({ get: 'GET', findRange: 'GET', findById: 'GET', create: 'POST', update: 'PUT', deleteById: 'DELETE' });
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function snapshot(headers) {
  const result = {};
  headers.forEach((value, name) => { result[name] = value; });
  return result;
}

function validateId(id) {
  const validNumber = Number.isSafeInteger(id) && id >= 0;
  const validString = typeof id === 'string' && id.trim().length > 0 && id !== '.' && id !== '..';
  if (!validNumber && !validString) throw DefaultError.validation('id debe ser una cadena no vacía o un entero seguro no negativo.');
}

function jsonBody(data) {
  if (data === null || typeof data !== 'object') throw DefaultError.validation('data debe ser un objeto o arreglo JSON.');
  try {
    return JSON.stringify(data, (key, value) => {
      if (value === undefined || typeof value === 'function' || typeof value === 'symbol' ||
          typeof value === 'bigint' || (typeof value === 'number' && !Number.isFinite(value))) {
        throw new Error('Valor no representable en JSON');
      }
      if (value && typeof value === 'object' && !Array.isArray(value) &&
          ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
        throw new Error('Solo se admiten objetos planos y arreglos JSON');
      }
      return value;
    });
  } catch (cause) {
    throw DefaultError.validation('data no es serializable como JSON sin pérdida de valores.', 'INVALID_DATA', cause);
  }
}

function parseTotal(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !/^\d+$/.test(value)) throw new Error('Cabecera de total inválida');
  const total = typeof value === 'string' ? Number(value) : value;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Total inválido');
  return total;
}

function validateContract(contract, operation) {
  if (contract.method !== METHODS[operation] || typeof contract.path !== 'string' ||
      !contract.path || /^(?:\/|[a-z][a-z0-9+.-]*:)/i.test(contract.path) || /[?#\\]/.test(contract.path) ||
      !['json', 'text', 'none'].includes(contract.response) ||
      !Array.isArray(contract.successStatuses) || contract.successStatuses.length === 0 ||
      contract.successStatuses.some(status => !Number.isInteger(status) || status < 200 || status > 299)) {
    throw DefaultError.validation('Contrato de operación incompleto o inválido.', 'INVALID_CONTRACT');
  }
  const needsId = ['findById', 'update', 'deleteById'].includes(operation);
  const placeholders = contract.path.match(/\{[^}]*\}/g) || [];
  if (needsId ? placeholders.length !== 1 || placeholders[0] !== '{id}' : placeholders.length > 0) {
    throw DefaultError.validation('La ruta debe declarar {id} solamente para operaciones por identificador.', 'INVALID_CONTRACT');
  }
  if (['create', 'update'].includes(operation) && contract.body !== 'json') {
    throw DefaultError.validation('El formato JSON del cuerpo debe estar confirmado en el contrato.', 'INVALID_CONTRACT');
  }
  if (operation === 'findRange') {
    const page = contract.pagination;
    if (!page || !['firstParam', 'maxParam'].every(key => typeof page[key] === 'string' && page[key].trim()) ||
        page.firstParam === page.maxParam ||
        (page.totalHeader !== undefined && (typeof page.totalHeader !== 'string' || !page.totalHeader.trim())) ||
        (page.requireTotal && !page.totalHeader && !contract.mapTotal)) {
      throw DefaultError.validation('Faltan los nombres reales de los parámetros de paginación.', 'INVALID_CONTRACT');
    }
  }
  ['validateId', 'validateData', 'validateRange', 'validateQuery', 'validateResponse', 'mapData', 'mapTotal'].forEach(key => {
    if (contract[key] !== undefined && typeof contract[key] !== 'function') {
      throw DefaultError.validation(`${key} debe ser una función.`, 'INVALID_CONTRACT');
    }
  });
  if (contract.query !== undefined) {
    if (!contract.query || typeof contract.query !== 'object' || Array.isArray(contract.query)) {
      throw DefaultError.validation('query debe declarar un esquema de parámetros.', 'INVALID_CONTRACT');
    }
    Object.keys(contract.query).forEach(name => {
      const rule = contract.query[name];
      const page = contract.pagination;
      if (!rule || typeof rule !== 'object' || Array.isArray(rule) ||
          (rule.validate !== undefined && typeof rule.validate !== 'function') ||
          (rule.required !== undefined && typeof rule.required !== 'boolean') ||
          (page && [page.firstParam, page.maxParam].includes(name))) {
        throw DefaultError.validation('Esquema de parámetros incompatible con la operación.', 'INVALID_CONTRACT');
      }
    });
  }
}

/** Transporte común. Cada operación requiere un contrato registrado explícitamente. */
export default class DefaultDAO {
  constructor({ resource, config = createApiConfig(), fetchImpl = globalThis.fetch } = {}) {
    if (typeof resource !== 'string' || !resource.trim() || typeof fetchImpl !== 'function') {
      throw DefaultError.validation('Se requieren resource y una implementación de Fetch.', 'INVALID_CONFIG');
    }
    this.resource = resource;
    this.config = createApiConfig(config);
    this.fetchImpl = fetchImpl;
  }

  get(options = {}) { return this._run('get', {}, options); }

  findRange(first, max, options = {}) { return this._run('findRange', { first, max }, options); }
  findById(id, options = {}) { return this._run('findById', { id }, options); }
  create(data, options = {}) { return this._run('create', { data }, options); }
  update(id, data, options = {}) { return this._run('update', { id, data }, options); }
  deleteById(id, options = {}) { return this._run('deleteById', { id }, options); }

  _run(operation, parameters, options) {
    // También los errores de validación se entregan como Promises rechazadas.
    return Promise.resolve().then(() => {
      const routes = this.config.routes;
      const resource = hasOwn(routes, this.resource) ? routes[this.resource] : null;
      if (!resource || resource.status !== 'verified') {
        throw DefaultError.validation(`Contrato REST pendiente para ${this.resource}.`, 'CONTRACT_PENDING');
      }
      const contract = resource.operations && hasOwn(resource.operations, operation) ? resource.operations[operation] : null;
      if (!contract) throw DefaultError.validation(`Operación ${operation} no confirmada para ${this.resource}.`, 'OPERATION_UNSUPPORTED');
      if (typeof resource.source !== 'string' || !resource.source.trim()) {
        throw DefaultError.validation('El contrato debe incluir una fuente verificable.', 'INVALID_CONTRACT');
      }
      validateContract(contract, operation);
      if (!this.config.baseUrl) throw DefaultError.validation('Configura la URL base del backend.', 'BASE_URL_REQUIRED');
      if (!options || typeof options !== 'object' || Array.isArray(options) ||
          Object.keys(options).some(key => !['headers', 'signal', 'query'].includes(key))) {
        throw DefaultError.validation('Solo se admiten headers, signal y query por solicitud.');
      }
      if (options.signal !== undefined && options.signal !== null && (typeof options.signal.aborted !== 'boolean' ||
          typeof options.signal.addEventListener !== 'function' || typeof options.signal.removeEventListener !== 'function')) {
        throw DefaultError.validation('signal debe ser un AbortSignal.');
      }
      let path = contract.path;
      if (hasOwn(parameters, 'id')) {
        validateId(parameters.id);
        if (contract.validateId && contract.validateId(parameters.id) === false) throw DefaultError.validation('Identificador incompatible con el contrato.');
        path = path.replace('{id}', encodeURIComponent(parameters.id));
      }
      const url = new URL(path, this.config.baseUrl);
      if (!url.href.startsWith(this.config.baseUrl)) throw DefaultError.validation('La ruta sale de la URL base.', 'INVALID_CONTRACT');
      if (operation === 'findRange') {
        if (!Number.isSafeInteger(parameters.first) || parameters.first < 0 || !Number.isSafeInteger(parameters.max) || parameters.max < 1) {
          throw DefaultError.validation('first debe ser un entero >= 0 y max un entero > 0.');
        }
        if (contract.validateRange && contract.validateRange(parameters.first, parameters.max) === false) {
          throw DefaultError.validation('La paginación excede el rango admitido por el contrato.');
        }
        url.searchParams.set(contract.pagination.firstParam, parameters.first);
        url.searchParams.set(contract.pagination.maxParam, parameters.max);
      }
      appendQuery(url, options.query, contract);
      let headers;
      try {
        headers = new Headers(this.config.http.headers);
        [contract.headers, options.headers].forEach(values => {
          new Headers(values || {}).forEach((value, key) => { headers.set(key, value); });
        });
      } catch (cause) { throw DefaultError.validation('Cabeceras inválidas.', 'INVALID_PARAMETER', cause); }
      const init = Object.assign({}, this.config.http, { method: contract.method, headers });
      if (resource.credentials) init.credentials = resource.credentials;
      if (hasOwn(parameters, 'data')) {
        if (contract.validateData && contract.validateData(parameters.data) === false) throw DefaultError.validation('Datos incompatibles con el contrato.', 'INVALID_DATA');
        init.body = jsonBody(parameters.data);
        // Este cliente serializa JSON; no permitir una cabecera contradictoria.
        if (headers.has('Content-Type') && !/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(headers.get('Content-Type'))) {
          throw DefaultError.validation('Content-Type debe corresponder al cuerpo JSON.', 'INVALID_DATA');
        }
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      }
      return this._send(url, init, contract, operation, parameters, options.signal);
    }).catch(cause => {
      if (cause instanceof DefaultError) throw cause;
      throw DefaultError.validation('No se pudo preparar la solicitud.', 'INVALID_PARAMETER', cause);
    });
  }

  _send(url, init, contract, operation, parameters, signal) {
    const controller = new AbortController();
    init.signal = controller.signal;
    let timer;
    let onAbort;
    let received = {};
    const interrupted = new Promise((resolve, reject) => {
      onAbort = () => {
        reject(new DefaultError(Object.assign({}, received, { type: 'connection', code: 'CANCELLED', message: 'Solicitud cancelada.' })));
        controller.abort();
      };
      if (signal && signal.aborted) { onAbort(); return; }
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        reject(new DefaultError(Object.assign({}, received, { type: 'connection', code: 'TIMEOUT', message: 'Se agotó el tiempo de la solicitud.' })));
        controller.abort();
      }, this.config.timeoutMs);
    });
    const work = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new DefaultError({ type: 'connection', code: 'CANCELLED', message: 'Solicitud cancelada.' });
      // Invocar como función independiente evita un this incompatible en navegadores.
      const fetchRequest = this.fetchImpl;
      return fetchRequest(url.href, init);
    }).then(response => {
      received = { status: response.status, headers: snapshot(response.headers) };
      return this._read(response, contract, operation, parameters, url.href);
    }).catch(cause => {
      if (cause instanceof DefaultError) throw cause;
      throw new DefaultError({ type: 'connection', code: 'NETWORK_ERROR', message: 'No fue posible completar la conexión HTTP.', cause });
    });
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    return Promise.race([work, interrupted]).then(result => { cleanup(); return result; }, error => { cleanup(); throw error; });
  }

  _read(response, contract, operation, parameters, requestedUrl) {
    const headers = snapshot(response.headers);
    if (response.type === 'opaque' || response.status === 0) throw DefaultError.processing('La respuesta no permite leer estado ni cabeceras.', null, response.status, headers);
    return response.text().catch(cause => {
      // Un fallo al leer el cuerpo no debe ocultar un estado HTTP ya recibido.
      if (!response.ok) throw new DefaultError({ type: 'http', code: 'HTTP_ERROR', message: `HTTP ${response.status}`, status: response.status, headers, cause });
      throw new DefaultError({ type: 'connection', code: 'BODY_READ_ERROR', message: 'Se interrumpió la lectura de la respuesta.', status: response.status, headers, cause });
    }).then(text => {
      if (!response.ok) {
        let details = text || null;
        if (text) { try { details = JSON.parse(text); } catch (ignored) { /* Mantener el error HTTP original. */ } }
        throw new DefaultError({ type: 'http', code: 'HTTP_ERROR', message: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`, status: response.status, details, headers });
      }
      if (!contract.successStatuses.includes(response.status)) {
        throw DefaultError.processing('Estado de éxito no contemplado por el contrato.', null, response.status, headers);
      }
      try {
        let data = null;
        if (response.status !== 204 && response.status !== 205) {
          if (contract.response === 'json') {
            if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '')) throw new Error('Content-Type no es JSON');
            data = JSON.parse(text);
          } else if (contract.response === 'text') data = text;
          else if (text.length > 0) throw new Error('Se esperaba una respuesta sin cuerpo');
        }
        const context = { status: response.status, headers: response.headers };
        let total = null;
        if (contract.pagination && contract.pagination.totalHeader) {
          total = parseTotal(response.headers.get(contract.pagination.totalHeader));
          if (total === null && contract.pagination.requireTotal) throw new Error('Falta la cabecera de total o CORS no la expone');
        }
        if (contract.mapTotal) total = parseTotal(contract.mapTotal(data, context));
        if (contract.mapData) data = contract.mapData(data, context);
        if (operation === 'findRange' && !Array.isArray(data)) throw new Error('findRange debe producir un arreglo mediante el contrato');
        if (contract.validateResponse && contract.validateResponse(data) === false) throw new Error('El DTO no cumple el contrato REST');
        return new DefaultResponse({
          datos: data, totalDatos: total, status: response.status, statusText: response.statusText,
          headers, url: response.url || requestedUrl,
          metadata: { resource: this.resource, operation, pagination: operation === 'findRange' ? Object.freeze({ first: parameters.first, max: parameters.max }) : null }
        });
      } catch (cause) {
        throw DefaultError.processing('La respuesta no cumple el contrato configurado.', cause, response.status, headers);
      }
    });
  }
}
