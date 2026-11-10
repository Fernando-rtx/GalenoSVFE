"""CRUD por navegador real contra REST/PostgreSQL sintético. Sin interceptar Fetch."""

import os
import unittest
import uuid
from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ.get("GALENO_DASHBOARD_ORIGIN", "http://127.0.0.1:3000")


class GestionBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = sync_playwright().start()
        cls.browser = cls.p.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 1000})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(ORIGIN)
        expect(self.page.locator("#clinica")).to_be_enabled()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open_module(self, module):
        self.page.locator("[data-module=" + module + "]").click()
        expect(self.page.locator("#gestion tbody tr").first).to_be_visible()

    def test_catalog_crud_and_original_dashboard_context(self):
        clinic = self.page.locator("#clinica option").nth(1).get_attribute("value")
        self.page.locator("#clinica").select_option(clinic)
        expect(self.page.locator("[data-ui=total]")).to_have_text("5")
        self.page.locator("#fechaDesde").fill("2026-08-20")
        self.open_module("tipoDocumento")
        for module in ["tipoDocumento", "tipoMedioContacto", "tipoExamen", "clinica", "rol"]:
            with self.subTest(module=module):
                self.page.locator("[data-module=" + module + "]").click()
                expect(self.page.locator("#gestion .pagination").first).not_to_contain_text(
                    "Cargando"
                )
                name = "Navegador sintético " + uuid.uuid4().hex[:10]
                self.page.get_by_role("button", name="Nuevo registro").click()
                dialog = self.page.locator("#gestion dialog")
                expect(dialog).to_be_visible()
                dialog.locator("[name=nombre]").fill(name)
                if module == "tipoMedioContacto":
                    dialog.locator("[name=indicaciones]").fill("Datos sintéticos de prueba")
                if module == "clinica":
                    dialog.locator("[name=tipo]").fill("Académica")
                dialog.locator("[name=activo]").check()
                dialog.get_by_role("button", name="Guardar", exact=True).click()
                expect(dialog).not_to_be_visible()
                self.page.locator("#gestion input[type=search]").fill(name)
                self.page.get_by_role("button", name="Buscar", exact=True).click()
                row = self.page.locator("#gestion tbody tr").filter(has_text=name)
                expect(row).to_have_count(1)
                row.dblclick()
                expect(dialog).to_be_visible()
                dialog.locator("[name=nombre]").fill(name + " editado")
                dialog.locator("[name=activo]").uncheck()
                dialog.get_by_role("button", name="Guardar", exact=True).click()
                expect(dialog).not_to_be_visible()
                expect(self.page.locator("#gestion tbody")).to_contain_text(name + " editado")
                expect(self.page.locator("#gestion tbody")).to_contain_text("Inactivo")
                if module in ["clinica", "rol"]:
                    self.page.locator("#gestion tbody tr").filter(has_text=name).dblclick()
                    self.page.once("dialog", lambda prompt: prompt.accept())
                    dialog.get_by_role("button", name="Eliminar registro", exact=True).click()
                    expect(dialog).not_to_be_visible()
                    expect(
                        self.page.locator("#gestion tbody tr").filter(has_text=name)
                    ).to_have_count(0)
        self.page.locator('[data-navigation] a[href="#main"]').click()
        expect(self.page.locator("#main")).to_be_visible()
        expect(self.page.locator("#clinica")).to_have_value(clinic)
        expect(self.page.locator("#fechaDesde")).to_have_value("2026-08-20")
        self.assertGreater(self.page.locator("tarjeta-consulta").count(), 0)
        self.page.screenshot(path="/private/tmp/galeno-dashboard-conservado.png", full_page=True)

    def test_mobile_management_has_no_document_overflow(self):
        self.page.set_viewport_size({"width": 390, "height": 844})
        self.open_module("tipoDocumento")
        self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
