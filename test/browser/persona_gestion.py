"""Registro y asociaciones reales desde la interfaz; solo PostgreSQL sintético."""
import os,json,unittest,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class PersonaBrowser(unittest.TestCase):
 def test_person_create_edit_document_contact_and_role(self):
  with sync_playwright() as p:
   b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c=json.loads(Path(os.environ['GALENOS_CRUD_CREDENTIALS']).read_text())['editor'];page.goto('http://127.0.0.1:3000');page.locator('[data-module=persona]').click()
   page.locator('#gestion-usuario').fill(c['username']);page.locator('#gestion-clave').fill(c['password']);page.get_by_role('button',name='Iniciar sesión').click();root=page.locator('[data-personas]')
   expect(root).to_be_visible()
   suffix=uuid.uuid4().hex[:8].translate(str.maketrans('0123456789','abcdefghij'));name='Navegador '+suffix
   page.locator('[data-module=tipoDocumento]').click();page.get_by_role('button',name='Nuevo registro').click();catalog=page.locator('#gestion dialog:visible')
   catalog.locator('[name=nombre]').fill('Tipo navegador '+suffix);catalog.locator('[name=activo]').check();catalog.get_by_role('button',name='Guardar',exact=True).click();expect(catalog).not_to_be_visible()
   page.locator('[data-module=persona]').click();root.get_by_role('button',name='Nueva persona',exact=True).click();dialog=root.locator('dialog')
   dialog.locator('[name=nombres]').fill(name);dialog.locator('[name=apellidos]').fill('Sintético');dialog.locator('[name=fechaNacimiento]').fill('2000-01-01')
   dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible();expect(root.locator('.persona-relaciones')).to_contain_text(name)
   root.get_by_role('button',name='Editar persona',exact=True).click();dialog.locator('[name=apellidos]').fill('Actualizado');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible();expect(root.locator('.persona-relaciones')).to_contain_text('Actualizado')
   root.get_by_role('button',name='Agregar documento',exact=True).click();expect(dialog.locator('[name=idTipoDocumento] option').nth(1)).to_be_attached()
   dialog.locator('[name=idTipoDocumento]').select_option(label='Tipo navegador '+suffix);dialog.locator('[name=valor]').fill(suffix);dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible();expect(root.locator('.persona-relaciones')).to_contain_text(suffix)
   root.get_by_role('button',name='Contactos',exact=True).click();root.get_by_role('button',name='Agregar medio de contacto',exact=True).click();expect(dialog.locator('[name=idTipoMedioContacto] option').nth(1)).to_be_attached()
   dialog.locator('[name=idTipoMedioContacto]').select_option('00000000-0000-4000-8000-000000011001');dialog.locator('[name=valor]').fill(suffix+'@example.invalid');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible();expect(root.locator('.persona-relaciones')).to_contain_text(suffix+'@example.invalid')
   root.get_by_role('button',name='Roles y clínicas',exact=True).click();root.get_by_role('button',name='Agregar asignación de rol',exact=True).click();expect(dialog.locator('[name=idRol] option').nth(1)).to_be_attached()
   dialog.locator('[name=idRol]').select_option('00000000-0000-4000-8000-000000000031');dialog.locator('[name=idClinica]').select_option('00000000-0000-4000-8000-000000000011');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(dialog).not_to_be_visible()
   expect(root.locator('.persona-relaciones')).to_contain_text('00000000-0000-4000-8000-000000000031')
   page.once('dialog',lambda prompt:prompt.accept());root.locator('.persona-relaciones').get_by_role('button',name='Eliminar',exact=True).click();expect(root.locator('.persona-relaciones')).not_to_contain_text('00000000-0000-4000-8000-000000000031')
   self.assertEqual(errors,[]);page.screenshot(path='/private/tmp/galeno-persona-crud.png',full_page=True);b.close()
if __name__=='__main__':unittest.main(verbosity=2)
