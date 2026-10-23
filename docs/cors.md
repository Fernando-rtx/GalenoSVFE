# CORS y coordinación con Fernando

Configuración confirmada por API 0.2 y CorsFilter del backend `e4edd6c6`:

- `GALENOS_CORS_ORIGINS`: orígenes HTTP(S) exactos separados por comas; por defecto vacío.
- Métodos de preflight permitidos GET/HEAD; anuncia GET, HEAD, OPTIONS.
- Cabeceras de solicitud permitidas: Accept y Content-Type.
- `Access-Control-Expose-Headers: Total-registros`.
- Sin Access-Control-Allow-Credentials; los DAO utilizan `credentials: "omit"`.
- Vary incluye origen, método y cabeceras del preflight; Cache-Control es no-store.
- Los errores para orígenes aprobados conservan CORS.

BrowserSync informa su URL al iniciar. La configuración local escucha solo en
127.0.0.1; registrar en GALENOS_CORS_ORIGINS el origen usado para abrir la página,
incluyendo puerto. `localhost` y `127.0.0.1` no son intercambiables. No suponer
que el origen utilizado por Fernando en sus ensayos es el de esta sesión.

La API actual no emite Location porque no hay POST. No se exige exponerla ni
se habilitan escrituras como parte de este módulo. Una revisión futura del
contrato podrá ampliar métodos/cabeceras con coordinación del backend.

Access-Control-Allow-Headers permite cabeceras de solicitud;
Access-Control-Expose-Headers hace legibles las de respuesta. Agregar
Access-Control-* desde el cliente o utilizar no-cors no habilita acceso. Si
Total-registros no es legible, las listas fallan con INVALID_RESPONSE; no se
inventa el conteo. Véase el [protocolo CORS de Fetch](https://fetch.spec.whatwg.org/#http-responses).

El runner `/test/integration/runner.html` ejecuta la suite real desde el origen
frontend y no hace proxy. Node, curl y un servidor sintético no acreditan CORS
de navegador. Los resultados previos del backend están documentados por
Fernando en `rest-validation.md` y `consulta-demo.md`, y no se atribuyen a esta
implementación. En esta entrega se comprobaron además las cabeceras HTTP del
demo real, el preflight 204 y CORS en errores 422. Esto no acredita la política
del navegador; ver [resultados y limitaciones](verificacion.md).
