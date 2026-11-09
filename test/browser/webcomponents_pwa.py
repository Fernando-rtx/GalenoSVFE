"""Prueba de navegador de componentes y shell PWA; solo datos sintéticos."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:3000'
TAGS = ['galenos-dashboard', 'galenos-catalogos', 'galenos-consulta-gestion',
        'galenos-ordenes', 'galenos-personas', 'galenos-procedimientos',
        'galenos-relaciones', 'galenos-notifications', 'tarjeta-consulta']

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(service_workers='allow')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(f'{BASE}/test/browser/componentes.html')
    expect(page.locator('#resultado')).to_contain_text('PASS:', timeout=10000)
    page.goto(f'{BASE}/test/browser/page_components.html')
    expect(page.locator('#resultado')).to_contain_text('PASS:', timeout=10000)
    page.goto(BASE)
    page.wait_for_function('() => !!customElements.get("galenos-relaciones")')
    registered = page.evaluate('(tags) => tags.every(tag => !!customElements.get(tag))', TAGS)
    assert registered, 'Falta registrar un Custom Element'
    expect(page.locator('galenos-dashboard #main')).to_be_visible()
    page.locator('[data-module="rol"]').click()
    expect(page.locator('galenos-catalogos #gestion-usuario')).to_be_visible()
    assert page.evaluate('location.hash') == '#rol'
    page.go_back()
    expect(page.locator('galenos-dashboard #main')).to_be_visible()
    assert page.evaluate('location.hash') in ('', '#main')
    page.evaluate('''() => {
      const host = document.createElement('div');
      host.attachShadow({mode:'open'});
      document.body.append(host);
      for(let count=0;count<2;count++) host.shadowRoot.dispatchEvent(new CustomEvent('galenos:notificacion', {
        detail:{tipo:'advertencia',mensaje:'Aviso sintético'},bubbles:true,composed:true
      }));
    }''')
    assert page.locator('galenos-notifications').evaluate('(node) => node.shadowRoot.querySelectorAll(".notice").length') == 1
    page.locator('galenos-notifications').evaluate('(node) => node.shadowRoot.querySelector("button").click()')
    assert page.locator('galenos-notifications').evaluate('(node) => node.shadowRoot.querySelectorAll(".notice").length') == 0
    current_theme = page.evaluate('document.documentElement.dataset.theme')
    page.locator('#themeToggle').click()
    assert page.evaluate('document.documentElement.dataset.theme') != current_theme
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desbordamiento horizontal en móvil'
    page.set_viewport_size({'width': 1280, 'height': 900})
    page.evaluate('() => navigator.serviceWorker.ready')
    cdp = context.new_cdp_session(page)
    app_manifest = cdp.send('Page.getAppManifest')
    installability = cdp.send('Page.getInstallabilityErrors')
    assert not app_manifest['errors'], app_manifest['errors']
    assert not installability['installabilityErrors'], installability['installabilityErrors']
    page.reload()
    page.wait_for_function('() => !!navigator.serviceWorker.controller', timeout=15000)
    manifest = page.evaluate('''async () => {
      const response = await fetch('/manifest.webmanifest');
      return response.json();
    }''')
    assert manifest['name'] == 'GalenosSV'
    context.route('**/api/synthetic-patients', lambda route: route.fulfill(
        status=200, content_type='application/json', body='[{"nombre":"Paciente sintético"}]'))
    assert page.evaluate("async () => (await fetch('/api/synthetic-patients')).ok")
    cache = page.evaluate('''async () => {
      const keys = await caches.keys();
      const entries = (await Promise.all(keys.map(async key => (await caches.open(key)).keys()))).flat();
      return {keys, urls:entries.map(request => new URL(request.url).pathname)};
    }''')
    assert any(key.startswith('galenossv-shell-v2') for key in cache['keys'])
    assert '/' in cache['urls']
    assert all('/api/' not in url and '/resources/v2/' not in url and 'environment.local.js' not in url for url in cache['urls'])
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    expect(page.locator('galenos-dashboard #main h1')).to_have_text('Consultas')
    assert not errors, errors
    evidence = {'cards_fixture': 'PASS', 'page_component_lifecycle': 'PASS', 'custom_elements': TAGS, 'spa_back': 'PASS',
                'theme_and_mobile': 'PASS',
                'shadow_event_dedup_close': 'PASS', 'manifest': manifest['name'],
                'service_worker_cache': cache['keys'], 'offline_shell': 'PASS',
                'chromium_installability_errors': installability['installabilityErrors'],
                'clinical_cache_entries': 0, 'page_errors': errors}
    Path('test/evidence/webcomponents-pwa.json').write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(evidence, ensure_ascii=False))
    browser.close()
