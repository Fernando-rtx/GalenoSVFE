"""Entrada conservada: delega en el único runner Chromium vigente, sin duplicarlo."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
raise SystemExit(subprocess.call(["node", "test/browser/webcomponents-pwa.mjs"], cwd=root))
