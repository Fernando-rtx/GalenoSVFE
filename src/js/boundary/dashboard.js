import { createApiConfig, ClinicaService, ConsultaService } from '../index.js';
import DashboardControl from '../control/DashboardControl.js';
import DashboardModel from './modelos/DashboardModel.js';
import PersonaRolService from '../control/PersonaRolService.js';

/** Composición de la aplicación; las dependencias pueden inyectarse en pruebas. */
export function mountDashboard({
  root,
  config = createApiConfig(),
  clinicaService,
  consultaService,
  pageSize = 10,
  autoLoad = true,
}) {
  const control = new DashboardControl({
    clinicaService: clinicaService || new ClinicaService({ config }),
    consultaService: consultaService || new ConsultaService({ config }),
    pacienteService: new PersonaRolService({ config }),
    pageSize,
  });
  const page = root;
  page.mount(control);
  const ready = autoLoad ? control.loadClinicas() : Promise.resolve();
  return { control, page, ready, destroy: () => page.destroy() };
}
