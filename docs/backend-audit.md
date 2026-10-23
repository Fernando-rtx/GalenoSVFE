# Auditoría inicial del backend

**Fecha:** 2026-10-23
**Repositorio:** `/home/fernando/NetBeansProjects/Galenos`
**Rama observada:** `Cortez`
**Commit observado:** `480b325` (`fix(a11y): render consultation clinic notice as status`)

## Estado de Git

- `git status -sb`: limpio, `Cortez...origin/Cortez`.
- Ramas locales observadas: `Cortez`, `backup/fix-0da093f`, `feature/fernando`,
  `feature/fernando-parcial` y `main`.
- Remoto `origin`: `https://github.com/Fernando-rtx/Galenos`.
- Worktree observado: el checkout local en `Cortez`.
- `main` y `feature/fernando-parcial` apuntan a `b5b77ea` y estaban 2 commits
  adelante de `origin/main`; `feature/fernando` estaba 4 commits adelante de
  su remoto. No se modificó el repositorio backend.

## Hallazgos verificables

- Es un WAR Maven `GalenosSV` con Java 21 (`maven.compiler.release=21`), Jakarta
  EE 11.0.0, Open Liberty 26.0.0.8, Liberty Maven Plugin 3.12.1, PrimeFaces
  15.0.17 Jakarta y PostgreSQL JDBC 42.7.4.
- `server.xml` declara HTTP 9080, HTTPS 9443, contexto `/GalenosSV` y JNDI
  `jdbc/pgdb`. La base por defecto configurada allí es `clinica`; credenciales
  se esperan desde variables de entorno.
- `docs/ENTORNO.md` indica PostgreSQL 18.6, pero dice que la base por defecto
  es `universidad`. Esto contradice el `server.xml`; el nombre efectivo de la
  base y la disponibilidad del servidor requieren confirmación en ejecución.
- Se encontraron modelos y DAO Java para `TipoDocumento` y `Consulta`, además
  de documentación previa de lógica clínica. Esos DAO JSF/JPA no constituyen
  endpoints HTTP.
- La búsqueda de `jakarta.ws.rs`, `javax.ws.rs`, `@ApplicationPath` y
  `@Path(...)` en el código Java, `pom.xml` y `web.xml` no encontró recursos
  REST. No existe una ruta REST confirmada en el estado inspeccionado.
- No hay evidencia local inspeccionada de una API REST desplegada ni de
  cabeceras CORS, paginación o un encabezado `Total-registros`.

## Entorno observado

- `java -version`: OpenJDK 25.0.4.1; no coincide con el Java 21 objetivo del
  POM. El compilador está configurado para release 21.
- `mvn -version`: Apache Maven 3.9.16.
- No se ejecutó `mvn test` ni se desplegó Liberty en esta auditoría.
- No se inspeccionaron valores de credenciales ni datos de pacientes.

## Bloqueos y siguiente lote

1. Confirmar la configuración efectiva de base de datos y ejecutar el WAR en un
   ambiente de prueba con Java 21 y datos sintéticos.
2. Diseñar e implementar un recurso REST de lectura para `TipoDocumento` sobre
   los DAO existentes, con DTO explícito y pruebas HTTP; acordar ruta, forma de
   respuesta, permisos, paginación y cabeceras antes de fijar el contrato.
3. Probar CORS desde el origen de desarrollo aprobado y publicar resultados.
4. Luego acordar el DTO y los permisos de lectura de `Consulta` con el equipo.

Hasta completar esos pasos, GalenoFE no debe consumir ni anunciar endpoints.
