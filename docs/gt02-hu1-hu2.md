# GT02 HU1/HU2 — Integración con el frontend existente

Esta rama conserva el shell, el dashboard, los módulos anteriores y los estilos
compartidos. main.js integra los portales en la navegación existente. Las tarjetas
paciente reutilizan tarjeta-consulta con portalPaciente=true; su modo anterior
conserva los eventos consulta-seleccionada y la presentación UTC.

La base de ejecución normal es PostgreSQL clinica a través del backend Java:
http://localhost:9080/GalenosSV/resources/. El navegador nunca se conecta a JDBC.
No se guardan documentos, tokens, contexto ni PDF en almacenamiento persistente.
La configuración environment.local.js es privada e ignorada por Git.

Servicios y responsabilidades:

- IdentidadAcademicaService reutiliza TipoDocumentoService/DefaultService para
  catálogos y DefaultResponse/DefaultError. Añade identificación por documento,
  sesiones efímeras y transporte PDF que no existían en DefaultService.
- IdentificacionControl valida entradas y mantiene la sesión en memoria;
  BusquedaCitasControl valida clínica y rango. El servidor revalida pertenencia.
- BusquedaCitasModel e InicioSesionModel son Custom Elements con Shadow DOM y
  presentación común PortalAcademicoModel. CSS usa variables del tema existente.
- portal-academico.js compone controles, cancelación, estados y descarga Blob.
- El Service Worker sólo precarga recursos públicos de lista cerrada.

Contrato obligatorio en el backend Galenos:
docs/gt02-contratos-rest.md y docs/gt02-hu1-hu2-entrega.md. Describe todos los
endpoints, DTO, respuestas HTTP, permisos y las limitaciones de despliegue.

Para HU3/HU4 importar control/contexto-empleado.js:
obtenerContextoEmpleado() obtiene una copia del contexto; actualizarContextoEmpleado(signal)
lo revalida; solicitudEmpleado(path, idPersonaRol, options) añade Bearer y
X-Persona-Rol desde el control de HU2. Elegir una asignación completa del contexto:
idPersonaRol, idRol, rolNombre, idClinica y clinicaNombre. Nunca combinar el rol
de una entrada con la clínica de otra. El backend exige la misma pertenencia.

No hay usuarios, contraseñas, BASIC ni LTPA. Los roles empleados los configura el
servidor contra los IDs existentes. Esta identificación es académica y no concede
administración ilimitada. El CRUD antiguo conserva su código; las escrituras
quedan denegadas hasta integrar políticas explícitas HU3/HU4. El dashboard de
lectura funciona con la asignación elegida. No se modifican sus componentes internos.

Verificación realizada:

- npm test:441 pruebas,18 nuevas con fixtures sintéticos y Fetch simulado.
- npm run check:95 archivos JavaScript válidos.
- npm run test:transport:9 pruebas HTTP contra servidor sintético sin PostgreSQL.
- test/browser/gt02.py:11 comprobaciones Chromium contra Java y PostgreSQL temporal
  con datos ficticios, sin interceptar Fetch. Incluye descarga PDF, desconexión y
  reconexión reales del navegador, sesión y dashboard previo. Cero errores de página.
- Evidencia: test/evidence/gt02-browser.json, gt02-hu1.png y gt02-hu2.png.
- El backend verificó47 casos HTTP reales y795 pruebas Maven. HU2 también se
  comprobó contra clinica en sólo lectura, con hashes iguales en sus veinte tablas.

La base temporal galenos_rest_test_gt02_20261111_hu12 se usó exclusivamente en
pruebas automatizadas autorizadas. No sustituye clinica en la configuración normal.
El rol Paciente en clinica está inactivo: se comprobó su rechazo; no se cambió.
El flujo válido HU1 y su PDF Java se verificaron con PostgreSQL ficticio. El PDF
es real y legible, pero sus páginas son imágenes: texto no seleccionable.

Para repetir Chromium, instalar Playwright/Chromium en un entorno de herramientas,
arrancar el backend de ensayo según scripts/gt02_test_runtime.py del repositorio
Galenos, apuntar temporalmente environment.local.js a localhost:19085, iniciar
npm run dev y ejecutar python test/browser/gt02.py. Restaurar después la conexión
normal9080. La ejecución de estos tests no autoriza escrituras en clinica.

El servidor compartido9080 no fue sustituido ni se hizo push o merge a main.
La rúbrica oficial independiente sigue pendiente de localizar; se verificaron
los requisitos del usuario y no se afirma que HU3/HU4 estén implementadas.
