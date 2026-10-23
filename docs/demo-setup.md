# Backend académico reproducible

Este arranque corresponde a Fernando: prepara Java/Maven/Liberty/PostgreSQL,
carga datos ficticios y entrega la conexión HTTP. No implementa DAOs JavaScript,
dashboard ni componentes de los compañeros.

## Requisitos

- Linux con Python 3.11 o posterior, Docker Engine funcionando y acceso al
  comando `docker`. WSL2 puede usarse con esos mismos requisitos; no se ha
  validado ejecución nativa de Windows.
- Un **JDK 21 completo**, no solo JRE. Se comprueba la versión antes de arrancar.
- Maven instalado. La versión comprobada es 3.9.16; las versiones de plugins,
  Jakarta, JDBC y Liberty se toman del POM.
- Internet en la primera ejecución si faltan dependencias Maven o la imagen
  PostgreSQL. Las siguientes reutilizan caché y volumen.

En este equipo se instaló Temurin 21.0.13+9 en una carpeta del usuario,
conservando Java 25 como predeterminado del sistema. Se descargó desde la
[publicación oficial de Temurin](https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.13%2B9)
y se contrastó SHA-256 con el checksum publicado. Archivo Linux x64:
`OpenJDK21U-jdk_x64_linux_hotspot_21.0.13_9.tar.gz`.
Checksum: `d7f5d5cf865a2902b70ff549b97586a7d3f234e016f041ab447ea740c7d66d1c`.
No es necesario que los compañeros usen esa misma ruta local.

## Validación observada — 2026-10-23

`./demo verify --browser` completó con Temurin **21.0.13+9** y Maven 3.9.16:

| Comprobación | Resultado |
|---|---|
| Compilación limpia `mvn clean package` | 103 fuentes y 65 fuentes de prueba compiladas con javac/release 21 |
| Suite Java | 739 pruebas, cero fallos/errores/omitidas |
| Protecciones del orquestador | 7 pruebas aprobadas |
| HTTP real contra PostgreSQL 12.22 | 12 pruebas de TipoDocumento + 9 de Consulta aprobadas |
| Chromium desde otro origen | Clínicas, consultas, conteos, detalle y 404 legibles |
| Recursos ajenos | `postgres-local` rechazado por propiedad; sigue funcionando |
| JDK incorrecto | Se rechazó explícitamente Java 25 antes del arranque |
| Reinicio rápido | TIME_WAIT no bloquea un puerto libre; un listener activo sí se rechaza |
| Copia limpia del repositorio | `./demo start` preparó su propia base/runtime y pasó las 21 pruebas HTTP más Chromium |

Runtime usado: Open Liberty 26.0.0.8. El reporte reproducible queda en
`.galenos-demo/verification.json`; no contiene claves. Los detalles históricos
del ensayo inicial con Java 25 se conservan en las guías anteriores.
Una copia del reporte observado se conserva en
`test/evidence/java21-verification.json`. La prueba desde copia limpia empezó
sin `target/`, `demo.env` ni `.galenos-demo/`; usó otros puertos/contenedor para
comprobar aislamiento y se detuvo con `./demo stop`.

## Un comando para iniciar

Desde una copia del backend:

```sh
./demo start
```

El comando busca JDK 21 en `GALENOS_JAVA_HOME`, `JAVA_HOME`, la instalación
local de Fernando (`~/.local/share/galenos/jdk-21`) o el Java del PATH.
Si hay que indicar otra ruta o cambiar puertos/orígenes:

```sh
cp demo.env.example demo.env
```

Editar valores simples `CLAVE=valor`, sin expansión de variables de shell.
`demo.env` está ignorado por Git y las variables de shell prevalecen sobre él.
Un `GALENOS_JAVA_HOME` explícito que señale Java 25 se rechaza, sin cambiar el
Java del sistema. No poner credenciales en este archivo.

El arranque realiza estas acciones:

1. Crea un contenedor PostgreSQL propio, marcado con una etiqueta de propiedad
   ligada a esta carpeta, y un volumen persistente propio.
