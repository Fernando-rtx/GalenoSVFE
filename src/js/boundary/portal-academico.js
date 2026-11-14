import './modelos/BusquedaCitasModel.js';
import { offerTicketDownload } from './ticket-options.js';
import './modelos/InicioSesionModel.js';
import { IdentidadAcademicaService } from '../control/IdentidadAcademicaService.js';
import { CitasPacienteService } from '../control/CitasPacienteService.js';
import { IdentificacionControl } from '../control/IdentificacionControl.js';
import { conectarEmpleado } from '../control/contexto-empleado.js';
import { BusquedaCitasControl } from '../control/BusquedaCitasControl.js';

/** Composición de presentación; el token pertenece al control y nunca se publica en el DOM. */
export function mountPortal(view, config) {
  const http = new IdentidadAcademicaService(config);
  const identidad = new IdentificacionControl(http, view.portal);
  if (view.portal === 'empleado') conectarEmpleado(identidad);
  const citas = new BusquedaCitasControl(identidad, new CitasPacienteService(http));
  let request;
  let busy = false;
  let first = 0;
  let lastQuery;
  const run = async (work) => {
    if (busy) return;
    request?.abort();
    request = new AbortController();
    busy = true;
    view.retry(false);
    view.busy(true);
    view.status('Cargando…');
    try {
      await work(request.signal);
      view.retry(false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        if ([401, 403].includes(error.status)) {
          identidad.session = null;
          view.context(null);
        }
        view.status(error.message);
        view.retry(
          ['network', 'connection', 'processing'].includes(error.type) || error.status >= 500,
        );
      }
    } finally {
      busy = false;
      view.busy(false);
    }
  };
  const load = () =>
    run(async (signal) => {
      view.tipos(await identidad.cargar(signal));
      view.status('Selecciona tu documento.');
    });
  const search = async (signal) => {
    const result = await citas.buscar(...lastQuery, first, signal);
    view.results(result.data, result.total, first, identidad.session.contexto.zonaHoraria);
  };
  const handlers = {
    'portal-reintentar': () =>
      identidad.session
        ? run(async (signal) => {
            view.context(await identidad.actualizar(signal));
            view.status('Conexión restablecida.');
          })
        : load(),
    'portal-identificar': () =>
      run(async (signal) => {
        view.context(await identidad.entrar(view.value('tipo'), view.value('valor'), signal));
        view.status('Identificación completada.');
      }),
    'portal-asignacion': () => {
      identidad.asignacionActiva = view.value('asignacion');
    },
    'portal-tipo': () =>
      view.hint(
        identidad.tipos.find((t) => t.idTipoDocumento === view.value('tipo'))?.indicaciones,
      ),
    'portal-salir': () =>
      run(async (signal) => {
        await identidad.salir(signal);
        view.context(null);
        view.status('Sesión cerrada.');
      }),
    'portal-actualizar': () =>
      run(async (signal) => {
        view.context(await identidad.actualizar(signal));
        view.status('Contexto actualizado.');
      }),
    'portal-buscar': () => {
      first = 0;
      lastQuery = [view.value('clinica'), view.value('desde'), view.value('hasta')];
      view.clearResults();
      run(search);
    },
    'portal-anterior': () => {
      first = Math.max(0, first - 20);
      run(search);
    },
    'portal-siguiente': () => {
      first += 20;
      run(search);
    },
    'descargar-ticket': async (event) => {
      if (!await offerTicketDownload()) return;
      return run(async (signal) => {
        const blob = await citas.ticket(event.detail.idConsulta, signal);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cita-${event.detail.idConsulta}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        view.status('Ticket descargado.');
      });
    },
  };
  for (const [type, handler] of Object.entries(handlers)) view.addEventListener(type, handler);
  const online = () => {
    if (!busy) view.status('Conexión disponible. Puedes reintentar.');
  };
  const offline = () => {
    view.retry(true);
    view.status('Sin conexión. Puedes reintentar al volver la conexión.');
  };
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  load();
  return {
    // API en memoria para la composición HU3/HU4, sin persistencia ni evento con token.
    identidad,
    destroy() {
      request?.abort();
      identidad.session = null;
      if (view.portal === 'empleado') conectarEmpleado(null);
      for (const [type, handler] of Object.entries(handlers))
        view.removeEventListener(type, handler);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    },
  };
}
