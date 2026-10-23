# Consulta: entrega académica con datos ficticios

Decisión de Fernando el 2026-10-23: demostración académica con datos ficticios.
No se usará la selección libre de rol como si autenticara a una persona.
Rama backend: `feat/consulta-read-model`, basada en `19425d3`.
Rama frontend de contratos: `docs/consulta-contract`, basada en `13567d9`.
Estas referencias documentan los lotes de trabajo. La entrega se consolida en
`main` de ambos repositorios por instrucción expresa de Fernando de publicar
directamente, sin abrir PR.

## Resultados observados — 2026-10-23

| Comprobación | Resultado |
|---|---|
| `mvn test -B -q` | 739 pruebas, 0 fallos, 0 errores, 0 omitidas |
| Nuevos casos Java del lote | 23, incluidos bloqueo por defecto, configuración, filtros y DTO |
| Empaquetado Maven | WAR generado correctamente |
| HTTP Consulta demo | 9 pruebas aprobadas sobre PostgreSQL real |
| Regresión HTTP TipoDocumento | 12 pruebas aprobadas con el WAR actualizado |
| Demo desactivada (servidor 19080) | Clínica y ambos GET de Consulta devuelven 404; TipoDocumento mantiene 200 |
| Demo activa (servidor 19081) | Clínica, lista y detalle de Consulta devuelven datos del fixture |
| Chromium desde origen 3000 | Lee ambos conteos, persona ficticia y detalle; otra clínica devuelve 404 legible |

Esa primera ejecución usó Liberty 26.0.0.8, OpenJDK 25.0.4.1 y la base sintética
en PostgreSQL 12.22, compilando con `release=21`. Posteriormente se verificó
compilación limpia y ejecución con JDK 21 usando `./demo verify --browser`;
el arranque reproducible y sus requisitos están en `docs/demo-setup.md`.
Las copias JSON del frontend se capturaron de estas respuestas HTTP y se
validaron como datos del fixture, sin copiar información de pacientes reales.

## Implementación

- `GET /v1/clinica`: selección de clínicas activas con paginación y conteo.
- `GET /v1/consulta`: clínica obligatoria, filtros de fecha y PersonaRol,
  paginación y conteo del mismo conjunto filtrado.
- `GET /v1/consulta/{id}`: detalle dentro de la clínica seleccionada.
- DTO de ocho campos que obtiene nombres de las relaciones reales, emite
  fechas UTC y excluye información clínica libre y colecciones.
- Demo desactivada por defecto; configuración explícita y nombre de base de
  prueba obligatorio para habilitarla.

Se reutilizan `ConsultaDAO`, `ClinicaDAO`, `FiltroDAO` y el conteo existentes.
No se cambia el esquema de la aplicación ni sus reglas JSF. Se extraen UUID y
paginación a `RestParameters` porque ya se usan en tres recursos; las pruebas
existentes de TipoDocumento deben seguir pasando con el mismo contrato.

## Preparar el fixture

El camino automatizado es `./demo start`, que prepara su propio contenedor,
base, fixtures y runtime sin usar la base clínica. Las instrucciones manuales
siguientes se mantienen como referencia; no hacen falta al usar ese comando.

Preparar una base aislada y un servidor como en `docs/rest-validation.md`.
Además de `tipo_documento.sql`, importar `test/fixtures/consulta_demo.sql` una
sola vez en una base sin esas cinco tablas. Cargarlo con la cuenta usada por
el datasource o concederle SELECT sobre las tablas creadas. El fixture publica
dos clínicas activas, una inactiva, personas ficticias y siete consultas con
fechas que comprueban límites de día en El Salvador.

No ejecutar estos CREATE/INSERT contra una base clínica existente. No se usa
el contenido de pacientes del dump SQL del proyecto.

En el `server.env` privado de ese servidor:

```text
POSTGRESQL_DB_NAME=galenos_demo_local
GALENOS_DEMO_MODE=true
GALENOS_CLINIC_TIME_ZONE=America/El_Salvador
GALENOS_CORS_ORIGINS=http://localhost:3000
```

El nombre de base es ilustrativo: crear esa base con los fixtures o usar otra
con el prefijo permitido. Mantener las credenciales fuera de Git.

## Pruebas

```sh
mvn test
mvn package -DskipTests
```

Desplegar ese WAR en el servidor aislado, esperar a que arranque y definir la
URL efectiva. En el ensayo de Consulta se usa puerto 19081:

```sh
export GALENOS_API_BASE_URL=http://localhost:19081/GalenosSV/resources
export GALENOS_TEST_ORIGIN=http://localhost:3000
python3 test/integration/consulta_demo_http.py
python3 test/integration/tipo_documento_http.py
python3 test/integration/consulta_demo_browser.py
```

La suite comprueba filtrado entre clínicas, conteos, límites de fecha, valores
nulos, DTO, errores y CORS. No usa respuestas simuladas.
Para verificar la demo desactivada, reiniciar con `GALENOS_DEMO_MODE=false`:
ambos recursos demo deben responder 404, incluso con UUID válidos, mientras
TipoDocumento sigue funcionando.

Con `GALENOS_API_BASE_URL` apuntando a ese servidor desactivado:

```sh
python3 test/integration/consulta_disabled_http.py
```

La comprobación de navegador usa Playwright externo como la entrega anterior,
requiere libre el puerto de `GALENOS_TEST_ORIGIN` y admite
`GALENOS_TEST_CHROMIUM` para señalar un ejecutable ya instalado.

## Transferencia a Itzep y Rodrigo

El contrato es revisión 0.2 en `docs/api-contract.md`. El frontend recibe un
arreglo más `Total-registros`, y lo adapta a `DefaultResponse`. Debe pedir las
clínicas por API y cambiar la consulta según la selección; no escribir IDs
del fixture en los componentes.

Rodrigo recibe un modelo preparado por Itzep a partir de `personaNombre`,
`rolNombre`, `clinicaNombre`, `fechaInicio` y `fechaFin`. No usar UUID como nombre.
Cuando no hay fecha/nombre, la interfaz decide su texto de presentación; el DTO
mantiene null. No hay médico ni estado clínico confirmado. `docs/ui-contract.md`
y los eventos de tarjetas siguen siendo responsabilidad de Rodrigo e Itzep.

Las copias JSON de frontend en `test/fixtures/` son exclusivamente sintéticas y
permiten avanzar componentes sin depender de que las ramas ya estén integradas.
El dashboard, DAOs JS y componentes no se implementan en este lote de Fernando.
