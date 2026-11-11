"""Navegación académica real en Chromium, con lecturas y sin credenciales."""

import os
import unittest

from playwright.sync_api import expect, sync_playwright


class NavegacionClinica(unittest.TestCase):
    def test_dashboard_y_gestion_sin_inicio_de_sesion(self):
        url = os.environ.get("GALENOS_FRONTEND_URL", "http://localhost:3000")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            with page.expect_response(
                lambda response: "/resources/v2/clinica_disponible?" in response.url
            ) as clinics:
                page.goto(url + "/#main")
            self.assertEqual(clinics.value.status, 200)
            self.assertNotIn("authorization", clinics.value.request.headers)
            expect(page.locator("#clinica")).to_be_enabled()
            expect(page.locator("input[type=password]")).to_have_count(0)

            with page.expect_response(
                lambda response: "/resources/v2/consulta?" in response.url
            ) as consultations:
                page.locator("#clinica").select_option(index=1)
            self.assertEqual(consultations.value.status, 200)
            self.assertNotIn("authorization", consultations.value.request.headers)

            with page.expect_response(
                lambda response: "/resources/v2/rol?" in response.url
            ) as roles:
                page.locator('[data-module="rol"]').click()
            self.assertEqual(roles.value.status, 200)
            expect(page.locator("[data-catalogos] h1")).to_have_text("Roles")
            page.get_by_role("button", name="Nuevo registro", exact=True).click()
            expect(page.locator("[data-catalogos] dialog")).to_be_visible()
            page.get_by_role("button", name="Cancelar", exact=True).click()
            expect(page.locator("[data-catalogos] dialog")).not_to_be_visible()

            page.set_viewport_size({"width": 390, "height": 844})
            page.go_back()
            expect(page.locator("#main")).to_be_visible()
            self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            self.assertEqual(errors, [])
            browser.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
