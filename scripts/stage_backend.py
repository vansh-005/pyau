"""Stage the zip-Lambda bundle: domain package + services + Linux wheels (pydantic). Output: infra/build/backend."""
import shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "infra" / "build" / "backend"
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
ignore = shutil.ignore_patterns("__pycache__", "*.pyc")
shutil.copytree(ROOT / "packages/domain/pyau_domain", OUT / "pyau_domain", ignore=ignore)
shutil.copytree(ROOT / "services", OUT / "services", ignore=ignore)
shutil.copy(ROOT / "fixtures/east-delhi-demo.json", OUT / "east-delhi-demo.json")
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", "--target", str(OUT),
    "--platform", "manylinux2014_x86_64", "--implementation", "cp", "--python-version", "3.12",
    "--only-binary=:all:", "pydantic==2.14.0", "amazon-transcribe==0.6.4",
])
print("staged", OUT)
