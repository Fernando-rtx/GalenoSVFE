/** Traducción de textos de interfaz. Conserva los datos y los valores de formularios. */
const english = new Map(Object.entries({
  'Nombre del paciente': 'Patient name', 'Escribe el nombre o apellido': 'Enter a first or last name',
  'Pacientes encontrados': 'Matching patients', 'Selecciona un paciente': 'Select a patient',
  'Opcional · busca pacientes de la clínica seleccionada': 'Optional · search patients in the selected clinic',
  'Se encontraron varios pacientes. Selecciona uno y aplica los filtros.': 'Several patients found. Select one and apply the filters.',
  'No hay pacientes con ese nombre en la clínica seleccionada.': 'No patients with that name in the selected clinic.',
  'GalenosSV · Pacientes y empleados': 'GalenosSV · Patients and staff',
  'GalenosSV, dashboard': 'GalenosSV, dashboard',
  'Galenos SV — Clínica General': 'Galenos SV — General Clinic',
  'Saltar al contenido': 'Skip to content', 'Menú de navegación': 'Navigation menu',
  'NAVEGACIÓN': 'NAVIGATION', 'Principal': 'Main navigation',
  'Búsqueda de citas': 'Appointment search', 'Login': 'Login', 'Consulta': 'Consultation',
  'Idioma': 'Language', 'Selecciona el idioma de la aplicación.': 'Select the application language.',
  'Instalar aplicación': 'Install application', 'Modo claro': 'Light mode', 'Modo oscuro': 'Dark mode',
  'Programación para Internet': 'Internet Programming', 'Universidad de El Salvador': 'University of El Salvador',
  'Clínica de trabajo': 'Working clinic', 'Selecciona una clínica': 'Select a clinic',
  'Reintentar conexión': 'Retry connection', 'Conexión restablecida.': 'Connection restored.',
  'Bandeja de consultas': 'Consultation inbox', 'Mis citas': 'My appointments',
  'Atención académica': 'Academic care', 'Historias de usuario': 'Consultation views',
  'GalenosSV · atención académica': 'GalenosSV · Academic care',
  'Consulta tus citas y atiende los casos asociados a la sesión académica que hayas iniciado.': 'View appointments and handle cases linked to your active academic session.',
  'Inicia sesión como empleado para ver las consultas asignadas a tu clínica y rol.': 'Sign in as a staff member to view consultations assigned to your clinic and role.',
  'Identifícate en el portal de empleado para abrir la bandeja.': 'Sign in through the staff portal to open your inbox.',
  'Identifícate en el portal de paciente para consultar tus citas.': 'Sign in through the patient portal to view your appointments.',
  'Conexión disponible. La información clínica no se guarda en este dispositivo.': 'Connection available. Clinical information is not stored on this device.',
  'Sin conexión. La aplicación está abierta, pero las consultas requieren conexión; no se conserva información clínica localmente.': 'Offline. Consultations require a connection; clinical information is not stored locally.',
  'La identidad se comparte de forma segura con el portal de paciente.': 'Your identity is securely shared with the patient portal.',
  'Abrir portal de paciente': 'Open patient portal', 'Abrir portal de empleado': 'Open staff portal',
  'Reintentar carga': 'Retry loading', 'Desde': 'From', 'Hasta': 'To', 'Consultar citas': 'View appointments',
  'Clínica': 'Clinic', 'Asignación': 'Assignment', 'Actualizar bandeja': 'Refresh inbox',
  'Sesión de paciente activa.': 'Patient session active.', 'La cuenta no tiene clínicas activas.': 'This account has no active clinics.',
  'No hay citas para los filtros seleccionados.': 'No appointments match the selected filters.',
  'No hay consultas para los filtros seleccionados.': 'No consultations match the selected filters.',
  'No hay consultas asignadas con esos filtros.': 'No assigned consultations match those filters.',
  'Pasos registrados': 'Recorded steps', 'Descargar ticket PDF': 'Download PDF ticket',
  'Ver registro': 'View record', 'Aún no hay pasos registrados.': 'No steps have been recorded yet.',
  'Sin datos registrados': 'No recorded data', 'Pendiente': 'Pending',
  '← Regresar a la bandeja': '← Back to inbox', 'Atención de consulta': 'Consultation care',
  'Historial': 'History', 'Registro de atención': 'Care notes',
  'Exámenes permitidos para este paso': 'Available tests for this step',
  'No hay exámenes configurados.': 'No tests have been configured.',
  'Guardar avance': 'Save progress', 'Siguiente paso': 'Next step', 'Guardar y avanzar': 'Save and continue',
  'Retroceder': 'Go back', 'Finalizar procedimiento': 'Finish procedure',
  'Registra la atención antes de guardar.': 'Enter care notes before saving.',
  'Atención parcial guardada.': 'Progress saved.', 'Procedimiento finalizado correctamente.': 'Procedure completed successfully.',
  'Transición guardada. La consulta ya puede corresponder a otro rol.': 'Step saved. The consultation may now be assigned to another role.',
  'Consulta tus citas': 'Find your appointments', 'Portal de empleados': 'Staff portal',
  'Identifícate para consultar tus citas y descargar tu ticket.': 'Identify yourself to view appointments and download your ticket.',
  'Identificación académica por documento, sin contraseña. Simulación para el examen.': 'Academic identification using a document, without a password. Exam simulation.',
  'Tipo de documento': 'Document type', 'Número de documento': 'Document number',
  'Selecciona un tipo': 'Select a type', 'Selecciona…': 'Select…',
  'Consultar paciente': 'Find patient', 'Iniciar sesión': 'Sign in', 'Cerrar sesión': 'Sign out',
  'Asignación de trabajo': 'Work assignment', 'Actualizar contexto': 'Refresh session',
  'Fecha inicial': 'Start date', 'Fecha final': 'End date', 'Buscar citas': 'Search appointments',
  'Anterior': 'Previous', 'Siguiente': 'Next', 'Cargando…': 'Loading…',
  'Selecciona tu documento.': 'Select your document.', 'Identificación completada.': 'Identification completed.',
  'Sin conexión con el backend. Reintenta cuando esté disponible.': 'Cannot connect to the server. Try again when it is available.',
  'Falta configurar la conexión con el backend.': 'The server connection has not been configured.',
  'No se pudo iniciar la aplicación. Revisa la configuración.': 'The application could not start. Check the configuration.',
  'No se pudo cargar la clínica asignada. Reintenta la conexión.': 'Could not load the assigned clinic. Retry the connection.',
  'Solicitud inválida.': 'Invalid request.', 'La sesión expiró. Identifícate de nuevo.': 'Your session expired. Sign in again.',
  'No tienes una asignación válida para esta operación.': 'You do not have a valid assignment for this action.',
  'No se encontró el registro solicitado.': 'The requested record was not found.',
  'El documento es ambiguo. Contacta a la clínica.': 'The document matches multiple records. Contact the clinic.',
  'Revisa el tipo y el formato del número de documento.': 'Check the document type and number format.',
  'Revisa el documento, la clínica y las fechas.': 'Check the document, clinic and dates.',
  'El servidor no pudo completar la operación. Reintenta.': 'The server could not complete the action. Try again.',
  'La respuesta del servidor no es válida. Reintenta.': 'The server response is invalid. Try again.',
  'Tipo de documento no encontrado': 'Document type not found', 'Tipo de documento no disponible': 'Document type unavailable',
  'Ingrese el número de documento': 'Enter the document number', 'Formato de documento inválido': 'Invalid document format',
  'Persona no encontrada': 'Person not found', 'Documento ambiguo; contacte a la clínica': 'Ambiguous document; contact the clinic',
  'No tiene asignaciones disponibles para este portal': 'No assignments are available for this portal',
  'Identifíquese para continuar': 'Identify yourself to continue', 'Sesión no válida para este portal': 'Session not valid for this portal',
  'El servidor tuvo un error interno. Intenta nuevamente.': 'The server encountered an internal error. Try again.',
  'El servidor rechazó los datos. Revisa el formulario.': 'The server rejected the data. Check the form.',
  'No se pudo conectar con el servidor. Revisa la conexión y vuelve a intentar.': 'Could not connect to the server. Check your connection and try again.',
  'El servidor tardó demasiado. Intenta nuevamente.': 'The server took too long. Try again.',
  'La fecha inicial debe ser anterior a la fecha final.': 'The start date must be before the end date.',
  'PANEL DE CONSULTAS': 'CONSULTATION PANEL', 'Consultas': 'Consultations',
  'Consulta los registros de tu clínica de trabajo.': 'View records from your working clinic.',
  'Selecciona una tarjeta para consultar su detalle.': 'Select a card to view its details.',
  'Clínica seleccionada': 'Selected clinic', 'Sin seleccionar': 'Not selected',
  'Total con estos filtros': 'Total matching these filters', 'En esta página': 'On this page',
  'consultas': 'consultations', 'resultados': 'results', 'Filtros': 'Filters',
  'Aplicar filtros': 'Apply filters', 'Limpiar filtros': 'Clear filters', 'Limpiar': 'Clear',
  'Paciente': 'Patient', 'Rol': 'Role', 'Procedimiento': 'Procedure', 'Estado': 'Status',
  'Guardar': 'Save', 'Cancelar': 'Cancel', 'Cerrar': 'Close', 'Editar': 'Edit',
  'Nombre': 'Name', 'Nombres': 'First name', 'Apellidos': 'Last name', 'Observaciones': 'Notes',
  'Activo': 'Active', 'Activa': 'Active', 'Inactivo': 'Inactive', 'Inactiva': 'Inactive',
  'Sí': 'Yes', 'No': 'No', 'Detalle': 'Details', 'Acciones': 'Actions',
  'Ver detalle': 'View details', 'Atender consulta': 'Open consultation',
  'Abrir atención': 'Open care', 'Historial de pasos': 'Step history',
  'No hay consultas asignadas en este rango de fechas.': 'No consultations are assigned in this date range.',
  'Selecciona el tipo de documento.': 'Select the document type.',
  'Tipo de documento no disponible.': 'Document type unavailable.',
  'Ingresa el número de documento.': 'Enter the document number.',
  'Identifícate primero.': 'Sign in first.', 'Sesión cerrada.': 'Signed out.',
  'Contexto actualizado.': 'Session refreshed.', 'Ticket descargado.': 'Ticket downloaded.',
  'Conexión disponible. Puedes reintentar.': 'Connection available. You can try again.',
  'Sin conexión. Puedes reintentar al volver la conexión.': 'Offline. Try again when your connection returns.',
  'Ingresa un rango de fechas válido.': 'Enter a valid date range.',
  'Selecciona una clínica donde estés registrado.': 'Select a clinic where you are registered.',
  'Búsqueda de citas · GalenosSV': 'Appointment search · GalenosSV',
  'Atención clínica · GalenosSV': 'Clinical care · GalenosSV', 'Atención clínica': 'Clinical care',
  'Selecciona una consulta para revisar procedimientos, actividades, órdenes y resultados.': 'Select a consultation to review procedures, activities, orders and results.',
  'Selecciona una tarjeta para consultar el seguimiento de la atención.': 'Select a card to review care progress.',
  'PENDIENTE': 'PENDING', 'EN_CURSO': 'IN PROGRESS', 'COMPLETADO': 'COMPLETED', 'RETROCEDIDO': 'RETURNED',
  '02 / BÚSQUEDA': '02 / SEARCH', '03 / RESULTADOS': '03 / RESULTS',
  'Encuentra lo que necesitas': 'Find what you need', 'Filtros opcionales': 'Optional filters',
  'Filtros de consultas': 'Consultation filters', 'Asignación PersonaRol': 'Patient assignment',
  'UUID de la asignación': 'Assignment UUID',
  'Opcional · dentro de la clínica seleccionada': 'Optional · within the selected clinic',
  'Gestión de consultas': 'Consultation management', 'Órdenes y resultados': 'Orders and results',
  'Por página': 'Per page', 'Selecciona una clínica para consultar sus registros.': 'Select a clinic to view its records.',
  'Volver a cargar consultas': 'Reload consultations', 'Persona': 'Person', 'Inicio · UTC': 'Start · UTC',
  'Sin resultados cargados': 'No results loaded', 'Página anterior': 'Previous page', 'Página siguiente': 'Next page',
  'VISTA DE DETALLE': 'DETAIL VIEW', 'Detalle de consulta': 'Consultation details',
  'Selecciona una consulta para ver su información.': 'Select a consultation to view its information.',
  'Volver a cargar detalle': 'Reload details',
  'Las fechas se muestran en UTC. Los datos ausentes se indican como “Sin especificar”.': 'Dates are shown in UTC. Missing data is marked as “Not specified”.',
  'Instalación manual': 'Manual installation', 'Gestión clínica': 'Clinic management', 'Gestión': 'Management',
  'Acceso limitado a usuarios autorizados.': 'Access restricted to authorized users.',
  'Activa JavaScript para utilizar el dashboard de consultas.': 'Enable JavaScript to use the consultation dashboard.',
  'Nueva consulta': 'New consultation', 'Asociar procedimiento': 'Add procedure',
  'Procedimientos y pasos de la consulta': 'Consultation procedures and steps',
  'Editar paso': 'Edit step', 'Procedimiento de consulta': 'Consultation procedure', 'Editar consulta': 'Edit consultation',
  'Buscar paciente por nombre o DUI': 'Search patients by name or DUI', 'Buscar pacientes': 'Search patients',
  'Referencia externa': 'External reference', 'Procedimiento activo': 'Active procedure',
  'Procedimientos anteriores': 'Previous procedures', 'Más procedimientos': 'More procedures',
  'Inicio · hora local': 'Start · local time', 'Fin · hora local (opcional)': 'End · local time (optional)',
  'Estado del paso': 'Step status', 'Completa este campo obligatorio.': 'Complete this required field.',
  'Revisa el formato y el valor de este campo.': 'Check the format and value of this field.',
  'Cargando clínicas…': 'Loading clinics…', 'No hay clínicas disponibles.': 'No clinics are available.',
  'Cargando consultas…': 'Loading consultations…', 'No hay consultas en esta página.': 'No consultations on this page.',
  'No hay citas en el rango seleccionado.': 'No appointments in the selected date range.',
  'Sin especificar': 'Not specified', 'Sin nombre': 'Unnamed', 'Persona sin nombre': 'Unnamed person',
  'Sin paso': 'No step', 'No registrado': 'Not recorded',
}));

