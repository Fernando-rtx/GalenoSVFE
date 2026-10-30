"""Flujo real desde el dashboard conservado, contra base CRUD sintética."""
import json,os,unittest,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class ConsultaBrowser(unittest.TestCase):
 def test_create_edit_and_procedure_step_from_dashboard(self):
  with sync_playwright() as p:
   b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   c=json.loads(Path(os.environ['GALENOS_CRUD_CREDENTIALS']).read_text())['editor'];page.goto('http://127.0.0.1:3000')
   page.locator('[data-module=tipoDocumento]').click();page.locator('#gestion-usuario').fill(c['username']);page.locator('#gestion-clave').fill(c['password']);page.get_by_role('button',name='Iniciar sesión').click()
   expect(page.locator('#gestion tbody tr').first).to_be_visible();page.locator('[data-navigation] a[href="#main"]').click()
   page.locator('#clinica').select_option('00000000-0000-4000-8000-000000000011')
   expect(page.locator('tarjeta-consulta').first).to_be_visible()
   page.get_by_role('button',name='Nueva consulta',exact=True).click();dialog=page.locator('[data-consulta-gestion] dialog')
   dialog.locator('[name=buscar]').fill('Persona');dialog.get_by_role('button',name='Buscar pacientes').click()
   expect(dialog.locator('#consulta-paciente option')).to_have_count(2)
   dialog.locator('#consulta-paciente').select_option('00000000-0000-4000-8000-000000000101')
   reference='Navegador '+uuid.uuid4().hex[:8];dialog.locator('[name=referenciaExterna]').fill(reference);dialog.locator('[name=observaciones]').fill('Creación sintética real')
   dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible()
   expect(page.get_by_role('button',name='Editar consulta',exact=True)).to_be_enabled()
   page.get_by_role('button',name='Editar consulta',exact=True).click();expect(dialog.locator('[name=referenciaExterna]')).to_have_value(reference)
   dialog.locator('[name=observaciones]').fill('Edición desde navegador');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible()
   page.get_by_role('button',name='Asociar procedimiento',exact=True).click()
   expect(dialog.locator('#consulta-procedimiento option')).to_have_count(2)
   dialog.locator('#consulta-procedimiento').select_option('00000000-0000-4000-8000-000000005001')
   dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible()
   expect(page.locator('.consulta-relaciones')).to_contain_text('PENDIENTE')
   page.locator('.consulta-relaciones .gestion-tools').filter(has_text='PENDIENTE').get_by_role('button',name='Editar',exact=True).click()
   dialog.locator('[name=estado]').select_option('EN_CURSO');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible()
   expect(page.locator('.consulta-relaciones')).to_contain_text('EN_CURSO')
   page.locator('#fechaDesde').fill('2026-10-30');page.get_by_role('button',name='Aplicar filtros').click()
   page.locator('[data-module=rol]').click();page.locator('[data-navigation] a[href="#main"]').click();expect(page.locator('#fechaDesde')).to_have_value('2026-10-30')
   self.assertEqual(errors,[]);page.screenshot(path='/private/tmp/galeno-consulta-crud.png',full_page=True);b.close()
if __name__=='__main__':unittest.main(verbosity=2)
