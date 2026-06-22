from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_SERVER = ROOT / "backend" / "server.py"
BACKEND_INDEX = ROOT / "backend" / "data" / "law_index.joblib"
BACKEND_PORT = 8001
FRONTEND_PORT = 3000


def bundled_python() -> str:
    candidate = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "python"
        / "python.exe"
    )
    return str(candidate if candidate.exists() else sys.executable)


def npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def clean_env(env: dict[str, str]) -> dict[str, str]:
    if os.name != "nt":
        return env

    cleaned: dict[str, str] = {}
    seen: set[str] = set()
    for key, value in env.items():
        lowered = key.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned[key] = value
    return cleaned


def print_step(message: str) -> None:
    print(f"[PakLaw] {message}", flush=True)


def wait_for_url(name: str, url: str, timeout: int) -> bool:
    start = time.time()
    spinner = "|/-\\"
    idx = 0

    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if 200 <= response.status < 500:
                    elapsed = int(time.time() - start)
                    print(f"\r[PakLaw] {name} ready after {elapsed}s.{' ' * 20}")
                    return True
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            pass

        elapsed = int(time.time() - start)
        print(
            f"\r[PakLaw] Waiting for {name} {spinner[idx % len(spinner)]} {elapsed}s/{timeout}s",
            end="",
            flush=True,
        )
        idx += 1
        time.sleep(1)

    print(f"\r[PakLaw] {name} did not become ready within {timeout}s.{' ' * 20}")
    return False


def stream_output(name: str, process: subprocess.Popen[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        text = line.rstrip()
        if text:
            print(f"[{name}] {text}", flush=True)


def start_process(
    name: str,
    command: list[str],
    cwd: Path,
    env: dict[str, str] | None = None,
) -> subprocess.Popen[str]:
    print_step(f"Starting {name}...")
    process = subprocess.Popen(
        command,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    threading.Thread(target=stream_output, args=(name, process), daemon=True).start()
    return process


def stop_process(name: str, process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return

    print_step(f"Stopping {name}...")
    try:
        if os.name == "nt":
            process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            process.terminate()
        process.wait(timeout=8)
    except Exception:
        process.kill()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Start PakLaw AI backend and frontend together."
    )
    parser.add_argument(
        "--frontend-port",
        type=int,
        default=FRONTEND_PORT,
        help="Next.js dev server port.",
    )
    parser.add_argument(
        "--backend-port",
        type=int,
        default=BACKEND_PORT,
        help="PakLaw AI backend port. Currently backend/server.py defaults to 8001.",
    )
    parser.add_argument(
        "--skip-index-check",
        action="store_true",
        help="Start even if backend/data/law_index.joblib is missing.",
    )
    args = parser.parse_args()

    if args.backend_port != BACKEND_PORT:
        print_step("Warning: backend/server.py currently listens on 8001 only.")

    if not BACKEND_SERVER.exists():
        print_step(f"Backend server not found: {BACKEND_SERVER}")
        return 1

    if not args.skip_index_check and not BACKEND_INDEX.exists():
        print_step("Search index is missing.")
        print_step(
            f"Build it first: {bundled_python()} {ROOT / 'backend' / 'build_index.py'}"
        )
        return 1

    env = clean_env(os.environ.copy())
    env.setdefault("NEXT_PUBLIC_AI_API_URL", f"http://127.0.0.1:{args.backend_port}")

    backend: subprocess.Popen[str] | None = None
    frontend: subprocess.Popen[str] | None = None

    try:
        print_step("Launching full stack...")
        print_step("Backend: local AI retrieval + reasoning service")
        print_step("Frontend: Next.js app")

        backend = start_process(
            "backend",
            [bundled_python(), str(BACKEND_SERVER)],
            ROOT,
            env=env,
        )
        backend_ready = wait_for_url(
            "backend",
            f"http://127.0.0.1:{args.backend_port}/health",
            timeout=45,
        )
        if not backend_ready:
            return 1

        frontend = start_process(
            "frontend",
            [npm_command(), "run", "dev", "--", "-p", str(args.frontend_port)],
            FRONTEND_DIR,
            env=env,
        )
        frontend_ready = wait_for_url(
            "frontend",
            f"http://127.0.0.1:{args.frontend_port}",
            timeout=90,
        )
        if not frontend_ready:
            return 1

        print()
        print_step("PakLaw AI is running.")
        print_step(f"Frontend: http://127.0.0.1:{args.frontend_port}")
        print_step(f"Backend:  http://127.0.0.1:{args.backend_port}")
        print_step("Press Ctrl+C here to stop both servers.")

        while True:
            if backend.poll() is not None:
                print_step("Backend stopped unexpectedly.")
                return backend.returncode or 1
            if frontend.poll() is not None:
                print_step("Frontend stopped unexpectedly.")
                return frontend.returncode or 1
            time.sleep(1)

    except KeyboardInterrupt:
        print()
        print_step("Shutdown requested.")
        return 0
    finally:
        if frontend is not None:
            stop_process("frontend", frontend)
        if backend is not None:
            stop_process("backend", backend)
        print_step("All done.")


if __name__ == "__main__":
    raise SystemExit(main())
