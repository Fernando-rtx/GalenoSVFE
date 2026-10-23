# Verificación de la entrega de acceso a datos

Fecha: 23 de octubre de 2026, America/El_Salvador.
Base frontend: `81a20569e6247826ec5d0cd83adf08ac1f854caf`.
Backend contrastado y ejecutado: `e4edd6c6da3baa0988182d60f48cb9eccfd54e93`.
Contrato REST: 0.2, sin modificaciones al documento oficial.

## Resultados ejecutados

| Comprobación | Resultado real |
|---|---|
| npm test | 344 pruebas unitarias aprobadas con Mocha, Chai y Sinon. |
| npm run check | 46 archivos JS/CJS con sintaxis válida: 45 de la entrega y una configuración local ignorada. |
| npm run test:transport | 9 pruebas aprobadas, Fetch nativo contra servidores HTTP sintéticos. |
| npm run test:integration | 7 pruebas aprobadas contra GalenosSV real, sin mocks. |
| Independencia de unitarias | Las 344 también pasaron con TCP y Fetch real bloqueados. |
| BrowserSync | Sirvió el grafo público de 28 módulos, enlazado y evaluado por Node VM vía HTTP. |
| Navegador | No ejecutado: el conector devolvió cero navegadores disponibles. Node no acredita CORS de navegador. |
| npm ls --depth=0 | BrowserSync 3.0.4, Chai 6.3.0, Mocha 12.0.3, Sinon 22.1.0; coincide con el lock. |
| npm audit | Cero vulnerabilidades conocidas reportadas. |
| git diff --check | Sin errores; también se comprueban los archivos nuevos al incluirlos en el índice. |

## Integración real y alcance

Se clonó el backend oficial en una carpeta temporal, sin cambiar su código.
Se ejecutó su demo con JDK 21.0.12.1, Open Liberty 26.0.0.8 y PostgreSQL 12.22 (imagen fijada por el demo),
contenedor/volumen propios y fixtures sintéticos oficiales. No se utilizó ni
modificó postgres_db ni la base clinica. La configuración y los secretos
locales generados por el demo permanecen fuera del repositorio frontend.

El demo requirió forzar el idioma inglés del proceso Java para que su script
reconociera la salida de productInfo; no se editó el script del backend:

```sh
env JAVA_TOOL_OPTIONS='-Duser.language=en -Duser.country=US' ./demo start
```

Los puertos y el origen de BrowserSync se eligieron en demo.env, sin dispersarlos
en DAO. La configuración pública se obtuvo de ./demo info/connection.json.
El environment.local.js de las pruebas obtiene IDs por HTTP; no fija UUID.
Está excluido de Git. Los casos reales comprobaron lista/detalle/404 de
TipoDocumento y Consulta, y lista de Clínica, con cabeceras y validadores del
cliente. Las siete pruebas no incluyen escrituras, pues no hay contratos.

Siete verificaciones adicionales de la sesión, con Fetch real y aserciones,
comprobaron: filtros fechaDesde/fechaHasta/idPersonaRol; página vacía que
conserva total; detalle de otra clínica con 404; cabeceras CORS de origen,
exposición de Total-registros y ausencia de credenciales; preflight 204 sin
cuerpo; origen no autorizado con 403; y parámetro inválido con 422 y CORS en el
error. Son verificaciones HTTP/Node, no una suite de navegador ni pruebas de
los 17 recursos que aún no existen. Las pruebas Java documentadas por Fernando
no se cuentan como pruebas ejecutadas aquí.

## Reproducción

```sh
npm ci
npm test
npm run check
npm run test:transport
npm run dev
```

Para integración, seguir demo-setup.md en el repositorio Galenos y confirmar
que la conexión declara datos sintéticos. Copiar el ejemplo de configuración
a test/integration/environment.local.js, completar baseUrl desde ./demo info
y casos con IDs de las respuestas REST. Consulta exige query.idClinica en
lista y detalle. Configurar missingId/missingStatus:404 solo para IDs ausentes
del fixture de prueba. Ejecutar npm run test:integration con el backend activo.

Sin configuración/servidor la integración no está aprobada: el comando informa
INTEGRACIÓN NO EJECUTADA y devuelve código 1. El número de archivos de check
puede ser 45 si no existe la configuración local. Para navegador, abrir
/test/integration/runner.html desde BrowserSync, sin proxy; permitir su origen
exacto en GALENOS_CORS_ORIGINS y exponer Total-registros.

## Cobertura y revisión

Se cubren HTTP 200, 201, 204, 403, 404, 422 y 500; JSON inválido, cuerpo vacío,
cabeceras faltantes, fallos de red/lectura, timeout y cancelación. Los estados
201/204 y escrituras se ejercitan solo con contratos sintéticos del transporte.
Las lecturas oficiales esperan 200. Los errores conservan estado y cabeceras
cuando están disponibles. DefaultResponse usa datos/totalDatos.

El inventario prueba las 20 exportaciones y su correspondencia de recurso,
configuración/Fetch inyectable y las cinco operaciones publicadas. Cada DAO
pendiente rechaza sus cinco métodos con CONTRACT_PENDING, incluso con argumentos
inválidos, sin HTTP. Las tres clases verificadas bloquean métodos no publicados.

Se revisaron rutas y DTO contra Resource/RestApplication y API 0.2. No hay
UUID literales ni direcciones de despliegue en src; la URL GitHub en el registro
solo es evidencia versionada. Los UUID, hosts fixture.invalid y nombres de prueba
están confinados a fixtures y pruebas sintéticas. No hay datos clínicos reales,
secretos, imports de fixtures en producción ni Fetch duplicado en DAO concretos.
Entity no depende de DOM o Fetch. Las rutas propuestas para Fernando están solo
en documentación, sin registro ejecutable.

AGENTS.md, contrato y documentos oficiales, fixtures de Clínica/Consulta y
espacios de Rodrigo permanecen iguales a origin/main. Los cambios compartidos
son README.md, .gitignore y test/fixtures/README.md. El lock contiene solo
dependencias de desarrollo, con versiones e integridad fijadas.

Evaluación: preparado para revisión de la rama. Quedan pendientes CORS desde
navegador, contratos de 17 recursos, escrituras y autenticación/autorización
reales. No se presenta la capa completa como 20 integraciones REST funcionales.
