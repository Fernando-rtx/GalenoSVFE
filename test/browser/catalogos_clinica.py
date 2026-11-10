import uuid, unittest
from playwright.sync_api import sync_playwright, expect


class CatalogosClinica(unittest.TestCase):
    def test_examen_y_procedimiento_crud(self):
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto("http://localhost:3000")
            page.locator("[data-module=examen]").click()
            expect(page.locator("[data-catalogos] .catalogo-header")).to_be_visible()
            for module in ["examen", "procedimiento"]:
                page.locator("[data-module=" + module + "]").click()
                name = "DESARROLLO " + module + " " + uuid.uuid4().hex[:10]
                page.get_by_role("button", name="Nuevo registro", exact=True).click()
                d = page.locator("#gestion dialog:visible")
                d.locator("[name=nombre]").fill(name)
                d.locator("[name=observaciones]").fill(
                    "Prueba autorizada desde frontend en clinica"
                )
                d.locator("[name=activo]").check()
                d.get_by_role("button", name="Guardar", exact=True).click()
                expect(d).not_to_be_visible()
                page.locator("#gestion input[type=search]").fill(name)
                page.get_by_role("button", name="Buscar", exact=True).click()
                row = page.locator("#gestion tbody tr").filter(has_text=name)
                expect(row).to_have_count(1)
                row.dblclick()
                d = page.locator("#gestion dialog:visible")
                d.locator("[name=activo]").uncheck()
                d.get_by_role("button", name="Guardar", exact=True).click()
                expect(d).not_to_be_visible()
                expect(row).to_contain_text("Inactivo")
            self.assertEqual(errors, [])
            b.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
