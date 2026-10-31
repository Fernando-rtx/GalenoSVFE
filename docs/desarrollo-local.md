# Estación de desarrollo: clinica

JSF y REST utilizan el mismo WAR y datasource jdbc/pgdb en postgres_db:5432/clinica.
El frontend consume REST v2 autenticado. El modo demo está desactivado en el backend principal.
El worktree backend existente se trasladó a **~/Desktop/GalenosSV_CRUD**, rama feat/aplicacion-rest-completa.
No es otro repositorio ni una copia del proyecto. GalenosSV_Revision conserva su checkout anterior.

## Servicios y enlaces

| Servicio | Dirección |
| --- | --- |
| JSF | http://localhost:9080/GalenosSV/ |
| Consulta JSF | http://localhost:9080/GalenosSV/paginas/Consulta.xhtml |
| Dashboard | http://localhost:3000/#main |
| Personas, documentos, contactos y roles | http://localhost:3000/#persona |
| Procedimientos → pasos → exámenes/secuencias | http://localhost:3000/#procedimiento |
| Exámenes → tipos asociados | http://localhost:3000/#examen |
| Clínicas | http://localhost:3000/#clinica |
| Roles | http://localhost:3000/#rol |
| Tipos de documento/contacto/examen | http://localhost:3000/#tipoDocumento / #tipoMedioContacto / #tipoExamen |
| Contexto REST | http://localhost:9080/GalenosSV/resources/v2/contexto |
| pgAdmin | http://localhost:5050 |

La API requiere BASIC y alcance por clínica. Abrir un endpoint sin sesión devuelve401 deliberadamente.
Para /v2/consulta se requiere ?idClinica=UUID; el selector obtiene el UUID mediante clinica_disponible.
Órdenes y resultados se abren desde un paso de la consulta; no hay entradas duplicadas de menú.

## Acceso y configuración privada

administrador-local: lectura, escritura y administración global de catálogos/personas.
lector-local: lectura clínica, sin escritura ni acceso a la administración de datos personales.
Ambos tienen asignada explícitamente la clínica original. Nuevas clínicas necesitan asignación
explícita en GALENOS_API_ACTOR_CLINICS y reinicio de Liberty; crearlas no concede acceso clínico automáticamente.
Las asignaciones PersonaRol de negocio no conceden roles de seguridad de Liberty.

Contraseñas fuera de Git: ~/Library/Application Support/GalenosSV/credentials.json (permisos600).
No se usan contraseñas PostgreSQL para iniciar sesión web. La autorización vive en memoria del
frontend; cerrar sesión elimina su acceso y vuelve a deshabilitar el selector del dashboard.
El perfil es development local, con Liberty limitado a loopback. No habilitarlo como servicio de producción.

Liberty conserva server.env y configDropins/overrides/galenos-local-api.xml privados en
~/openliberty/wlp/usr/servers/GalenosSV. El override apunta al WAR del worktree estable.
El server.env del nuevo worktree enlaza al archivo privado original de GalenosSV_Revision.
No se versionaron credenciales, no se crearon respaldos ni clones de clinica.

## Encendido y apagado

Docker Desktop debe estar iniciado. Ejecutar solo los servicios que no estén activos:

```sh
docker start postgres_db pgadmin4
cd ~/Desktop/GalenosSV_CRUD
mvn package
~/openliberty/wlp/bin/server run GalenosSV
```

En otra terminal, si BrowserSync no está en3000:

```sh
cd ~/Desktop/GalenoSVFE
npm run dev
```

Usar JDK21. Liberty está instalado en ~/openliberty/wlp. No iniciar otra instancia si9080 ya está ocupado.
Apagar con Ctrl+C en esas terminales, o ~/openliberty/wlp/bin/server stop GalenosSV.
No detener PostgreSQL compartido ni borrar volúmenes para apagar las interfaces.

El Liberty CRUD demo19083 fue detenido después de verificar el backend principal. El demo legado19082
y su PostgreSQL15433 se conservaron para compatibilidad con las suites0.2; la aplicación actual no los usa.
No se eliminaron contenedores, volúmenes ni bases.

## Pruebas y límites de la comprobación

| Tipo | Resultado final comprobado |
| --- | --- |
| Maven package/JUnit (unitarias, incluidos dobles Mockito) | 774, sin fallos/errores/omitidas; WAR generado |
| JaCoCo de JUnit | 63,31% líneas; 49,24% ramas; target/site/jacoco/index.html |
| Mocha unitario | 416, sin fallos |
| Transporte HTTP sintético | 9, sin fallos; no acredita PostgreSQL |
| Integración HTTP de lectura v2 | 24, sin fallos; usa los veinte DAO y verifica401/403 |
| Chromium con clinica | 8 casos de flujo aprobados; siete utilizan filas DESARROLLO, uno solo navega/lee |
| JSF | Las19 páginas responden200; no se afirma prueba manual de cada formulario |

Comandos de pruebas:

```sh
# Backend
cd ~/Desktop/GalenosSV_CRUD
mvn package
# Frontend
cd ~/Desktop/GalenoSVFE
npm test
npm run check
npm run test:transport
GALENO_INTEGRATION_PROFILE=development \
GALENOS_LOCAL_CREDENTIALS="$HOME/Library/Application Support/GalenosSV/credentials.json" \
npm run test:integration
```

Los ocho scripts de desarrollo en test/browser (administracion_clinica, catalogos_clinica,
clinica_desarrollo, documentos_contactos_clinica, flujo_procedimiento_clinica, relaciones_clinica,
ediciones_clinica y navegacion_clinica) se ejecutaron
con Playwright Python y Chromium externos ya instalados; no se añadió dependencia npm. Los scripts
separan lecturas de escrituras de desarrollo y verifican recuperaciones HTTP/SELECT cuando corresponde.
No ejecutar test/crud (perfil sintético anterior) contra clinica. El perfil0.2 sigue disponible en el runner
para su entorno anterior; no se confunde con la integración v2 de la base principal.

Los datos nuevos tienen marcadores DESARROLLO/Desarrollo. Solo se eliminaron asociaciones y filas
creadas expresamente por las pruebas. No se modificó la clínica original. La prueba de secuencias
rechazó un ciclo y comprobó que no apareció el enlace. No se provocó una caída de PostgreSQL ni
se declara un rollback real únicamente por verificar llamadas Mockito.

La equivalencia de CambiarRol se adapta a identidad autenticada + clínica autorizada; no se permite
suplantar una identidad eligiendo cualquier PersonaRol. La política clínica de producción y el vínculo
cuenta↔profesional siguen siendo una decisión del equipo. Los formularios y flujos CRUD de desarrollo
están publicados; la matriz de19 páginas y20 DAO está en implementacion-crud.md.
