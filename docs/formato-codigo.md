# Formato del código frontend

El código versionado de `src/`, `test/`, `scripts/`, `bs-config.cjs` y `package.json` se formatea con Prettier 3.6.2 (JavaScript, HTML, CSS, JSON y manifiesto). Los scripts Python de `test/browser/` se formatean con Black 25.9.0 y longitud de línea de 100 caracteres.

La configuración de Prettier está en `.prettierrc.json`; `.prettierignore` excluye dependencias, evidencias generadas, el lockfile y `environment.local.js`. Black usa `pyproject.toml`. Las herramientas se ejecutaron desde directorios temporales y no se agregaron dependencias al proyecto.

Para repetir el formato con esas versiones instaladas:

```bash
prettier --write src test scripts bs-config.cjs package.json
black test/browser
```

Antes de confirmar cambios, ejecuta `npm run check`, `npm test`, `npm run test:transport` y las pruebas de navegador correspondientes. Un commit de formato no debe alterar rutas, DTO, reglas clínicas ni comportamiento.
