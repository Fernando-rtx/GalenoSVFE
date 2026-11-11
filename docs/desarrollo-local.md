# Estación académica local de GalenosSV

GalenosSV usa exclusivamente datos ficticios y funciona sin cuentas de usuario. La SPA
abre directamente el dashboard. Las clínicas activas aparecen en el selector y los
módulos de gestión ofrecen las operaciones publicadas por REST v2.

| Servicio | Dirección |
| --- | --- |
| Frontend SPA/PWA | http://localhost:3000/ |
| Backend JSF | http://localhost:9080/GalenosSV/ |
| API REST v2 | http://localhost:9080/GalenosSV/resources/v2/contexto |

## Arranque

1. Usa JDK 21, Maven y Open Liberty 26.0.0.8, y comprueba que el PostgreSQL local que
   contiene la base ficticia `clinica` esté activo.
2. En el backend, copia `src/main/liberty/config/server.env.example` a `server.env`
   en el mismo directorio. Completa los valores JDBC locales y protege el archivo con
   `chmod 600 src/main/liberty/config/server.env`. El archivo está excluido de Git.
3. Libera el puerto 9080 si lo usa el servidor anterior. Ejecuta `./run.sh` desde
   el backend. Maven crea y usa `GalenosSVAcademico` y despliega el contexto
   `/GalenosSV`. Mantén los overrides y claves del servidor anterior en su instancia.
4. En el frontend ejecuta `npm ci` y `npm run dev`. Abre http://localhost:3000/.
   Si cambias el puerto de Liberty, ajusta la URL del frontend mediante
   `src/js/control/environment.local.js` y el valor `gestionConfig.baseUrl`.

Liberty y BrowserSync escuchan en `127.0.0.1`. Usa únicamente los orígenes de
loopback configurados en CORS. Evita publicar el servidor, compartirlo mediante un
túnel o habilitarlo en la red. El navegador accede a REST y Liberty utiliza la
conexión interna `jdbc/pgdb`. El Service Worker almacena los recursos públicos del
shell y el servidor marca las respuestas REST como `no-store`.

La instancia académica habilita las características de Liberty que requieren
Faces, REST, JPA y EJB. No carga `appSecurity`, BASIC ni LTPA. Los perfiles y claves
del servidor anterior permanecen en su directorio. `Rol` y `PersonaRol` conservan sus
relaciones clínicas. La clínica seleccionada sigue formando parte de las operaciones
que la requieren y el servicio valida la pertenencia de sus registros.

## Verificación

- Backend: `mvn test`.
- Frontend: `npm test`, `npm run check` y `npm run test:transport`.
- Con ambos servicios activos: `npm run test:integration` verifica REST v2 con el
  cliente real y PostgreSQL, sin credenciales. Usa lecturas y solicitudes rechazadas
  por las validaciones. Las relaciones sin registros ficticios suficientes se omiten.
- Con Playwright y Chromium instalados: `python test/browser/navegacion_clinica.py`
  comprueba el flujo del navegador sin escrituras.

Consulta [los contratos REST v2](api-gestion-v2.md) para ver qué recursos permiten
eliminar registros. Las operaciones de prueba que escriben deben dirigirse a un
entorno sintético desechable.
