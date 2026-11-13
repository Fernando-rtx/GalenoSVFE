import { PortalAcademicoModel } from './PortalAcademicoModel.js';
export class InicioSesionModel extends PortalAcademicoModel {
  constructor() {
    super();
    this.portal = 'empleado';
  }
}
customElements.define('inicio-sesion', InicioSesionModel);
