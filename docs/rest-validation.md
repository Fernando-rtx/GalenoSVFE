# Validación y reproducción del lote TipoDocumento

## Resultados observados — 2026-10-23

| Comprobación | Resultado |
|---|---|
| `mvn test -B -q` | 716 tests, 0 fallos, 0 errores, 0 omitidos |
| Nuevas pruebas Java | 34 casos de recurso, DTO y configuración |
| `mvn package -DskipTests -B -q` | WAR generado correctamente |
| Suite HTTP con PostgreSQL real | 12 tests aprobados, incluidos subcasos de validación/preflight |
| Persistencia no disponible en BD sintética | HTTP 500 seguro; tabla restaurada |
| Chromium desde otro origen | HTTP 200, `Total-registros` leído como `"2"`, una fila y 404 legible |

Base efectiva de prueba: nueva `galenos_rest_test_*` sobre PostgreSQL 12.22.
Servidor separado `GalenosSVRestIT`, HTTP 19080. El primer arranque en segundo
plano no sobrevivió al comando de ejecución; el ensayo final usó `server run`
en una sesión persistente. La respuesta JSON observada corresponde al fixture
sintético publicado, sin usar datos clínicos.

## Pruebas Java y empaquetado

Desde el backend:

```sh
mvn test
mvn package -DskipTests
```

La primera ejecución local usó Maven 3.9.16 y OpenJDK 25.0.4.1, compilando con
`release=21`. La comprobación posterior con JDK 21 completo se ejecuta mediante
`./demo verify`; ver `docs/demo-setup.md`. El WAR conserva JSF y PrimeFaces.

## Ambiente HTTP aislado

Usar PostgreSQL y una base nueva y vacía con nombre `galenos_rest_test_*`.
Importar **solo** `test/fixtures/tipo_documento.sql`; este fixture es mínimo,
incluye datos ficticios y no sirve para validar pantallas clínicas completas.
No importar datos de pacientes para este ensayo.

Si se utiliza el contenedor PostgreSQL de desarrollo, establecer `PG_CONTAINER`
al nombre correcto y crear, por ejemplo, `galenos_rest_test_local`:

```sh
docker exec "$PG_CONTAINER" sh -c \
  'createdb -U "$POSTGRES_USER" galenos_rest_test_local'
docker exec -i "$PG_CONTAINER" sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d galenos_rest_test_local' \
  < test/fixtures/tipo_documento.sql
```

Preparar un servidor Liberty separado. Definir `WLP_INSTALL_DIR` a la instalación
existente y `MAVEN_REPO` al repositorio local Maven (habitualmente `$HOME/.m2/repository`).

```sh
export WLP_USER_DIR="$PWD/target/rest-it/usr"
"$WLP_INSTALL_DIR/bin/server" create GalenosSVRestIT
mkdir -p "$WLP_USER_DIR/servers/GalenosSVRestIT/apps" \
  "$WLP_USER_DIR/servers/GalenosSVRestIT/jdbc" \
  "$WLP_USER_DIR/shared/resources/primefaces"
cp src/main/liberty/config/server.xml "$WLP_USER_DIR/servers/GalenosSVRestIT/"
cp target/GalenosSV.war "$WLP_USER_DIR/servers/GalenosSVRestIT/apps/"
cp "$MAVEN_REPO/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar" \
  "$WLP_USER_DIR/servers/GalenosSVRestIT/jdbc/"
cp "$MAVEN_REPO/org/primefaces/primefaces/15.0.17/primefaces-15.0.17-jakarta.jar" \
  "$WLP_USER_DIR/shared/resources/primefaces/"
cp src/main/liberty/config/server.env.example \
  "$WLP_USER_DIR/servers/GalenosSVRestIT/server.env"
chmod 600 "$WLP_USER_DIR/servers/GalenosSVRestIT/server.env"
```

Editar ese `server.env` privado para apuntar a la base sintética y credenciales
de prueba; definir `HTTP_PORT=19080`, `HTTPS_PORT=19443`,
`GALENOS_CORS_ORIGINS=http://localhost:3000`, paginación por defecto 20 y máximo
100. Configurar también `keystore_password` con un valor local generado, para
que Liberty pueda crear sus claves. Ninguna clave debe entrar en Git.

Arrancar en una terminal y esperar a que la aplicación esté disponible:

```sh
"$WLP_INSTALL_DIR/bin/server" run GalenosSVRestIT
```

En otra terminal, desde el backend:

```sh
export GALENOS_API_BASE_URL=http://localhost:19080/GalenosSV/resources
export GALENOS_TEST_ORIGIN=http://localhost:3000
python3 test/integration/tipo_documento_http.py
```

La suite usa HTTP real, sin simular `fetch`, JDBC ni respuestas REST. Debe
ejecutarse únicamente sobre el fixture de dos registros, con límite máximo 100.

## Navegador

Si Playwright y Chromium están disponibles como herramientas externas:

```sh
python3 test/integration/tipo_documento_browser.py
```

Opcionalmente `GALENOS_TEST_CHROMIUM` señala el ejecutable instalado. La prueba
crea temporalmente una página local en `GALENOS_TEST_ORIGIN` (su puerto debe
estar libre), dispara un GET con preflight y comprueba que JavaScript puede
leer `Total-registros`, datos y un error 404. No instala dependencias de frontend.
El ensayo local usó Playwright Python 1.63.0 y Chromium existente en el equipo.

## Fallo de persistencia

Solo en la base sintética, renombrar temporalmente `tipo_documento` a
`tipo_documento_synthetic_unavailable`, ejecutar:

```sh
python3 test/integration/tipo_documento_storage_failure_http.py
```

Restaurar el nombre original **incluso si la prueba falla** y repetir la suite
HTTP normal. La comprobación espera 500, mensaje genérico, ausencia del conteo
y conservación de CORS. No aplicar esta simulación a una base clínica.

## Alcance de la evidencia

Los resultados cubren el WAR real, JPA/DAO/PostgreSQL, DTO y comportamiento CORS
en HTTP y navegador. No acreditan autorización clínica, dashboard de Itzep,
componentes de Rodrigo ni un recorrido completo de pantallas JSF con este
fixture mínimo. La validación posterior con Java 21 y el arranque automático
están documentados en `docs/demo-setup.md`. El servidor de prueba se detiene al terminar;
las bases sintéticas quedan separadas y no se borran automáticamente.
