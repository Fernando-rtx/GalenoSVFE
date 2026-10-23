import DefaultError from '../entity/DefaultError.js';
import { API_ROUTES } from './api-routes.js';

function immutableCopy(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableCopy));
  if (value && typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw DefaultError.validation('La configuración debe contener objetos planos.', 'INVALID_CONFIG');
    }
    const result = {};
    Object.keys(value).forEach(key => {
      Object.defineProperty(result, key, { value: immutableCopy(value[key]), enumerable: true });
    });
    return Object.freeze(result);
  }
  return value;
}

/** Crear una instancia por entorno; nunca leer process.env desde un DAO. */
export function createApiConfig({ baseUrl = null, timeoutMs = 15000, http = {}, routes = API_ROUTES } = {}) {
  let normalizedUrl = null;
  if (baseUrl !== null) {
    try {
      if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new Error('URL vacía');
      const url = new URL(baseUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error('URL incompatible');
      }
      url.pathname = url.pathname.replace(/\/+$/, '') + '/';
      normalizedUrl = url.href;
    } catch (cause) {
      throw DefaultError.validation('baseUrl debe ser una URL HTTP(S) absoluta sin credenciales, consulta ni fragmento.', 'INVALID_CONFIG', cause);
    }
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) {
    throw DefaultError.validation('timeoutMs debe ser un entero entre 1 y 2147483647.', 'INVALID_CONFIG');
  }
  const options = Object.assign({ credentials: 'omit', mode: 'cors', cache: 'no-store', redirect: 'error' }, http);
  const allowed = ['credentials', 'mode', 'cache', 'redirect', 'headers'];
  if (Object.keys(options).some(key => !allowed.includes(key)) ||
      !['omit', 'same-origin', 'include'].includes(options.credentials) || options.mode !== 'cors' ||
      !['default', 'no-store', 'reload', 'no-cache', 'force-cache', 'only-if-cached'].includes(options.cache) ||
      !['error', 'follow'].includes(options.redirect) || options.cache === 'only-if-cached') {
    throw DefaultError.validation('Opciones HTTP inválidas; se requiere mode cors y una caché compatible.', 'INVALID_CONFIG');
  }
  try {
    const headers = {};
    new Headers(options.headers || {}).forEach((value, name) => { headers[name] = value; });
    options.headers = headers;
  } catch (cause) {
    throw DefaultError.validation('Cabeceras HTTP inválidas.', 'INVALID_CONFIG', cause);
  }
  if (!routes || typeof routes !== 'object' || Array.isArray(routes)) {
    throw DefaultError.validation('routes debe ser un registro de contratos.', 'INVALID_CONFIG');
  }
  return immutableCopy({ baseUrl: normalizedUrl, timeoutMs, http: options, routes });
}
