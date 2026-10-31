"""Pruebas de la página real contra el demo oficial sintético.

Playwright Python es una herramienta externa opcional; no es dependencia npm.
Los casos con respuestas interceptadas NO acreditan REST real. Los emisores
Shadow DOM son sintéticos; las tarjetas originales de Rodrigo se validan con el demo real.
"""
import json
import os
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ['GALENO_DASHBOARD_ORIGIN'].rstrip('/')
EXPECT_CARDS = os.environ.get('GALENO_DASHBOARD_EXPECT_CARDS') == '1'
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
        self.console_errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('console', lambda message: self.console_errors.append(message.text) if message.type == 'error' else None)
        self.page.goto(ORIGIN + '/index.html')
        expect(self.page.locator('#clinica')).to_be_enabled()
        self.ids = self.page.locator('#clinica option').evaluate_all('(options) => options.map(x => x.value).filter(Boolean)')
        self.assertEqual(len(self.ids), 2, 'Se requieren las dos clínicas activas del demo oficial.')
        self.using_cards = self.page.evaluate("Boolean(customElements.get('tarjeta-consulta'))")
        if EXPECT_CARDS:
            self.assertTrue(self.using_cards, 'La integración debe cargar las tarjetas reales; no se acepta la tabla como respaldo.')
        self.observations['presentation'] = 'tarjeta-consulta' if self.using_cards else 'tabla'

    def tearDown(self):
        self.observations.setdefault('consoleErrors', {})[self._testMethodName] = self.console_errors
        self.page.unroute_all(behavior='wait')
        self.context.close()
        self.assertEqual(self.errors, [])

    def choose_clinic(self, index=0):
        self.page.locator('#clinica').select_option(self.ids[index])
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5' if index == 0 else '1')

    def consultation_rows(self):
        return self.page.locator('[data-ui="cards"] tarjeta-consulta' if self.using_cards else '[data-ui="rows"] tr')

    def consultation_button(self):
        return self.consultation_rows().first.locator('button')

    def consultation_id(self):
        if self.using_cards:
            return self.consultation_rows().first.evaluate('(card) => card.consulta.idConsulta')
        return self.consultation_button().get_attribute('data-consulta')

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
        expect(self.consultation_rows()).to_have_count(5)
        if self.using_cards:
            expect(self.consultation_rows().first).to_contain_text('UTC')
        self.consultation_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_visible()
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text('Sin especificar')
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text('UTC')
        self.assertEqual(self.console_errors, [])
        self.page.screenshot(path=str(ARTIFACTS / 'consultas.png'), full_page=True)

    def test_real_pagination(self):
        self.choose_clinic()
        self.page.locator('#pageSize').select_option('2')
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('1–2 de 5 consultas')
        first_id = self.consultation_id()
        self.page.locator('[data-ui="next"]').click()
        expect(self.page.locator('[data-ui="pageInfo"]')).to_have_text('3–4 de 5 consultas')
        self.assertNotEqual(self.consultation_id(), first_id)
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
        self.consultation_button().click()
        detail = self.page.locator('[data-ui="detailData"]')
        expect(detail).to_be_visible()
        assignment = detail.locator('dd').last.inner_text()
        self.page.locator('#idPersonaRol').fill(assignment)
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('3')
        expect(detail).to_be_hidden()

    def test_real_rest_runner_with_browser_cors(self):
        self.page.goto(ORIGIN + '/test/integration/runner.html')
        expect(self.page.locator('#status')).to_have_text('Pruebas configuradas completadas.', timeout=60000)
        expect(self.page.locator('#mocha-stats .passes em')).to_have_text('20')
        expect(self.page.locator('#mocha-stats .failures em')).to_have_text('0')
        # El runner provoca 404 y 422 deliberados; no deben aparecer fallos CORS.
        self.assertFalse(any('CORS' in message for message in self.console_errors))
        self.observations['restRunner'] = {'passed': 20, 'failed': 0, 'browserCors': True}

    def test_real_clinic_change_clears_detail_and_filters(self):
        self.choose_clinic()
        self.consultation_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_visible()
        self.page.locator('#fechaDesde').fill('2026-10-22')
        self.choose_clinic(1)
        expect(self.page.locator('[data-ui="detailData"]')).to_be_hidden()
        expect(self.page.locator('#fechaDesde')).to_have_value('')
        expect(self.consultation_rows()).to_have_count(1)

    def test_real_keyboard_selection_keeps_clinic_scope(self):
        self.choose_clinic()
        consultation_id = self.consultation_id()
        self.page.locator('#pageSize').focus()
        self.page.locator('#pageSize').press('Tab')
        expect(self.consultation_button()).to_be_focused()
        with self.page.expect_request(lambda request: '/v1/consulta/' in request.url) as detail_request:
            self.consultation_button().press('Enter')
        query = parse_qs(urlsplit(detail_request.value.url).query)
        self.assertEqual(query, {'idClinica': [self.ids[0]]})
        self.assertTrue(urlsplit(detail_request.value.url).path.endswith('/' + consultation_id))
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text(consultation_id)
        self.assertEqual(self.console_errors, [])
        self.observations['keyboardDetail'] = {'keys': ['Tab', 'Enter'], 'clinicContextPreserved': True}

    def test_real_card_contract(self):
        if not self.using_cards:
            self.skipTest('Las tarjetas de Rodrigo no están integradas en este checkout.')
        self.choose_clinic()
        models = self.consultation_rows().evaluate_all('(cards) => cards.map(card => card.consulta)')
        fields = {'idConsulta', 'personaNombre', 'rolNombre', 'clinicaNombre', 'fechaInicio', 'fechaFin'}
        self.assertTrue(all(set(model) == fields for model in models))
        self.assertTrue(any(model['fechaFin'] is None for model in models), 'El fixture debe incluir null reales.')
        self.page.evaluate('''() => {
            document.querySelector('[data-dashboard]').addEventListener('consulta-seleccionada', event => {
                window.cardEvent = {detail: event.detail, bubbles: event.bubbles, composed: event.composed,
                    target: event.target.localName};
            }, {once: true});
        }''')
        self.consultation_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_be_visible()
        self.assertEqual(self.page.evaluate('window.cardEvent'), {
            'detail': {'idConsulta': models[0]['idConsulta']}, 'bubbles': True,
            'composed': True, 'target': 'tarjeta-consulta'
        })
        card_dates = self.consultation_rows().first.locator('dd').all_text_contents()[-2:]
        detail_dates = self.page.locator('[data-ui="detailData"] dd').all_text_contents()[2:4]
        self.assertEqual(card_dates, detail_dates, 'Tarjeta y detalle deben mostrar las mismas fechas UTC/null.')
        self.observations['realCard'] = {'sixFields': True, 'nullPreserved': True,
            'composedEvent': True, 'datesMatchDetail': True}

        # Conserva el caso único del antiguo test duplicado: actualización del modelo.
        self.consultation_rows().first.evaluate('''card => {
            card.consulta = { ...card.consulta, personaNombre: null, fechaInicio: null };
        }''')
        expect(self.consultation_rows().first).to_contain_text('Persona sin nombre')
        expect(self.consultation_rows().first).to_contain_text('Sin especificar')
        self.consultation_button().click()
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text(models[0]['idConsulta'])

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
        consultation_id = self.consultation_id()
        self.mount_synthetic_emitter(consultation_id, composed=True)
        self.page.get_by_role('button', name='Emisor sintético de selección').click()
        expect(self.page.locator('[data-ui="detailData"]')).to_contain_text(consultation_id)
        observed = self.page.evaluate('window.syntheticEventObservation')
        self.assertEqual(observed, {'bubbles': True, 'composed': True,
            'retargeted': 'emisor-sintetico-consulta', 'idConsulta': consultation_id})
        self.observations['shadowEvent'] = {**observed, 'syntheticEmitter': True, 'realRodrigoCard': False}

    def test_synthetic_shadow_event_without_composed_stays_inside_shadow(self):
        self.choose_clinic()
        consultation_id = self.consultation_id()
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

    def test_synthetic_connection_error_and_real_retry(self):
        pattern = '**/v1/consulta?*'
        self.page.route(pattern, lambda route: route.abort('internetdisconnected'))
        self.page.locator('#clinica').select_option(self.ids[0])
        expect(self.page.locator('[data-ui="resultStatus"]')).to_contain_text('No se pudo conectar')
        self.page.unroute(pattern)
        self.page.locator('[data-ui="retryConsultas"]').click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('5')

    def test_delayed_real_responses_are_cancelled_on_clinic_and_filter_changes(self):
        # Solo se demora la entrega: route.fetch obtiene el cuerpo del demo real.
        pending = []
        failures = []
        delay_next = True

        def delay(route):
            nonlocal delay_next
            if delay_next:
                delay_next = False
                pending.append((route, route.fetch()))
                self.page.evaluate('window.delayedRestResponseReady = true')
            else:
                route.continue_()

        self.page.on('requestfailed', lambda request: failures.append(request.failure))
        self.page.route('**/v1/consulta?*', delay)
        self.page.evaluate('window.delayedRestResponseReady = false')
        self.page.locator('#clinica').select_option(self.ids[0])
        expect(self.page.locator('[data-ui="results"]')).to_have_attribute('aria-busy', 'true')
        self.page.wait_for_function('window.delayedRestResponseReady === true')
        self.choose_clinic(1)
        self.assertEqual(len(pending), 1)
        route, response = pending.pop()
        route.fulfill(response=response)
        expect(self.consultation_rows()).to_have_count(1)

        delay_next = True
        self.page.evaluate('window.delayedRestResponseReady = false')
        self.page.locator('#fechaDesde').fill('2000-01-01')
        self.page.locator('#fechaHasta').fill('2000-01-01')
        self.page.get_by_role('button', name='Aplicar filtros').click()
        expect(self.page.locator('[data-ui="results"]')).to_have_attribute('aria-busy', 'true')
        self.page.wait_for_function('window.delayedRestResponseReady === true')
        self.page.get_by_role('button', name='Limpiar', exact=True).click()
        expect(self.page.locator('[data-ui="total"]')).to_have_text('1')
        self.assertEqual(len(pending), 1)
        route, response = pending.pop()
        route.fulfill(response=response)
        expect(self.consultation_rows()).to_have_count(1)
        expect(self.page.locator('[data-ui="selectedClinic"]')).to_have_text('Clínica ficticia B')
        expect(self.page.locator('[data-ui="actionError"]')).to_be_hidden()
        self.assertEqual(failures, ['net::ERR_ABORTED', 'net::ERR_ABORTED'])
        self.observations['cancelledRequests'] = {'clinic': True, 'filters': True, 'realRestBodies': True}

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
        expect(self.consultation_rows().first).to_contain_text(text)
        self.assertEqual(self.consultation_rows().locator('img').count(), 0)
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
                    const table = document.querySelector('.table-scroll');
                    const form = document.querySelector('.filter-grid').getBoundingClientRect();
                    return {viewport: innerWidth, document: document.documentElement.scrollWidth,
                        tableContainer: table.clientWidth, tableContent: table.scrollWidth,
                        cardsInsideResults: [...document.querySelectorAll('tarjeta-consulta')].every(card => {
                            const box = card.getBoundingClientRect();
                            const panel = document.querySelector('[data-ui="results"]').getBoundingClientRect();
                            return box.left >= panel.left && box.right <= panel.right;
                        }),
                        fieldsInsideForm: [...document.querySelectorAll('.filter-grid input')].every(input => {
                            const box = input.getBoundingClientRect();
                            return box.left >= form.left - 1 && box.right <= form.right + 1;
                        })};
                }''')
                layouts.append(layout)
                self.assertLessEqual(layout['document'], width)
                self.assertTrue(layout['fieldsInsideForm'], layout)
                self.assertTrue(layout['cardsInsideResults'], layout)
                # La tabla conserva desplazamiento propio; no ocultar el overflow
                # de toda la página para hacer pasar esta prueba.
                if width <= 390 and not self.using_cards:
                    self.assertGreater(layout['tableContent'], layout['tableContainer'])
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
        'expectsRealCards': EXPECT_CARDS,
        'notes': 'Los tests synthetic interceptan respuestas o emiten eventos sintéticos. El caso real_card_contract exige las tarjetas del checkout; los retardos usan cuerpos REST reales.',
        'observations': getattr(DashboardBrowser, 'observations', {})}
    (ARTIFACTS / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
