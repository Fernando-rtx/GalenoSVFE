# Historial de Web Components y PWA

La arquitectura vigente está documentada en [arquitectura-frontend.md](arquitectura-frontend.md). Las páginas viven en `src/js/boundary/modelos/`; la capa de acceso REST, `DefaultService` y los veinte Services viven en `src/js/control/`. El arranque está en `src/js/main.js`.

El manifiesto y Service Worker están en `src/`. El worker guarda solamente recursos estáticos de su lista pública y excluye respuestas REST. Pruebas de navegador, política de caché y evidencia actual: [webcomponents-browser-pwa.md](webcomponents-browser-pwa.md).
