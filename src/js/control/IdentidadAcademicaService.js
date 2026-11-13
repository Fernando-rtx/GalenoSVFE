import DefaultError from '../entity/DefaultError.js';
import DefaultResponse from '../entity/DefaultResponse.js';
import TipoDocumentoService from './TipoDocumentoService.js';
import { createApiConfig } from './api-config.js';
import { GT02_ROUTES } from './api-v2-routes.js';

/** Transporte sin persistencia; distingue HTTP, red y cancelación. */
export class IdentidadAcademicaService {
  constructor({ baseUrl, fetchImpl = globalThis.fetch }) {
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
    this.catalogo = new TipoDocumentoService({ config: createApiConfig({ baseUrl }), fetchImpl });
  }

  async request(path, { method = 'GET', body, token, signal, asignacion, pdf = false } = {}) {
    let response;
    try {
      const fetchRequest = this.fetch;
      response = await fetchRequest(new URL(path, this.baseUrl), {
        method,
        signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Accept: pdf ? 'application/pdf, application/json' : 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(asignacion ? { 'X-Persona-Rol': asignacion } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause;
      throw new DefaultError({
        type: 'network',
        code: 'NETWORK',
        message: 'Sin conexión con el backend. Reintenta cuando esté disponible.',
        cause,
      });
    }
    if (!response.ok) {
      // No mostrar contenido arbitrario del servidor, HTML o trazas internas.
      throw new DefaultError({
        type: 'http',
        code: 'HTTP',
        status: response.status,
        message:
          {
            400: 'Solicitud inválida.',
            401: 'La sesión expiró. Identifícate de nuevo.',
            403: 'No tienes una asignación válida para esta operación.',
            404: 'No se encontró el registro solicitado.',
            409: 'El documento es ambiguo. Contacta a la clínica.',
            422: 'Revisa el documento, la clínica y las fechas.',
          }[response.status] ?? 'El servidor no pudo completar la operación. Reintenta.',
      });
    }
    try {
      if (response.status === 204) return null;
      if (pdf) {
        if (!response.headers.get('Content-Type')?.startsWith('application/pdf'))
          throw new Error('Tipo incorrecto');
        const blob = await response.blob();
        if ((await blob.slice(0, 5).text()) !== '%PDF-') throw new Error('PDF inválido');
        return blob;
      }
      return new DefaultResponse({
        datos: await response.json(),
        totalDatos: Number(response.headers.get('Total-registros') ?? 0),
        status: response.status,
      });
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause;
      throw DefaultError.processing('La respuesta del servidor no es válida. Reintenta.', cause);
    }
  }

  async tipos(signal) {
    const all = [];
    let first = 0;
    let total;
    do {
      let result;
      try {
        result = await this.catalogo.findRange(first, 100, { signal });
      } catch (error) {
        if (signal?.aborted || error.code === 'CANCELLED' || error.cause?.name === 'AbortError') throw new DOMException('Solicitud cancelada', 'AbortError');
        if (error.type === 'connection') throw new DefaultError({ type: 'network', code: 'NETWORK', message: 'Sin conexión con el backend. Reintenta cuando esté disponible.', cause: error });
        throw error;
      }
      if (
        !Array.isArray(result.data) ||
        !Number.isInteger(result.total) ||
        result.total < 0 ||
        (result.data.length === 0 && first < result.total)
      )
        throw DefaultError.processing('Catálogo inválido');
      all.push(...result.data);
      first += result.data.length;
      total = result.total;
    } while (first < total);
    return all.filter((t) => t.activo === true);
  }

  identificar(portal, body, signal) {
    return this.request(`${GT02_ROUTES.identidad}/${portal}`, { method: 'POST', body, signal });
  }
  contexto(portal, token, signal) {
    return this.request(`${GT02_ROUTES.identidad}/${portal}`, { token, signal });
  }
  cerrar(portal, token, signal) {
    return this.request(`${GT02_ROUTES.identidad}/${portal}`, { method: 'DELETE', token, signal });
  }
}
