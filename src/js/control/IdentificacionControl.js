import DefaultError from '../entity/DefaultError.js';
import { isUuid } from './rest-validators.js';

// Subconjunto común Java/ECMAScript: clases ASCII, dígitos y cuantificadores.
// Las expresiones Java más complejas se validan únicamente en el backend.
function formatoCompatible(expresion) {
  if (!expresion) return null;
  const tokens = expresion.match(
    /\[\^?(?:[A-Za-z0-9-]|\\d)+\]|\\d|[A-Za-z0-9 ^$-]|\{\d+(?:,\d*)?\}|[?*+]/g,
  );
  if (!tokens || tokens.join('') !== expresion) return null;
  try {
    return new RegExp(expresion);
  } catch {
    return null;
  } // Sintaxis Java o configuración inválida: decide Java.
}

export function validarDocumento(tipos, id, valor) {
  if (!id)
    throw DefaultError.validation('Selecciona el tipo de documento.', 'DOCUMENT_TYPE_REQUIRED');
  const tipo = tipos.find((t) => t.idTipoDocumento === id && t.activo === true);
  if (!tipo)
    throw DefaultError.validation('Tipo de documento no disponible.', 'DOCUMENT_TYPE_UNAVAILABLE');
  if (typeof valor !== 'string' || !valor.trim())
    throw DefaultError.validation('Ingresa el número de documento.', 'DOCUMENT_REQUIRED');
  const formato = formatoCompatible(tipo.expresionRegular);
  const match = formato?.exec(valor.trim());
  if (formato && (!match || match.index !== 0 || match[0].length !== valor.trim().length))
    throw DefaultError.validation(
      `El número no corresponde al formato de ${tipo.nombre}. Revisa el tipo de documento seleccionado.`,
      'DOCUMENT_FORMAT',
    );
  return { idTipoDocumento: id, valor: valor.trim() };
}

export class IdentificacionControl {
  constructor(http, portal) {
    this.http = http;
    this.portal = portal;
    this.session = null;
    this.tipos = [];
    this.asignacionActiva = null;
    this.listeners = new Set();
    this.revision = 0;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notificar(motivo) {
    for (const listener of this.listeners) listener(motivo);
  }
  invalidar() {
    const changed = this.session !== null || this.asignacionActiva !== null;
    this.revision++;
    this.session = null;
    this.asignacionActiva = null;
    if (changed) this.notificar('sesion');
  }
  validarContexto(data, persona) {
    if (
      !data ||
      !isUuid(data.idPersona) ||
      (persona && data.idPersona !== persona) ||
      data.tipo !== this.portal.toUpperCase() ||
      !Array.isArray(data.asignaciones) ||
      !data.asignaciones.length ||
      !data.asignaciones.every((a) => a && [a.idPersonaRol, a.idRol, a.idClinica].every(isUuid)) ||
      new Set(data.asignaciones.map((a) => a.idPersonaRol)).size !== data.asignaciones.length
    )
      throw DefaultError.processing('Contexto de identificación inválido.');
  }
  async cargar(signal) {
    this.tipos = await this.http.tipos(signal);
    return this.tipos;
  }
  async entrar(id, valor, signal) {
    this.invalidar();
    const revision = this.revision;
    const { data } = await this.http.identificar(
      this.portal,
      validarDocumento(this.tipos, id, valor),
      signal,
    );
    if (!data || !/^[A-Za-z0-9_-]{43}$/.test(data.token))
      throw DefaultError.processing('Contexto de identificación inválido.');
    this.validarContexto(data.contexto);
    if (signal?.aborted || revision !== this.revision)
      throw new DOMException('Cancelado', 'AbortError');
    this.session = data;
    this.asignacionActiva = data.contexto.asignaciones[0].idPersonaRol;
    this.notificar('sesion');
    return data.contexto;
  }
  seleccionarAsignacion(id) {
    if (!this.session?.contexto.asignaciones.some((a) => a.idPersonaRol === id))
      throw DefaultError.validation('Selecciona una asignación disponible.');
    if (this.asignacionActiva !== id) {
      this.asignacionActiva = id;
      this.notificar('asignacion');
    }
  }
  async salir(signal) {
    const session = this.session;
    try {
      if (session) await this.http.cerrar(this.portal, session.token, signal);
    } finally {
      if (this.session === session) this.invalidar();
    }
  }
  async actualizar(signal) {
    if (!this.session) throw DefaultError.validation('Identifícate primero.');
    const session = this.session;
    let data;
    try {
      ({ data } = await this.http.contexto(this.portal, session.token, signal));
    } catch (error) {
      if (this.session === session && [401, 403].includes(error.status)) this.invalidar();
      throw error;
    }
    if (signal?.aborted || this.session !== session)
      throw new DOMException('Cancelado', 'AbortError');
    this.validarContexto(data, session.contexto.idPersona);
    session.contexto = data;
    if (!data.asignaciones.some((a) => a.idPersonaRol === this.asignacionActiva))
      this.asignacionActiva = data.asignaciones[0].idPersonaRol;
    this.notificar('contexto');
    return data;
  }
}
