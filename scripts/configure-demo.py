#!/usr/bin/env python3
"""Create a private local FE config from the isolated backend demo credentials."""
import json
import os
from pathlib import Path
import sys
import base64

frontend = Path(__file__).resolve().parents[1]
backend = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else frontend.parent / "Galenos"
source = backend / ".galenos-demo" / "crud" / "credentials.json"
if not source.is_file():
    raise SystemExit(f"No se encontró la credencial de demostración en {source}; inicia primero el perfil CRUD demo.")
accounts = json.loads(source.read_text(encoding="utf-8"))
account_name = sys.argv[2] if len(sys.argv) > 2 else "editor"
if account_name not in {"editor", "medico", "lector", "otro"}:
    raise SystemExit("Selecciona una cuenta demo conocida: editor, medico, lector u otro.")
account = accounts.get(account_name)
if not account or not account.get("username") or not account.get("password"):
    raise SystemExit("El archivo de credenciales no contiene la cuenta editor del entorno sintético.")
token = base64.b64encode(f"{account['username']}:{account['password']}".encode()).decode()
port = os.environ.get("GALENOS_CRUD_HTTP_PORT", "19083")
config = "export const gestionConfig = { baseUrl: 'http://localhost:" + port + "/GalenosSV/resources/', http: { headers: { Authorization: 'Basic " + token + "' } } };\n"
target = frontend / "src" / "js" / "control" / "environment.local.js"
target.write_text(config, encoding="utf-8")
target.chmod(0o600)
print(f"Configuración privada creada para la cuenta demo {account_name} en src/js/control/environment.local.js (no mostrar ni subir a Git).")
