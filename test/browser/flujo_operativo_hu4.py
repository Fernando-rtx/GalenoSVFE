"""HU4 real desde tarjetas hasta persistencia, sobre galenos_demo_crud."""

import os
import unittest
from playwright.sync_api import sync_playwright, expect


BASE = os.environ.get("GALENOS_BROWSER_BASE_URL", "http://127.0.0.1:3000")
CLINIC = "00000000-0000-4000-8000-000000000011"
CONSULTA = "00000000-0000-4000-8000-000000001002"


class FlujoOperativoHU4(unittest.TestCase):
    def test_paso_completado_persiste_tras_recarga(self):
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))

            page.goto(f"{BASE}/#atencion")
            page.locator("#clinica").select_option(CLINIC)
            target = page.locator("tarjeta-consulta").nth(1)
            self.assertEqual(
                target.evaluate("card => card.consulta.idConsulta"), CONSULTA
            )
            target.locator("button").click()
            expect(page.locator(".consulta-relaciones")).to_contain_text("PENDIENTE")
            expect(page.locator(".consulta-relaciones")).to_contain_text("Procedimientos asociados")
            page.get_by_role("button", name="Iniciar actividad").click()
            expect(page.locator(".consulta-relaciones")).to_contain_text("EN_CURSO")
            page.get_by_role("button", name="Completar actividad").click()
            expect(page.locator(".consulta-relaciones")).to_contain_text("COMPLETADO")

            page.reload()
            page.locator("#clinica").select_option(CLINIC)
            target = page.locator("tarjeta-consulta").nth(1)
            self.assertEqual(
                target.evaluate("card => card.consulta.idConsulta"), CONSULTA
            )
            target.locator("button").click()
            expect(page.locator(".consulta-relaciones")).to_contain_text("COMPLETADO")
            self.assertEqual(errors, [])
            browser.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
