# Fixtures académicos: datos exclusivamente ficticios

`clinicas-demo.json` y `consulta-demo.json` se capturaron el 2026-10-23 desde
los recursos Jakarta REST reales de la rama backend `feat/consulta-read-model`,
con una base aislada cargada desde `Galenos/test/fixtures/consulta_demo.sql`.
Corresponden al contrato API 0.2.

El archivo de clínicas incluye dos clínicas activas. El de consultas incluye
las cinco filas sintéticas de la primera clínica, con nombres/fechas ausentes
en algunas filas para desarrollar los estados de presentación. Los registros
de otras clínicas siguen en el fixture SQL del backend para comprobar filtros.

Estos JSON permiten que Itzep prepare adaptadores y Rodrigo desarrolle tarjetas
antes de integrar las ramas REST. No acreditan una integración HTTP del
dashboard. La base URL se configura; los UUID y fechas del fixture nunca deben
copiarse como valores fijos a componentes o métodos del cliente.

No hay campo médico ni estado clínico de Consulta. Acordar el view-model y los
eventos de tarjetas entre Rodrigo e Itzep; los campos y nulabilidad del DTO se
describen en `docs/api-contract.md`.

`tipo-documento.json` es el ejemplo sintético de TipoDocumento publicado en
el mismo contrato 0.2. Se añadió para las pruebas del módulo HTTP; no es una
captura nueva de un backend ejecutado en esta sesión. Ningún fixture se importa
desde el código de producción de `src/`.
