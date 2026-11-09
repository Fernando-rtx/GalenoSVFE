import { createApiConfig, ClinicaService, ConsultaService } from '../index.js';
import DashboardControl from '../control/DashboardControl.js';
import DashboardModel from './modelos/DashboardModel.js';

/** Composición de la aplicación; las dependencias pueden inyectarse en pruebas. */
export function mountDashboard({
  root,
  config = createApiConfig(),
  clinicaDAO,
  consultaDAO,
  pageSize = 10,
  autoLoad = true,
}) {
  const control = new DashboardControl({
    clinicaDAO: clinicaDAO || new ClinicaService({ config }),
    consultaDAO: consultaDAO || new ConsultaService({ config }),
    pageSize,
  });
  const page = root;
  page.mount(control);
  const ready = autoLoad ? control.loadClinicas() : Promise.resolve();
  return { control, page, ready, destroy: () => page.destroy() };
}
