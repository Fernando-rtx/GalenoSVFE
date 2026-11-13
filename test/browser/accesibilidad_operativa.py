"""Teclado, nombre de diálogos y layout responsive del dashboard académico."""

import os
import unittest
from playwright.sync_api import sync_playwright, expect


BASE = os.environ.get("GALENOS_BROWSER_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
CLINIC = "00000000-0000-4000-8000-000000000011"


class AccesibilidadOperativa(unittest.TestCase):
    def test_teclado_dialogos_nombrados_y_responsive(self):
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(BASE)

            skip = page.get_by_role("link", name="Saltar al contenido")
            page.keyboard.press("Tab")
            expect(skip).to_be_focused()
            page.keyboard.press("Enter")
            self.assertEqual(page.evaluate("document.activeElement.id"), "main")
            focus = page.locator("#main").evaluate(
                "node => getComputedStyle(node).outlineStyle"
            )
            self.assertNotEqual(focus, "none")

            clinic = page.get_by_label("Clínica de trabajo")
            expect(clinic).to_be_enabled(timeout=15000)
            clinic.select_option(CLINIC)
            create = page.get_by_role("button", name="Nueva consulta")
            expect(create).to_be_enabled()
            create.focus()
            page.keyboard.press("Enter")

            dialog = page.locator("[data-consulta-gestion] dialog")
            expect(dialog).to_be_visible()
            labelled_by = dialog.get_attribute("aria-labelledby")
            self.assertTrue(labelled_by)
            title = page.locator(f"#{labelled_by}")
            expect(title).to_have_text("Nueva consulta")
            self.assertTrue(
                dialog.evaluate("node => node.contains(document.activeElement)"),
                "Al abrir el diálogo, el foco debe entrar en el formulario.",
            )

            controls_unlabelled = dialog.evaluate(
                """node => [...node.querySelectorAll('input, select, textarea')]
                  .filter(field => field.type !== 'hidden' &&
                    !field.labels?.length && !field.getAttribute('aria-label') &&
                    !field.getAttribute('aria-labelledby'))
                  .map(field => field.outerHTML)"""
            )
            self.assertEqual(controls_unlabelled, [])
            page.keyboard.press("Escape")
            expect(dialog).to_be_hidden()
            expect(create).to_be_focused()

            for width in (320, 390, 700, 1024, 1440):
                page.set_viewport_size({"width": width, "height": 900})
                self.assertLessEqual(
                    page.evaluate("document.documentElement.scrollWidth"),
                    width,
                    f"Desbordamiento horizontal a {width}px",
                )
            browser.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
