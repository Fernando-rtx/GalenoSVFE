import { createApiConfig, ClinicaDAO, ConsultaDAO } from '../index.js';
import DashboardControl from '../control/DashboardControl.js';
import DashboardPage from '../boundary/pages/DashboardPage.js';

/** Composición de la aplicación; las dependencias pueden inyectarse en pruebas. */
export function mountDashboard({ root, config = createApiConfig(), clinicaDAO, consultaDAO, pageSize = 10, autoLoad = true }) {
  const control = new DashboardControl({
    clinicaDAO: clinicaDAO || new ClinicaDAO({ config }),
    consultaDAO: consultaDAO || new ConsultaDAO({ config }), pageSize
  });
  const page = new DashboardPage(root, control);
  const ready = autoLoad ? control.loadClinicas() : Promise.resolve();
  return { control, page, ready, destroy: () => page.destroy() };
}
