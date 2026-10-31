"""Comparación con JSF y regresión visual autenticada. Solo lecturas de clinica.

Usa Playwright Python ya instalado, sin dependencias nuevas del proyecto.
Capturas locales en /private/tmp/galenos-visual; nunca captura credenciales.
"""
import json
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUTPUT = Path('/private/tmp/galenos-visual')

class AparienciaJSF(unittest.TestCase):
 def test_temas_modulos_formularios_y_responsive_sin_escrituras(self):
  credentials = json.loads((Path.home() / 'Library/Application Support/GalenosSV/credentials.json').read_text())['administrador-local']
  OUTPUT.mkdir(exist_ok=True)
  with sync_playwright() as p:
   browser = p.chromium.launch(headless=True)
   page = browser.new_page(viewport={'width':1440,'height':1000})
   errors=[];writes=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   def protect(route):
    if route.request.method not in ['GET','HEAD','OPTIONS']:
     writes.append(route.request.method);route.abort()
    else:route.continue_()
   page.route('**/resources/v2/**',protect)
   page.goto('http://localhost:3000/#tipoDocumento')
   page.evaluate("localStorage.setItem('galenos.theme','light')")
   page.reload()
   expect(page.locator('#gestion-usuario')).to_be_visible()
   page.locator('#gestion-usuario').fill(credentials['username'])
   page.locator('#gestion-clave').fill(credentials['password'])
   page.get_by_role('button',name='Iniciar sesión',exact=True).click()
   expect(page.locator('[data-catalogos] .gestion-tools').first).to_be_visible()
   expect(page.locator('[data-session-name]')).to_have_text(credentials['username'])
   self.assertTrue(page.locator('.layout-logo-image').evaluate('(n)=>n.complete&&n.naturalWidth>0'))
   original=browser.new_page(viewport={'width':1440,'height':1000})
   for module,xhtml in [('tipoDocumento','TipoDocumento'),('clinica','Clinica'),('persona','Persona'),('procedimiento','Procedimiento'),('examen','Examen'),('main','Consulta')]:
    page.locator('[data-navigation] a[href="#'+module+'"]').click()
    if module=='main':
     page.locator('#clinica').select_option(index=1)
     expect(page.locator('tarjeta-consulta').first).to_be_visible()
     page.locator('tarjeta-consulta').first.locator('button').click()
     expect(page.locator('[data-ui=detailData]')).to_be_visible()
    else:expect(page.locator('#gestion')).to_be_visible()
    page.wait_for_timeout(150)
    original.goto('http://localhost:9080/GalenosSV/paginas/'+xhtml+'.xhtml')
    original.evaluate("localStorage.setItem('galenos.theme','light')");original.reload()
    original.locator('#menuToggle').click()
    page.screenshot(path=str(OUTPUT/(module+'-fe-light.png')),full_page=True)
    original.screenshot(path=str(OUTPUT/(module+'-jsf-light.png')),full_page=True)
    for var in ['--gs-nav','--gs-border','--gs-page','--gs-blue','--gs-text']:
     script='getComputedStyle(document.documentElement).getPropertyValue('+json.dumps(var)+').trim()'
     self.assertEqual(page.evaluate(script),original.evaluate(script))
    self.assertEqual(round(page.locator('.sidebar').bounding_box()['width']),round(original.locator('.layout-nav').bounding_box()['width']))
   # Preserve filters and clinic when moving between modules.
   page.locator('#fechaDesde').fill('1900-01-01')
   page.get_by_role('button',name='Aplicar filtros').click()
   clinic=page.locator('#clinica').input_value()
   for module in ['tipoDocumento','tipoMedioContacto','tipoExamen','clinica','rol','procedimiento','examen']:
    page.locator('[data-module='+module+']').click()
    expect(page.get_by_role('button',name='Nuevo registro',exact=True)).to_be_enabled()
    page.locator('#themeToggle').click()
    page.get_by_role('button',name='Nuevo registro',exact=True).click()
    dialog=page.locator('[data-catalogos] dialog')
    expect(dialog).to_be_visible();expect(dialog.get_by_role('button',name='Guardar',exact=True)).to_be_enabled()
    self.assertEqual(page.evaluate('document.documentElement.dataset.theme'),'dark')
    self.assertEqual(dialog.evaluate('(n)=>getComputedStyle(n).backgroundColor'),'rgb(25, 35, 48)')
    page.screenshot(path=str(OUTPUT/(module+'-dialog-dark.png')),full_page=True)
    page.keyboard.press('Escape');expect(dialog).not_to_be_visible()
    page.locator('#themeToggle').click()
   page.locator('[data-module=persona]').click();page.get_by_role('button',name='Nueva persona',exact=True).click()
   expect(page.locator('[data-personas] dialog')).to_be_visible();page.keyboard.press('Escape')
   page.locator('.brand').click();expect(page.locator('#fechaDesde')).to_have_value('1900-01-01');expect(page.locator('#clinica')).to_have_value(clinic)
   # Nested existing flows keep the same actions, themed dialogs and real GET requests.
   page.locator('[data-module=persona]').click()
   page.locator('[data-personas] tbody tr').first.get_by_role('button',name='Abrir',exact=True).click()
   for label in ['Documentos','Contactos','Roles y clínicas']:
    page.locator('.persona-relaciones').get_by_role('button',name=label,exact=True).click()
    expect(page.locator('.persona-relaciones')).to_be_visible()
    if label=='Documentos':
     page.screenshot(path=str(OUTPUT/'documentos-fe-light.png'),full_page=True)
     original.goto('http://localhost:9080/GalenosSV/paginas/Documento.xhtml')
     original.locator('#menuToggle').click()
     original.screenshot(path=str(OUTPUT/'documentos-jsf-light.png'),full_page=True)
   page.locator('[data-module=procedimiento]').click()
   page.get_by_role('button',name='Gestionar pasos',exact=True).first.click()
   expect(page.get_by_role('button',name='Nuevo paso',exact=True)).to_be_visible()
   page.get_by_role('button',name='Nuevo paso',exact=True).click()
   expect(page.locator('#gestion dialog:visible')).to_be_visible();page.keyboard.press('Escape')
   for label in ['Exámenes asociados','Secuencias']:
    page.get_by_role('button',name=label,exact=True).first.click()
    expect(page.get_by_role('button',name='Nueva asociación',exact=True)).to_be_visible()
    page.get_by_role('button',name='Nueva asociación',exact=True).click()
    expect(page.locator('#gestion dialog:visible')).to_be_visible();page.keyboard.press('Escape')
    page.screenshot(path=str(OUTPUT/('pasos-'+label.split()[0]+'.png')),full_page=True)
    page.get_by_role('button',name='Volver',exact=True).click()
   page.locator('[data-module=examen]').click()
   page.get_by_role('button',name='Tipos de examen',exact=True).first.click()
   expect(page.get_by_role('button',name='Nueva asociación',exact=True)).to_be_visible()
   page.get_by_role('button',name='Volver',exact=True).click()
   page.locator('.brand').click()
   page.locator('tarjeta-consulta').first.locator('button').click()
   page.get_by_role('button',name='Órdenes',exact=True).first.click()
   orders=page.locator('[data-ordenes]');expect(orders).to_be_visible()
   page.screenshot(path=str(OUTPUT/'ordenes-fe-light.png'),full_page=True)
   orders.get_by_role('button',name='Resultados',exact=True).first.click()
   page.screenshot(path=str(OUTPUT/'resultados-fe-light.png'),full_page=True)
   # Menu remains usable at all sizes and tables scroll inside their container.
   for width in [1920,1280,768,390,360]:
    page.set_viewport_size({'width':width,'height':900})
    for theme in ['light','dark']:
     if page.evaluate('document.documentElement.dataset.theme')!=theme:page.locator('#themeToggle').click()
     self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str((width,theme)))
     toggle=page.locator('.layout-menu-toggle');toggle.click();expect(page.locator('.sidebar')).to_be_hidden();toggle.click();expect(page.locator('.sidebar')).to_be_visible()
     page.screenshot(path=str(OUTPUT/('responsive-'+str(width)+'-'+theme+'.png')),full_page=True)
   page.locator('[data-session]').click();page.get_by_role('button',name='Cerrar sesión',exact=True).click()
   expect(page.locator('[data-session-name]')).to_have_text('Iniciar sesión');expect(page.locator('#clinica')).to_be_disabled()
   self.assertEqual(writes,[]);self.assertEqual(errors,[])
   browser.close()

if __name__=='__main__':unittest.main(verbosity=2)