const prefixes = [
  ['Sesión activa:', 'Active session:'], ['Paciente:', 'Patient:'], ['Clínica:', 'Clinic:'],
  ['Rol:', 'Role:'], ['Procedimiento:', 'Procedure:'], ['Paso actual:', 'Current step:'],
  ['Responsable:', 'Assigned staff:'],
];
let language = 'es';
export const getLocale = () => language === 'en' ? 'en-US' : 'es-SV';
export function translate(text, targetLanguage = language) {
  if (targetLanguage !== 'en') return text;
  if (english.has(text)) return english.get(text);
  const appointments = text.match(/^(\d+) citas encontradas\. Mostrando (\d+) a (\d+)\.$/);
  if (appointments) return `${appointments[1]} appointments found. Showing ${appointments[2]} to ${appointments[3]}.`;
  const detail = text.match(/^Ver detalle de (.+)$/);
  if (detail) return `View details for ${detail[1]}`;
  const page = text.match(/^(\d+)–(\d+) de (\d+) consultas$/);
  if (page) return `${page[1]}–${page[2]} of ${page[3]} consultations`;
  const state = text.match(/^· (PENDIENTE|EN_CURSO|COMPLETADO|RETROCEDIDO)$/);
  if (state) return `· ${english.get(state[1])}`;
  let result = text;
  for (const [source, target] of prefixes) {
    result = result.replace(new RegExp(`(^| · )${source}`, 'g'), `$1${target}`);
  }
  return result;
}

