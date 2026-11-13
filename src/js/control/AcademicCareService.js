import DefaultService from './DefaultService.js';

export default class AcademicCareService {
  constructor(config) {
    this.identity = new DefaultService({ resource: 'empleadoIdentidad', config });
    this.patientClinics = new DefaultService({ resource: 'pacienteClinicas', config });
    this.patientAppointments = new DefaultService({ resource: 'pacienteCitas', config });
    this.employeeAppointments = new DefaultService({ resource: 'empleadoConsultas', config });
    this.care = new DefaultService({ resource: 'atencion', config });
    this.ticket = new DefaultService({ resource: 'pacienteTicket', config });
    this.documentTypes = new DefaultService({ resource: 'tipoDocumento', config });
  }
  verifyEmployee(query, options) { return this.identity.get({ ...options, query }); }
  findPatient(query, options) { return this.patientClinics.get({ ...options, query }); }
  findPatientAppointments(first, max, query, options) { return this.patientAppointments.findRange(first, max, { ...options, query }); }
  findEmployeeAppointments(first, max, query, options) { return this.employeeAppointments.findRange(first, max, { ...options, query }); }
  getCare(id, query, options) { return this.care.findById(id, { ...options, query }); }
  register(data, options) { return this.care.create(data, options); }
  getTicket(id, query, options) { return this.ticket.findById(id, { ...options, query }); }
  findDocumentTypes(first, max, options) { return this.documentTypes.findRange(first, max, options); }
}
