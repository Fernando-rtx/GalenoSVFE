# Revisión de la rúbrica del segundo parcial

Revisión contra `FRONTED/definicionSegundoParcialPPI115_gt02_2026.pdf` y el
estado publicado en `main` después de fusionar los PR #8 y #9. Este cuadro
distingue funciones existentes de criterios probados durante esta revisión.

| Orden | Criterio | Estado comprobado | Pendiente para darlo por completo |
| --- | --- | --- | --- |
| 1 | HU4: seguimiento de consulta | La pantalla muestra consulta, procedimiento y pasos; permite `PENDIENTE → EN_CURSO → COMPLETADO`. REST/SQL confirmó persistencia, conflicto 409, clínica ajena 404 y concurrencia 200/409. | Repetir la prueba de navegador con la base sintética reiniciada y conservar evidencia al ejecutar `test/browser/flujo_operativo_hu4.py`. Órdenes y resultados se abren desde el paso; falta validar una cadena con datos suficientes para el parcial. |
| 2 | HU3: dashboard de empleado | El dashboard lista consultas por clínica, fechas y asignación disponibles; las tarjetas abren detalle. | La estación de `main` es académica y sin login. No ofrece clínicas/roles autorizados por identidad ni cola de trabajo personal. |
| 3 | HU2: login del empleado | No demostrado en la SPA académica. Backend conserva perfiles de seguridad para despliegues anteriores, pero la configuración académica los desactiva. | Acordar identidad, proveedor/autenticación y asociación segura con PersonaRol, roles técnicos y clínicas. No simular login usando documento ni selector de rol. |
| 4 | HU1: búsqueda pública de citas | No implementada como experiencia de paciente en la SPA. Hay pantallas administrativas de documentos/personas y consultas, que no cumplen esta historia. | Definir contrato seguro para tipo/número de documento, clínica autorizada del paciente, rango de fechas y ticket PDF del backend. No exponer datos personales mediante los endpoints administrativos actuales. |
| 5 | SPA, Web Components y modularidad | `main` conserva navegación SPA, Custom Elements, módulos ES y capas Boundary–Control–Entity/Services. Las 426 pruebas unitarias y sintaxis de 85 archivos pasaron. | Mantener compatibilidad en la entrega final y adjuntar el commit evaluado. |
| 6 | PWA e instalación | Manifiesto, Service Worker, shell offline e instalabilidad Chromium cuentan con comprobaciones automatizadas previas en `test/browser/webcomponents_pwa.py`. | Repetir en el commit de entrega y realizar instalación manual en navegador compatible. El offline conserva el shell, no el acceso a datos clínicos ni el flujo de atención. |
| 7 | Pruebas | 426 unitarias JS, 9 transporte HTTP, 776 pruebas Java; WAR empaquetado. Integración real REST/PostgreSQL pasó en `galenos_demo_crud`. | Completar integración de HU1/HU2 cuando se definan sus contratos y credenciales de prueba. El test HU4 de navegador requiere estado inicial PENDIENTE. |
| 8 | UI, responsive y accesibilidad | Hay componentes y estilos propios, navegación por teclado y checks de móvil en pruebas existentes. | Repetir revisión visual y accesible sobre todas las historias del parcial, en el entorno que usará el ingeniero. |

## Repetir HU4

Usar únicamente la base aislada `galenos_demo_crud`; no ejecutar escrituras en
`clinica`. El paso fixture `00000000-0000-4000-8000-000000019001` debe estar en
`PENDIENTE`. Si se restablece por SQL con Liberty encendido, reiniciar Liberty
para invalidar su caché JPA antes de probar. Playwright Python es una herramienta
externa opcional, no una dependencia de la SPA. Prepararla una vez en `/tmp` y
ejecutar BrowserSync en el origen permitido por CORS:

```sh
python3 -m venv /tmp/galeno-browser-tools
/tmp/galeno-browser-tools/bin/pip install playwright==1.55.0
PLAYWRIGHT_BROWSERS_PATH=/tmp/galeno-browser-tools/browsers \
  /tmp/galeno-browser-tools/bin/playwright install chromium

cd /home/rodrigo/Documentos/Programacion\ para\ Internet/flujo-clinico/GalenoSVFE
GALENOS_BROWSER_BASE_URL=http://127.0.0.1:3001 python3 test/browser/flujo_operativo_hu4.py
```

Si se usa ese entorno temporal, sustituir `python3` por
`/tmp/galeno-browser-tools/bin/python` en la última línea.

La prueba termina el paso en `COMPLETADO`; para repetirla, restablecer solo esa
fila del fixture y reiniciar Liberty.

## Decisiones necesarias para HU1 y HU2

Las historias que exponen información clínica o identifican empleados requieren
un contrato aprobado por el equipo backend y el ingeniero. Los endpoints actuales
no se deben presentar como API pública de citas ni como autenticación de empleados.
La propuesta de contratos y decisiones pendientes está en
[propuesta backend](https://github.com/Fernando-rtx/Galenos/blob/test/rubrica-parcial-2026/docs/propuesta-hu1-hu2.md).
