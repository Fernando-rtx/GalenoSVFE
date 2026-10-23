"""Pruebas de la página real contra el demo oficial sintético.

Playwright Python es una herramienta externa opcional; no es dependencia npm.
Los casos con respuestas interceptadas NO acreditan REST real. Los emisores
Shadow DOM sintético comprueban el caso negativo; las tarjetas reales se prueban
contra el demo con datos ficticios.
"""
import json
import os
from pathlib import Path
import unittest
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ['GALENO_DASHBOARD_ORIGIN'].rstrip('/')
if urlsplit(ORIGIN).hostname not in ('localhost', '127.0.0.1'):
    raise SystemExit('Usar únicamente el frontend local configurado contra el demo sintético.')
ARTIFACTS = Path(os.environ.get('GALENO_DASHBOARD_ARTIFACTS', '/tmp/galeno-dashboard-browser'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


class DashboardBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)
        cls.browser_version = cls.browser.version
        cls.observations = {}

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(ORIGIN + '/index.html')
        expect(self.page.locator('#clinica')).to_be_enabled()
        self.ids = self.page.locator('#clinica option').evaluate_all('(options) => options.map(x => x.value).filter(Boolean)')
        self.assertEqual(len(self.ids), 2, 'Se requieren las dos clínicas activas del demo oficial.')

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def choose_clinic(self, index=0):
        self.page.locator('#clinica').select_option(self.ids[index])
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5' if index == 0 else '1')

    def cards(self):
        return self.page.locator('[data-ui="cards"] tarjeta-consulta')

    def card_button(self, index=0):
        return self.cards().nth(index).locator('button')

    def card_id(self, index=0):
        return self.cards().nth(index).evaluate('(card) => card.consulta.idConsulta')

    def test_initial_state(self):
        # Playwright 1.55 no clasifica fieldset en is_disabled(); verificar
        # el atributo HTML y la deshabilitación efectiva de los controles hijos.
        expect(self.page.locator('[data-ui="filtersFieldset"]')).to_have_attribute('disabled', '')
        for control in ('#fechaDesde', '#fechaHasta', '#idPersonaRol'):
            expect(self.page.locator(control)).to_be_disabled()
        expect(self.page.get_by_role('button', name='Aplicar filtros')).to_be_disabled()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_hidden()
        expect(self.page.locator('[data-ui="resultStatus"]')).to_contain_text('Selecciona una clínica')
        self.page.screenshot(path=str(ARTIFACTS / 'inicial.png'), full_page=True)
        self.choose_clinic()
        for control in ('#fechaDesde', '#fechaHasta', '#idPersonaRol'):
            expect(self.page.locator(control)).to_be_enabled()
        expect(self.page.get_by_role('button', name='Aplicar filtros')).to_be_enabled()

    def test_real_list_and_detail(self):
        self.choose_clinic()
        expect(self.cards()).to_have_count(5)
        expect(self.cards().first).to_contain_text('UTC')
        self.card_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_visible()
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text('Sin especificar')
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text('UTC')
        self.page.screenshot(path=str(ARTIFACTS / 'consultas.png'), full_page=True)

    def test_real_pagination(self):
        self.choose_clinic()
        self.page.locator('#pageSize').select_option('2')
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('1–2 de 5 consultas')
        first_id = self.card_id()
        self.page.locator('[data-ui="next"]').click()
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('3–4 de 5 consultas')
        self.assertNotEqual(self.card_id(), first_id)
        self.page.locator('[data-ui="next"]').click()
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('5–5 de 5 consultas')
        expect(self.page.locator('[data-ui="next"]')).to_be_disabled()
        self.page.locator('[data-ui="previous"]').click()
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('3–4 de 5 consultas')

    def test_real_filters_and_empty(self):
        self.choose_clinic()
        self.page.locator('#fechaDesde').fill('2026-10-22')
        self.page.locator('#fechaHasta').fill('2026-10-22')
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('2')
        self.page.locator('#fechaDesde').fill('2000-01-01')
        self.page.locator('#fechaHasta').fill('2000-01-01')
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="resultStatus"]')).to_contain_text('No hay consultas para los filtros')
        expect(self.page.locator('[data-ui="total"]')).to_have_text('0')
        self.page.get_by_role('button', name='Limpiar', exact=True).click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5')

    def test_real_persona_rol_filter(self):
        self.choose_clinic()
        self.card_button().click()
        detail = self.page.locator('[data-ui="detailData"]')
        expect(detail).to_be_visible()
        assignment = detail.locator('dd').last.inner_text()
        self.page.locator('#idPersonaRol').fill(assignment)
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('3')
        expect(detail).to_be_hidden()

    def test_real_clinic_change_clears_detail_and_filters(self):
        self.choose_clinic()
        self.card_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_visible()
        self.page.locator('#fechaDesde').fill('2026-10-22')
        self.choose_clinic(1)
        expect(self.page.locator('[data-ui="detailData"]')).to_be_hidden()
        expect(self.page.locator('#fechaDesde')).to_have_value('')
        expect(self.cards()).to_have_count(1)

    def test_real_card_model_event_and_update(self):
        self.choose_clinic()
        expect(self.cards()).to_have_count(5)
        model = self.cards().first.evaluate('(card) => card.consulta')
        self.assertEqual(set(model), {
            'idConsulta', 'personaNombre', 'rolNombre', 'clinicaNombre',
            'fechaInicio', 'fechaFin'
        })
        self.page.evaluate('''() => {
            window.realCardEvent = null;
            document.querySelector('[data-dashboard]').addEventListener('consulta-seleccionada', event => {
                window.realCardEvent = { idConsulta: event.detail.idConsulta,
                    bubbles: event.bubbles, composed: event.composed };
            }, { once: true });
        }''')
        self.cards().first.evaluate('''card => {
            card.consulta = { ...card.consulta, personaNombre: null, fechaInicio: null };
        }''')
        expect(self.cards().first).to_contain_text('Persona sin nombre')
        expect(self.cards().first).to_contain_text('Sin especificar')
        self.card_button().click()
        self.assertEqual(self.page.evaluate('window.realCardEvent'), {
            'idConsulta': model['idConsulta'], 'bubbles': True, 'composed': True
        })
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text(model['idConsulta'])

    def test_generic_card_slots_and_reconnection(self):
        observed = self.page.evaluate('''() => {
            const card = document.createElement('tarjeta-simple');
            document.body.append(card);
            const slots = card.shadowRoot.querySelectorAll('slot');
            const fallback = [...slots].map(item => item.textContent);
            const title = document.createElement('span');
            title.slot = 'titulo';
            title.textContent = 'Título sintético';
            card.append(title);
            const assigned = card.shadowRoot.querySelector('slot[name="titulo"]').assignedElements().length;
            card.remove();
            document.body.append(card);
            const articles = card.shadowRoot.querySelectorAll('article').length;
            card.remove();
            return { fallback, assigned, articles };
        }''')
        self.assertEqual(observed['fallback'], ['Sin título', 'Sin contenido', 'Sin contenido adicional'])
        self.assertEqual(observed['assigned'], 1)
        self.assertEqual(observed['articles'], 1)

    def test_validation_is_visible(self):
        self.choose_clinic()
        self.page.locator('#fechaDesde').fill('2026-10-23')
        self.page.locator('#fechaHasta').fill('2026-10-22')
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="actionError"]')).to_be_visible()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5')

    def mount_synthetic_emitter(self, consultation_id, composed):
        self.page.evaluate('''({id, composed}) => {
            // Emisor exclusivamente sintético. No define tarjeta-consulta ni tarjeta-simple.
            customElements.define('emisor-sintetico-consulta', class extends HTMLElement {
                connectedCallback() {
                    const shadow = this.attachShadow({mode: 'open'});
                    const button = document.createElement('button');
                    button.textContent = 'Emisor sintético de selección';
                    button.onclick = () => button.dispatchEvent(new CustomEvent('consulta-seleccionada', {
                        detail: {idConsulta: id}, bubbles: true, composed
                    }));
                    shadow.append(button);
                }
            });
            const root = document.querySelector('[data-dashboard]');
            window.syntheticEventObservation = null;
            root.addEventListener('consulta-seleccionada', event => {
                window.syntheticEventObservation = {bubbles: event.bubbles, composed: event.composed,
                    retargeted: event.target.localName, idConsulta: event.detail.idConsulta};
            }, {once: true});
            // Montar el emisor donde iría el contenido de consultas. Agregarlo
            // como tercer hijo del shell lo deja debajo del sidebar sticky.
            document.querySelector('[data-ui="results"]').append(document.createElement('emisor-sintetico-consulta'));
        }''', {'id': consultation_id, 'composed': composed})

    def test_synthetic_shadow_emitter_with_real_detail(self):
        self.choose_clinic()
        consultation_id = self.card_id()
        self.mount_synthetic_emitter(consultation_id, composed=True)
        self.page.get_by_role('button', name='Emisor sintético de selección').click()
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text(consultation_id)
        observed = self.page.evaluate('window.syntheticEventObservation')
        self.assertEqual(observed, {'bubbles': True, 'composed': True,
            'retargeted': 'emisor-sintetico-consulta', 'idConsulta': consultation_id})
        self.observations['shadowEvent'] = {**observed, 'syntheticEmitter': True, 'realRodrigoCard': False}
        self.assertTrue(self.page.evaluate("Boolean(customElements.get('tarjeta-consulta'))"))

    def test_synthetic_shadow_event_without_composed_stays_inside_shadow(self):
        self.choose_clinic()
        consultation_id = self.card_id()
        requests = []
        self.page.on('request', lambda request: requests.append(request.url) if '/v1/consulta/' in request.url else None)
        self.mount_synthetic_emitter(consultation_id, composed=False)
        self.page.get_by_role('button', name='Emisor sintético de selección').click()
        self.assertIsNone(self.page.evaluate('window.syntheticEventObservation'))
        expect(self.page.locator('[data-ui="detailData"]')).to_be_hidden()
        self.assertEqual(requests, [])
        self.observations['nonComposedEvent'] = {'reachesDashboard': False, 'detailRequests': 0}

    def test_synthetic_http_error_and_real_retry(self):
        pattern = '**/v1/consulta?*'
        self.page.route(pattern, lambda route: route.fulfill(status=500,
            headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN},
            body=json.dumps({'mensaje': 'Error HTTP sintético de prueba'})))
        self.page.locator('#clinica').select_option(self.ids[0])
        expect(self.page.locator('[data-ui="resultStatus"]')).to_contain_text('No se pudieron cargar')
        expect(self.page.locator('[data-ui="retryConsultas"]')).to_be_visible()
        self.page.unroute(pattern)
        self.page.locator('[data-ui="retryConsultas"]').click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5')

    def test_synthetic_untrusted_text_uses_dom_text(self):
        pattern = '**/v1/consulta?*'
        text = '<img src=x onerror="window.xssFromSyntheticTest=true">'
        def fulfill(route):
            real_response = route.fetch()
            data = real_response.json()
            for row in data:
                row['personaNombre'] = text
            route.fulfill(response=real_response, json=data)
        self.page.route(pattern, fulfill)
        self.choose_clinic()
        expect(self.cards().first).to_contain_text(text)
        self.assertEqual(self.cards().first.locator('img').count(), 0)
        self.assertIsNone(self.page.evaluate('window.xssFromSyntheticTest'))

    def test_missing_configuration_is_visible_without_backend_fallback(self):
        self.page.route('**/js/config/environment.local.js', lambda route: route.fulfill(
            content_type='application/javascript', body="import { createApiConfig } from './api-config.js'; export const config = createApiConfig({baseUrl: null});"))
        requests = []
        self.page.on('request', lambda request: requests.append(request.url) if '/resources/v1/' in request.url else None)
        self.page.reload()
        expect(self.page.locator('[data-ui="clinicStatus"]')).to_contain_text('aún no está configurada')
        expect(self.page.locator('[data-ui="retryClinicas"]')).to_be_visible()
        self.assertEqual(requests, [])

    def test_mobile_layout_and_accessible_controls(self):
        self.choose_clinic()
        layouts = []
        for width in (320, 360, 390, 700, 1024, 1440):
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': 844})
                layout = self.page.evaluate('''() => {
                    const card = document.querySelector('tarjeta-consulta').getBoundingClientRect();
                    const results = document.querySelector('[data-ui="results"]').getBoundingClientRect();
                    const form = document.querySelector('.filter-grid').getBoundingClientRect();
                    return {viewport: innerWidth, document: document.documentElement.scrollWidth,
                        cardInsideResults: card.left >= results.left - 1 && card.right <= results.right + 1,
                        fieldsInsideForm: [...document.querySelectorAll('.filter-grid input')].every(input => {
                            const box = input.getBoundingClientRect();
                            return box.left >= form.left - 1 && box.right <= form.right + 1;
                        })};
                }''')
                layouts.append(layout)
                self.assertLessEqual(layout['document'], width)
                self.assertTrue(layout['fieldsInsideForm'], layout)
                self.assertTrue(layout['cardInsideResults'], layout)
        self.observations['layouts'] = layouts
        self.page.set_viewport_size({'width': 390, 'height': 844})
        expect(self.page.get_by_label('Clínica disponible')).to_be_visible()
        expect(self.page.get_by_label('Página siguiente')).to_be_disabled()
        self.page.screenshot(path=str(ARTIFACTS / 'movil.png'), full_page=True)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(DashboardBrowser)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    report = {'syntheticDemoOnly': True, 'frontendOrigin': ORIGIN, 'testsRun': result.testsRun,
        'failures': len(result.failures), 'errors': len(result.errors), 'skipped': len(result.skipped),
        'browser': getattr(DashboardBrowser, 'browser_version', None),
        'notes': 'Los tests synthetic usan respuestas o emisor sintéticos; no son integración con tarjetas reales.',
        'observations': getattr(DashboardBrowser, 'observations', {})}
    (ARTIFACTS / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
