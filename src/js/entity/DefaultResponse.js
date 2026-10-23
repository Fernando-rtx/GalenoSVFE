import DefaultError from './DefaultError.js';

/** Resultado interno del frontend; no representa un sobre JSON del servidor. */
export default class DefaultResponse {
  constructor({ datos = null, totalDatos = null, status, statusText = '', headers = {}, url = '', metadata = {} }) {
    if (totalDatos !== null && (!Number.isSafeInteger(totalDatos) || totalDatos < 0)) {
      throw DefaultError.processing('El total debe ser un entero seguro no negativo o null.');
    }
    this.datos = datos;
    this.totalDatos = totalDatos;
    this.status = status;
    this.statusText = statusText;
    const normalized = {};
    // Recibe la instantánea del transporte; Entity no necesita APIs HTTP ni DOM.
    Object.keys(headers).forEach(name => { normalized[name.toLowerCase()] = headers[name]; });
    this.headers = Object.freeze(normalized);
    this.url = url;
    this.metadata = Object.freeze(Object.assign({}, metadata));
    Object.freeze(this);
  }

  // Compatibilidad de lectura con la primera versión local; no se serializan.
  get data() { return this.datos; }
  get total() { return this.totalDatos; }

  getHeader(name) {
    const key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.headers, key) ? this.headers[key] : null;
  }
}