export function mountLanguage() {
  const select = document.querySelector('#idioma');
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const roots = new Map();
  const excluded = 'script,style,textarea,input,option[value]:not([value=""]):not([value="true"]):not([value="false"]),[data-name],[data-i18n-ignore]';
  function valueFor(node, value, store) {
    const old = store.get(node);
    const source = old && old.rendered === value ? old.source : value;
    const rendered = source.replace(/^(\s*)(.*?)(\s*)$/s, (_, before, text, after) => before + translate(text) + after);
    store.set(node, { source, rendered });
    return rendered;
  }
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || node.parentElement.closest(excluded)) return;
      const rendered = valueFor(node, node.data, originals);
      if (rendered !== node.data) node.data = rendered;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches(excluded)) return;
      if (node.matches('time[datetime]')) {
        const date = new Date(node.dateTime);
        if (!Number.isNaN(date.getTime())) {
          const formatted = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/El_Salvador' }).format(date);
          if (node.textContent !== formatted) node.textContent = formatted;
        }
        return;
      }
      let stored = attributes.get(node);
      if (!stored) { stored = new Map(); attributes.set(node, stored); }
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
        if (!node.hasAttribute(attr)) continue;
        const rendered = valueFor(attr, node.getAttribute(attr), stored);
        if (node.getAttribute(attr) !== rendered) node.setAttribute(attr, rendered);
      }
      if (node.shadowRoot) observe(node.shadowRoot);
    }
    for (const child of node.childNodes) visit(child);
  }
  function observe(root) {
    if (roots.has(root)) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(visit);
        else visit(record.target);
      }
    });
    roots.set(root, observer);
    observer.observe(root, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });
    visit(root);
  }
  function change(next) {
    language = next === 'en' ? 'en' : 'es';
    document.documentElement.lang = language;
    select.value = language;
    try { localStorage.setItem('galenos-language', language); } catch { /* Preferencia opcional. */ }
    // Recorre también los ShadowRoots ya descubiertos, sin recrear formularios ni sesiones.
    for (const root of roots.keys()) visit(root);
    document.dispatchEvent(new CustomEvent('galenos:idioma', { detail: { language } }));
  }
  observe(document.documentElement);
  let saved;
  try { saved = localStorage.getItem('galenos-language'); } catch { /* Usa español por defecto. */ }
  change(saved);
  const onChange = () => change(select.value);
  select.addEventListener('change', onChange);
  return { destroy() { select.removeEventListener('change', onChange); for (const observer of roots.values()) observer.disconnect(); } };
}