2. Genera claves locales aleatorias y carga exclusivamente ambos fixtures
   sintéticos en una base nueva `galenos_demo_local`.
3. Prepara Open Liberty **26.0.0.8** mediante el perfil Maven `demo`, con una
   distribución fijada. El perfil deja intacta la instalación Liberty habitual.
4. Compila el WAR con JDK 21, configura su servidor aislado y espera un GET
   correcto. `start` omite tests; `verify` hace una compilación limpia y pruebas.
5. Mantiene el proceso en primer plano y muestra la URL efectiva y CORS.

Los fixtures tienen una revisión SHA-256: si cambia el dataset, el comando se
detiene para evitar reemplazar una base existente. Elegir otro nombre de
contenedor permite preparar otra base; no se borran tablas, volúmenes ni
contenedores automáticamente. Tampoco se acepta controlar un contenedor ajeno.

## Configuración predeterminada

| Uso | Valor |
|---|---|
| API base | `http://localhost:19081/GalenosSV/resources` |
| Origen CORS del frontend | `http://localhost:3000` |
| HTTP / HTTPS | 19081 / 19444 |
| PostgreSQL de demostración | `127.0.0.1:15432` |
| Contenedor / volumen | `galenos-demo-db` / `galenos-demo-db-data` |
| Base | `galenos_demo_local`, exclusivamente sintética |
| Datos | 2 tipos de documento, 2 clínicas activas, 7 consultas sintéticas |

El backend y PostgreSQL se enlazan a loopback. No se ocupa el puerto 5432 ni se
usan las claves, base o contenedor clínico existente. Se conserva PostgreSQL
12.22 de la validación anterior, fijado al digest de imagen en `scripts/demo.py`;
este entorno no representa una actualización de PostgreSQL de la aplicación.

Todo el estado local queda en `.galenos-demo/`, fuera de `target/`, de modo que
`mvn clean` no borre las claves necesarias para reutilizar el volumen. Esa
carpeta tiene permisos privados y está ignorada en Git. Nunca subir su
`secrets.json`, `postgres.env` ni `server.env`.

## Verificar y detener

```sh
./demo verify
./demo verify --browser
./demo status
./demo info
```

`verify` ejecuta siete pruebas del orquestador, `mvn clean package` con Java 21,
12 pruebas HTTP de TipoDocumento y 9 de Consulta. Al terminar detiene el
servidor y su contenedor, conservando el volumen. Genera evidencia sin claves
en `.galenos-demo/verification.json` y logs privados en `.galenos-demo/logs/`.

`--browser` es opcional: requiere Playwright Python y Chromium como herramientas
externas ya instaladas. Puede definirse `GALENOS_TEST_CHROMIUM` al ejecutable.
La prueba crea una página temporal en el primer origen CORS configurado; su
puerto debe estar libre y ser `localhost` o `127.0.0.1`. No es el dashboard final.

Con el servidor iniciado en otra terminal:

```sh
./demo check
./demo check --browser
./demo stop
```

También se detiene con Ctrl+C en la terminal de `start`. Al reiniciar, el
dataset se reutiliza sin INSERT duplicados. Si el puerto está ocupado, se
informa el problema sin terminar el proceso ajeno.

## Entrega de conexión para Itzep

```sh
./demo info
```

Devuelve únicamente configuración pública: `baseUrl`, rutas de recursos,
orígenes permitidos, `credentials: "omit"` y `countHeader: "Total-registros"`.
La misma información se guarda en `.galenos-demo/connection.json` cuando la
API está lista. `info` describe configuración; no prueba disponibilidad.

Itzep debe consumir los recursos publicados en `docs/api-contract.md` desde
su cliente HTTP. Cada compañero puede ejecutar su backend local con el mismo
comando y configurar esa URL en su frontend; no necesita acceder al equipo de
Fernando ni recibir credenciales de PostgreSQL.

Rodrigo recibe los datos normalizados por Itzep. La integración final
DAO → dashboard → componentes requiere sus módulos; esos archivos no se
crean ni modifican como parte de este arranque.
