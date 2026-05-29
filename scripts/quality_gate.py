import argparse
import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
NODE_VERSION = "v24.16.0"


def backend_python():
    exe = "python.exe" if os.name == "nt" else "python"
    return PROJECT_ROOT / "backend" / ".venv" / ("Scripts" if os.name == "nt" else "bin") / exe


def fnm_executable():
    if os.name == "nt":
        return Path.home() / "AppData" / "Local" / "fnm" / "fnm.exe"
    return Path("fnm")


def backend_pytest_env(base=None):
    env = dict(base or os.environ)
    env["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"
    return env


def backend_pytest_command():
    return [
        str(backend_python()),
        "-m",
        "pytest",
        "-q",
        "-p",
        "no:cacheprovider",
        str(PROJECT_ROOT / "backend" / "tests"),
    ]


def frontend_command(script_name):
    pnpm = "pnpm.cmd" if os.name == "nt" else "pnpm"
    return [
        str(fnm_executable()),
        "exec",
        "--using",
        NODE_VERSION,
        pnpm,
        "run",
        script_name,
    ]


def run(command, cwd=PROJECT_ROOT, env=None):
    print(f"$ {' '.join(command)}")
    return subprocess.run(command, cwd=cwd, env=env, check=False).returncode


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run HedgeAI quality gates.")
    parser.add_argument("--backend-only", action="store_true")
    parser.add_argument("--frontend-only", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args(argv)

    steps = []
    if not args.frontend_only:
        steps.append((backend_pytest_command(), PROJECT_ROOT, backend_pytest_env()))
    if not args.backend_only:
        steps.append((frontend_command("test"), FRONTEND_DIR, None))
        if not args.skip_build:
            steps.append((frontend_command("build"), FRONTEND_DIR, None))

    for command, cwd, env in steps:
        code = run(command, cwd=cwd, env=env)
        if code != 0:
            return code
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
