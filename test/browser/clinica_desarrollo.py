"""Prueba explícita con registros DESARROLLO identificables en clinica. No limpia tablas."""
import os,json,unittest,uuid,base64,urllib.request,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class ClinicaDevelopment(unittest.TestCase):
 def test_persona_relaciones_y_consulta_persisten(self):
  accounts=json.loads(Path(os.environ['GALENOS_LOCAL_CREDENTIALS']).read_text());a=accounts['administrador-local']
  auth='Basic '+base64.b64encode((a['username']+':'+a['password']).encode()).decode()
  def get(path):
   with urllib.request.urlopen(urllib.request.Request('http://localhost:9080/GalenosSV/resources/v2/'+path,headers={'Authorization':auth})) as r:return json.load(r)
  with sync_playwright() as p:
   b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://localhost:3000');page.locator('[data-module=rol]').click();page.locator('#gestion-usuario').fill(a['username']);page.locator('#gestion-clave').fill(a['password']);page.get_by_role('button',name='Iniciar sesión',exact=True).click()
   expect(page.locator('[data-catalogos] .gestion-tools').first).to_be_visible()
   if not any(row['nombre'].strip().lower()=='paciente' for row in get('rol?max=100')):
    page.get_by_role('button',name='Nuevo registro',exact=True).click();d=page.locator('#gestion dialog:visible');d.locator('[name=nombre]').fill('Paciente');d.locator('[name=observaciones]').fill('DESARROLLO: rol necesario para probar Consulta');d.get_by_role('button',name='Guardar',exact=True).click();expect(d).not_to_be_visible()
   role=next(row for row in get('rol?max=100') if row['nombre'].strip().lower()=='paciente')
   token=uuid.uuid4().hex[:10];name='Desarrollo '+token.translate(str.maketrans('0123456789','abcdefghij'))
   page.locator('[data-module=persona]').click();root=page.locator('[data-personas]');root.get_by_role('button',name='Nueva persona',exact=True).click();d=root.locator('dialog');d.locator('[name=nombres]').fill(name);d.locator('[name=apellidos]').fill('Prueba Desarrollo');d.locator('[name=fechaNacimiento]').fill('2000-01-01');d.get_by_role('button',name='Guardar',exact=True).click();expect(d).not_to_be_visible()
   person=next(row for row in get('persona?nombres='+urllib.parse.quote(name)) if row['nombres']==name)
   root.get_by_role('button',name='Roles y clínicas',exact=True).click();root.get_by_role('button',name='Agregar asignación de rol',exact=True).click();expect(d.locator('[name=idRol] option').nth(1)).to_be_attached();d.locator('[name=idRol]').select_option(role['idRol']);clinic=get('clinica_disponible')[0]['idClinica'];d.locator('[name=idClinica]').select_option(clinic);d.get_by_role('button',name='Guardar',exact=True).click();expect(d).not_to_be_visible()
   page.locator('[data-navigation] a[href="#main"]').click();page.locator('#clinica').select_option(clinic);page.get_by_role('button',name='Nueva consulta',exact=True).click();d=page.locator('[data-consulta-gestion] dialog');d.locator('[name=buscar]').fill(name);d.get_by_role('button',name='Buscar pacientes',exact=True).click();expect(d.locator('#consulta-paciente option')).to_have_count(2);d.locator('#consulta-paciente').select_option(index=1);d.locator('[name=referenciaExterna]').fill('DESARROLLO-'+token);d.locator('[name=observaciones]').fill('Prueba autorizada desde GalenoSVFE en clinica');d.get_by_role('button',name='Guardar',exact=True).click();expect(d).not_to_be_visible();expect(page.locator('[data-ui=detail]')).to_have_attribute('aria-disabled','false')
   rows=get('consulta?idClinica='+clinic+'&max=100');consulta=next(row for row in rows if row['referenciaExterna']=='DESARROLLO-'+token)
   page.locator('[data-ui=detail]').dblclick(position={'x':10,'y':10});d.locator('[name=observaciones]').fill('DESARROLLO: edición verificada');d.get_by_role('button',name='Guardar',exact=True).click();expect(d).not_to_be_visible();self.assertEqual(get('consulta/'+consulta['idConsulta']+'?idClinica='+clinic)['observaciones'],'DESARROLLO: edición verificada')
   uuid.UUID(consulta['idConsulta']);uuid.UUID(person['idPersona'])
   sql="SELECT count(*) FROM consulta c JOIN persona_rol pr ON pr.id_persona_rol=c.id_persona_rol JOIN persona p ON p.id_persona=pr.id_persona WHERE c.id_consulta='"+consulta['idConsulta']+"' AND p.id_persona='"+person['idPersona']+"' AND c.observaciones='DESARROLLO: edición verificada'"
   count=subprocess.check_output(['docker','exec','postgres_db','psql','-U','postgres','-d','clinica','-At','-c',sql],text=True).strip();self.assertEqual(count,'1')
   self.assertEqual(errors,[]);page.screenshot(path='/private/tmp/galenos-clinica-dashboard.png',full_page=True);print('Persona y consulta DESARROLLO verificadas por navegador, HTTP y SELECT.');b.close()
if __name__=='__main__':unittest.main(verbosity=2)
