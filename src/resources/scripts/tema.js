(function () {
    "use strict";

    var storageKey = "galenos.theme";

    function readTheme() {
        try {
            return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
        } catch (error) {
            // Si el navegador bloquea el almacenamiento, el botón sigue funcionando.
            return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.style.colorScheme = theme;
    }

    applyTheme(readTheme());

    // Faces puede volver a ejecutar los recursos durante update="@all".
    if (window.galenosThemeReady) {
        return;
    }
    window.galenosThemeReady = true;

    document.addEventListener("click", function (event) {
        var button = event.target instanceof Element && event.target.closest("#themeToggle");
        if (!button) {
            return;
        }
        var nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        try {
            window.localStorage.setItem(storageKey, nextTheme);
        } catch (error) {
            // Se conserva el tema de esta página aunque no se pueda guardar la preferencia.
        }
    });

    // También restaura la preferencia al volver con el historial del navegador.
    window.addEventListener("pageshow", function () {
        applyTheme(readTheme());
    });
}());
