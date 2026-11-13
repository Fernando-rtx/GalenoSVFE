import { GT02_ROUTES } from './api-v2-routes.js';
export class CitasPacienteService {
  constructor(http) {
    this.http = http;
  }
  buscar(token, query, signal) {
    return this.http.request(`${GT02_ROUTES.citas}?${new URLSearchParams(query)}`, {
      token,
      signal,
    });
  }
  ticket(token, id, signal) {
    return this.http.request(`${GT02_ROUTES.citas}/${encodeURIComponent(id)}/ticket`, {
      token,
      signal,
      pdf: true,
    });
  }
}
