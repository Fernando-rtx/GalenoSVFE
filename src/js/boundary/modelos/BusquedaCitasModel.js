import { PortalAcademicoModel } from './PortalAcademicoModel.js';
export class BusquedaCitasModel extends PortalAcademicoModel {
  constructor() {
    super();
    this.portal = 'paciente';
  }
}
customElements.define('busqueda-citas', BusquedaCitasModel);
