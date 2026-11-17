/** Traducción de textos de interfaz. Conserva los datos y los valores de formularios. */
const english = new Map(Object.entries({
  'Descarga tu ticket': 'Download your ticket',
  'Instala GalenosSV para abrirla como una app.': 'Install GalenosSV to open it as an app.',
  'Puedes instalar GalenosSV o continuar con tu ticket PDF.': 'You can install GalenosSV or continue with your PDF ticket.',
  'Instalar app': 'Install app', 'App instalada': 'App installed',
  'Instalación solicitada. Sigue las indicaciones del navegador.': 'Installation requested. Follow your browser instructions.',
  'La app ya está instalada.': 'The app is already installed.',
  'Instalación cancelada. Puedes descargar tu ticket PDF.': 'Installation cancelled. You can download your PDF ticket.',
  'En iPhone o iPad, abre GalenosSV en Safari y pulsa Compartir → Añadir a pantalla de inicio → Añadir.': 'On iPhone or iPad, open GalenosSV in Safari and tap Share → Add to Home Screen → Add.',
  'En Safari para Mac, selecciona Archivo → Añadir al Dock… (o Compartir → Añadir al Dock) y confirma con Añadir. Safari no permite abrir esa ventana desde este botón.': 'In Safari for Mac, choose File → Add to Dock… (or Share → Add to Dock) and confirm with Add. Safari does not allow this button to open that window.',
  'El navegador no ha ofrecido el aviso de instalación. Abre su menú y busca Instalar GalenosSV o Instalar aplicación. Si no aparece, puedes seguir usando la versión web y descargar tu ticket PDF.': 'The browser has not offered an installation prompt. Open its menu and look for Install GalenosSV or Install app. If unavailable, you can keep using the web version and download your PDF ticket.',
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
  'Idioma': 'Language', 'Cambiar idioma': 'Change language',
  'Selecciona el idioma de la aplicación.': 'Select the application language.',
  'Cambiar a modo claro': 'Switch to light mode', 'Cambiar a modo oscuro': 'Switch to dark mode',
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
  'Acceso de empleados': 'Staff access', 'Ingresar': 'Sign in',
  'Rol y clínica de trabajo': 'Work role and clinic', 'Entrar al dashboard': 'Open dashboard',
  'Identifícate con tu documento y elige el rol y la clínica donde vas a trabajar.': 'Identify yourself with your document and choose your work role and clinic.',
  'Selecciona el tipo que corresponde a tu documento.': 'Select the type that matches your document.',
  'Escribe para buscar un tipo...': 'Type to search document types...',
  'No hay tipos de documento coincidentes.': 'No matching document types.',
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
  'Crear cita': 'Create appointment', 'Abrir bandeja de atención': 'Open care inbox',
  'Atender consulta': 'Open consultation',
  'Recepción del paciente': 'Patient check-in',
  'Confirma la llegada e identidad del paciente. La consulta médica la registra el médico en su paso.': 'Confirm the patient’s arrival and identity. The physician records the medical consultation in their step.',
  'Los exámenes y resultados se registran durante los pasos clínicos.': 'Tests and results are recorded during the clinical steps.',
  'Registro de recepción': 'Reception record', 'Registro de atención': 'Care record',
  'Ejemplo: paciente llegó y se confirmó su identidad.': 'Example: patient arrived and identity was confirmed.',
  'Guardar registro de recepción': 'Save reception record', 'Confirmar recepción y avanzar': 'Confirm reception and advance',
  'Esta ruta no tiene un paso posterior a recepción. Solicita que revisen la ruta antes de finalizar.': 'This pathway has no step after reception. Ask for the pathway to be reviewed before finishing.',
  'Cita creada. La primera actividad quedó asignada a recepción.': 'Appointment created. The first activity is assigned to reception.',
  'Esta pantalla sirve para programar y revisar citas. Para registrar la recepción y avanzar la atención, abre la Bandeja de consultas del Dashboard.': 'Use this screen to schedule and review appointments. To register reception and continue care, open the Dashboard consultation inbox.',
  'Primero identifica al paciente. Después defines la cita y su ruta de atención.': 'First identify the patient. Then set the appointment and care pathway.',
  'Paso 1 de 2 · Paciente': 'Step 1 of 2 · Patient', 'Paso 2 de 2 · Cita y recepción': 'Step 2 of 2 · Appointment and reception',
  '1. Paciente': '1. Patient', '2. Cita y recepción': '2. Appointment and reception',
  'Busca a la persona antes de crear un registro nuevo.': 'Search for the person before creating a new record.',
  'Buscar por nombre o número de documento': 'Search by name or document number', 'Buscar paciente': 'Search patient',
  'Resultados': 'Results', 'Busca para ver pacientes disponibles': 'Search to view available patients',
  'Busca por nombre o documento antes de registrar a una persona nueva.': 'Search by name or document before registering a new patient.',
  'No aparece · Registrar paciente': 'Not listed · Register patient', 'Registrar paciente nuevo': 'Register new patient',
  'Guardar paciente y continuar': 'Save patient and continue', 'Volver al paciente': 'Back to patient',
  'Continuar a la cita': 'Continue to appointment', 'Busca y selecciona un paciente, o regístralo aquí para continuar.': 'Search and select a patient, or register one here to continue.',
  'Paciente seleccionado. Continúa para programar la cita.': 'Patient selected. Continue to schedule the appointment.',
  'Paciente:': 'Patient:', 'La primera actividad de la ruta se asignará a recepción.': 'The first activity in the pathway will be assigned to reception.',
  'Ruta de atención': 'Care pathway', 'Cargando rutas de atención…': 'Loading care pathways…',
  'Rutas anteriores': 'Previous pathways', 'Más rutas': 'More pathways',
  'Fecha y hora de la cita': 'Appointment date and time', 'Fin (opcional)': 'End (optional)',
  'Indicaciones para recepción (opcional)': 'Notes for reception (optional)',
  'Cargando procedimientos…': 'Loading procedures…', 'Reintentar carga': 'Retry loading',
  'No se pudieron cargar las rutas. Revisa tu conexión y vuelve a intentar.': 'Care pathways could not be loaded. Check your connection and try again.',
  'No hay rutas activas para esta clínica. Revisa la configuración de procedimientos.': 'There are no active pathways for this clinic. Check procedure setup.',
  'Las rutas disponibles aparecerán aquí.': 'Available pathways will appear here.',
  'El primer paso de la ruta se asigna al personal de recepción.': 'The first step in the pathway is assigned to reception staff.',
  'La primera actividad de la ruta se asignará a recepción.': 'The first activity in the pathway will be assigned to reception.',
  'El paciente se registrará con el rol Paciente en la clínica seleccionada.': 'The patient will be registered with the Patient role at the selected clinic.',
  'Referencia externa (opcional)': 'External reference (optional)',
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
  const pathways = text.match(/^(\d+) rutas? disponibles?\. La primera actividad se asigna a recepción\.$/);
  if (pathways) return `${pathways[1]} ${Number(pathways[1]) === 1 ? 'pathway' : 'pathways'} available. The first activity is assigned to reception.`;
  const state = text.match(/^· (PENDIENTE|EN_CURSO|COMPLETADO|RETROCEDIDO)$/);
  if (state) return `· ${english.get(state[1])}`;
  let result = text;
  for (const [source, target] of prefixes) {
    result = result.replace(new RegExp(`(^| · )${source}`, 'g'), `$1${target}`);
  }
  return result;
}

export function mountLanguage(scope) {
  const toggle = scope.querySelector('#languageToggle');
  const menu = scope.querySelector('#languageOptions');
  if (!toggle || !menu) return { destroy() {} };
  const options = [...menu.querySelectorAll('[data-language]')];
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
    for (const option of options)
      option.setAttribute('aria-pressed', String(option.dataset.language === language));
    try { localStorage.setItem('galenos-language', language); } catch { /* Preferencia opcional. */ }
    // Recorre también los ShadowRoots ya descubiertos, sin recrear formularios ni sesiones.
    for (const root of roots.keys()) visit(root);
    scope.dispatchEvent(new CustomEvent('galenos:idioma', { detail: { language } }));
  }
  observe(scope);
  let saved;
  try { saved = localStorage.getItem('galenos-language'); } catch { /* Usa español por defecto. */ }
  change(saved);
  function setOpen(open, returnFocus = false) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (returnFocus) toggle.focus();
    else if (open) options.find((option) => option.dataset.language === language)?.focus();
  }
  function onToggle() {
    setOpen(menu.hidden);
  }
  function onMenuClick(event) {
    const option = event.target.closest?.('[data-language]');
    if (!option || !menu.contains(option)) return;
    change(option.dataset.language);
    setOpen(false, true);
  }
  function onDocumentClick(event) {
    if (!toggle.parentElement.contains(event.target)) setOpen(false);
  }
  function onKeyDown(event) {
    if (event.key === 'Escape' && !menu.hidden) setOpen(false, true);
  }
  toggle.addEventListener('click', onToggle);
  menu.addEventListener('click', onMenuClick);
  scope.addEventListener('click', onDocumentClick);
  scope.addEventListener('keydown', onKeyDown);
  return {
    destroy() {
      toggle.removeEventListener('click', onToggle);
      menu.removeEventListener('click', onMenuClick);
      scope.removeEventListener('click', onDocumentClick);
      scope.removeEventListener('keydown', onKeyDown);
      for (const observer of roots.values()) observer.disconnect();
    },
  };
}
