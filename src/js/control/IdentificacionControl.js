import DefaultError from '../entity/DefaultError.js';
import { isUuid } from './rest-validators.js';

export function validarDocumento(tipos, id, valor) {
  if (!id) throw DefaultError.validation('Selecciona el tipo de documento.');
  const tipo = tipos.find((t) => t.idTipoDocumento === id && t.activo === true);
  if (!tipo) throw DefaultError.validation('Tipo de documento no disponible.');
  if (typeof valor !== 'string' || !valor.trim())
    throw DefaultError.validation('Ingresa el número de documento.');
  return { idTipoDocumento: id, valor: valor.trim() };
}

export class IdentificacionControl {
  constructor(http, portal) {
    this.http = http;
    this.portal = portal;
    this.session = null;
    this.tipos = [];
  }
  async cargar(signal) {
    this.tipos = await this.http.tipos(signal);
    return this.tipos;
  }
  async entrar(id, valor, signal) {
    this.session = null;
    const { data } = await this.http.identificar(
      this.portal,
      validarDocumento(this.tipos, id, valor),
      signal,
    );
    if (
      !data ||
      !/^[A-Za-z0-9_-]{43}$/.test(data.token) ||
      !isUuid(data.contexto?.idPersona) ||
      data.contexto.tipo !== this.portal.toUpperCase() ||
      !Array.isArray(data.contexto.asignaciones) ||
      data.contexto.asignaciones.length === 0 ||
      !data.contexto.asignaciones.every((a) => [a.idPersonaRol, a.idRol, a.idClinica].every(isUuid))
    )
      throw DefaultError.processing('Contexto de identificación inválido.');
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    this.session = data;
    this.asignacionActiva = data.contexto.asignaciones[0].idPersonaRol;
    return data.contexto;
  }
  async salir(signal) {
    if (this.session) await this.http.cerrar(this.portal, this.session.token, signal);
    this.session = null;
  }
  async actualizar(signal) {
    if (!this.session) throw DefaultError.validation('Identifícate primero.');
    const { data } = await this.http.contexto(this.portal, this.session.token, signal);
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    if (
      !data ||
      data.tipo !== this.portal.toUpperCase() ||
      !Array.isArray(data.asignaciones) ||
      !data.asignaciones.length
    )
      throw DefaultError.processing('Contexto de identificación inválido.');
    this.session.contexto = data;
    if (!data.asignaciones.some((a) => a.idPersonaRol === this.asignacionActiva))
      this.asignacionActiva = data.asignaciones[0].idPersonaRol;
    return data;
  }
}
