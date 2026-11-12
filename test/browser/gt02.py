"""Chromium real -> frontend original adaptado -> Java REST -> PostgreSQL sintético.
No intercepta ni simula Fetch. La desconexión se provoca con Chromium offline.
"""

from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "test/evidence"
OUT.mkdir(exist_ok=True)
checks = []


def mark(text):
    checks.append(text)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            accept_downloads=True, viewport={"width": 1440, "height": 1050}
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://127.0.0.1:3000/#pacientes")
        patient = page.locator("busqueda-citas")
        expect(patient.locator("#tipo option")).to_have_count(2)
        mark("Catálogo cargado desde Java; sólo tipo activo disponible")
        expect(patient.locator("#valor")).to_be_disabled()
        patient.get_by_role("button", name="Consultar paciente").click()
        expect(patient.get_by_role("status")).to_contain_text("Selecciona el tipo")
        patient.locator("#tipo").select_option("00000000-0000-4000-8000-000000000001")
        patient.locator("#valor").fill("abc")
        patient.get_by_role("button", name="Consultar paciente").click()
        expect(patient.get_by_role("status")).to_contain_text("Revisa")
        patient.locator("#valor").fill("ZZZ")
        patient.get_by_role("button", name="Consultar paciente").click()
        expect(patient.get_by_role("status")).to_contain_text("No se encontró")
        mark("Tipo omitido, formato inválido e identidad inexistente rechazados")
        patient.locator("#valor").fill("ABC")
        patient.get_by_role("button", name="Consultar paciente").click()
        expect(patient.locator("[data-context]")).to_be_visible()
        expect(patient.locator("#clinica option")).to_have_count(3)
        mark("Paciente con dos clínicas propias obtenido del backend")
        patient.locator("#clinica").select_option("00000000-0000-4000-8000-000000000011")
        patient.locator("#desde").fill("2026-10-23")
        patient.locator("#hasta").fill("2026-10-22")
        patient.get_by_role("button", name="Buscar citas").click()
        expect(patient.get_by_role("status")).to_contain_text("rango de fechas válido")
        patient.locator("#desde").fill("2026-10-22")
        patient.get_by_role("button", name="Buscar citas").click()
        expect(patient.locator("tarjeta-consulta")).to_have_count(2)
        expect(patient.locator("tarjeta-consulta").first).to_contain_text("Procedimiento sintético")
        expect(patient.locator("tarjeta-consulta").first).to_contain_text(
            re.compile(r"(0:00|12:00)")
        )
        page.screenshot(path=str(OUT / "gt02-hu1.png"), full_page=True)
        with page.expect_download() as download:
            patient.locator("tarjeta-consulta").first.get_by_role("button").click()
        ticket = download.value
        pdfpath = OUT / "gt02-ticket.pdf"
        ticket.save_as(pdfpath)
        assert pdfpath.read_bytes().startswith(b"%PDF-1.4")
        pdfpath.unlink()  # El PDF sintético de evidencia se conserva en el backend, no duplicarlo.
        mark("Dos citas y procedimientos; descarga PDF Java real completada")
        patient.locator("#desde").fill("2026-10-24")
        patient.locator("#hasta").fill("2026-10-24")
        patient.get_by_role("button", name="Buscar citas").click()
        expect(patient.get_by_role("status")).to_contain_text("No hay citas")
        context.set_offline(True)
        patient.get_by_role("button", name="Buscar citas").click()
        expect(patient.get_by_role("status")).to_contain_text("Sin conexión")
        context.set_offline(False)
        patient.get_by_role("button", name="Reintentar conexión").click()
        expect(patient.get_by_role("status")).to_contain_text("Conexión restablecida")
        mark("Estado vacío y desconexión/reconexión reales del navegador")
        page.get_by_role("link", name="Portal de empleados").click()
        employee = page.locator("inicio-sesion")
        expect(employee.locator("#tipo option")).to_have_count(2)
        employee.locator("#tipo").select_option("00000000-0000-4000-8000-000000000001")
        employee.locator("#valor").fill("ABC")
        employee.get_by_role("button", name="Iniciar sesión").click()
        expect(employee.get_by_role("status")).to_contain_text("No tienes una asignación")
        expect(employee.locator("[data-context]")).to_be_hidden()
        mark("Paciente sin rol empleado rechazado por Java")
        employee.locator("#valor").fill("EMP")
        employee.get_by_role("button", name="Iniciar sesión").click()
        expect(employee.locator("[data-context]")).to_be_visible()
        expect(employee.locator("#asignacion option")).to_have_count(2)
        employee.locator("#asignacion").select_option("00000000-0000-4000-8000-000000000203")
        employee.get_by_role("button", name="Actualizar contexto").click()
        expect(employee.get_by_role("status")).to_contain_text("Contexto actualizado")
        expect(employee.locator("#asignacion")).to_have_value(
            "00000000-0000-4000-8000-000000000203"
        )
        page.screenshot(path=str(OUT / "gt02-hu2.png"), full_page=True)
        mark("Empleado con dos roles/clínicas; selección de PersonaRol y actualización")
        page.get_by_role("link", name="Consultas", exact=True).click()
        expect(page.locator("#main")).to_be_visible()
        expect(page.locator('[data-ui="clinica"]')).to_have_value(
            "00000000-0000-4000-8000-000000000012"
        )
        expect(page.locator('[data-ui="cards"] tarjeta-consulta')).to_have_count(2)
        mark("Dashboard y tarjeta originales reutilizados con la asignación elegida")
        page.get_by_role("link", name="Portal de empleados").click()
        employee.get_by_role("button", name="Cerrar sesión").click()
        expect(employee.get_by_role("status")).to_contain_text("Sesión cerrada")
        expect(employee.locator("#valor")).to_have_value("")
        mark("Cierre de sesión con revocación Java y borrado de estado del formulario")
        page.reload()
        expect(employee.locator("[data-login]")).to_be_visible()
        mark("La sesión no se restaura desde almacenamiento")
        assert page.evaluate("localStorage.length") == 0
        assert page.evaluate("sessionStorage.length") == 0
        urls = page.evaluate(
            """async () => { const out=[]; for (const name of await caches.keys()) { for (const req of await (await caches.open(name)).keys()) out.push(req.url); } return out; }"""
        )
        assert not any("/resources/v" in url or "/ticket" in url for url in urls)
        mark("Cache Storage sin REST, documentos, sesiones ni PDF")
        assert not errors, errors
        report = {
            "scope": "Chromium -> Fetch real -> Liberty Java -> PostgreSQL temporal sintético",
            "passed": len(checks),
            "checks": checks,
            "pageErrors": errors,
        }
        (OUT / "gt02-browser.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps({"passed": len(checks), "pageErrors": len(errors)}))
        browser.close()


if __name__ == "__main__":
    main()
