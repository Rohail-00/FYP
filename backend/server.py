from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from legal_ai import (
    LegalIndex,
    analyze_clause,
    analyze_uploaded_repository,
    health_payload,
    search_uploaded_repository,
)


HOST = "127.0.0.1"
PORT = 8001
ROOT = Path(__file__).resolve().parents[1]
MODEL_MANIFEST_PATH = ROOT / "backend" / "model_manifest.json"


class AppState:
    index: LegalIndex | None = None


def load_index() -> LegalIndex:
    if AppState.index is None:
        AppState.index = LegalIndex()
    return AppState.index


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw)


class PakLawHandler(BaseHTTPRequestHandler):
    server_version = "PakLawAI/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        print("%s - %s" % (self.address_string(), fmt % args))

    def do_OPTIONS(self) -> None:
        json_response(self, 200, {"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            json_response(self, 200, health_payload())
            return

        if parsed.path == "/models":
            try:
                manifest = json.loads(MODEL_MANIFEST_PATH.read_text(encoding="utf-8"))
                cache_dir = ROOT / manifest["cache_dir"]
                cached = []
                for profile_models in manifest["profiles"].values():
                    for model in profile_models:
                        model_id = model["id"]
                        marker = cache_dir / model_id.replace("/", "__")
                        cached.append(
                            {
                                **model,
                                "cached": marker.exists(),
                                "path": str(marker),
                            }
                        )
                json_response(
                    self,
                    200,
                    {
                        "cacheDir": str(cache_dir),
                        "profiles": manifest["profiles"],
                        "cachedModels": cached,
                    },
                )
            except Exception as exc:
                json_response(self, 500, {"error": str(exc)})
            return

        if parsed.path == "/search":
            params = parse_qs(parsed.query)
            query = (params.get("q") or [""])[0]
            top_k = int((params.get("topK") or ["8"])[0])
            try:
                index = load_index()
                json_response(self, 200, {"results": index.search(query, top_k=top_k)})
            except Exception as exc:
                json_response(self, 500, {"error": str(exc)})
            return

        json_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/search-repo":
            try:
                body = read_json(self)
                query = str(body.get("query") or body.get("q") or "").strip()
                files = body.get("files")
                top_k = int(body.get("topK") or 8)

                if not query:
                    json_response(self, 422, {"error": "query is required"})
                    return
                if not isinstance(files, list) or not files:
                    json_response(self, 422, {"error": "files are required"})
                    return

                json_response(
                    self,
                    200,
                    search_uploaded_repository(query, files, top_k=top_k),
                )
            except Exception as exc:
                json_response(self, 500, {"error": str(exc)})
            return

        if parsed.path == "/analyze-repo":
            try:
                body = read_json(self)
                draft = str(body.get("draft") or body.get("text") or "").strip()
                files = body.get("files")
                top_k = int(body.get("topK") or 5)
                scope_label = str(body.get("scopeLabel") or "Selected Repository")

                if not draft:
                    json_response(self, 422, {"error": "draft is required"})
                    return
                if not isinstance(files, list) or not files:
                    json_response(self, 422, {"error": "files are required"})
                    return

                json_response(
                    self,
                    200,
                    analyze_uploaded_repository(
                        draft,
                        files,
                        top_k=top_k,
                        scope_label=scope_label,
                    ),
                )
            except Exception as exc:
                json_response(self, 500, {"error": str(exc)})
            return

        if parsed.path != "/analyze":
            json_response(self, 404, {"error": "Not found"})
            return

        try:
            body = read_json(self)
            draft = str(body.get("draft") or body.get("text") or "").strip()
            top_k = int(body.get("topK") or 5)
            if not draft:
                json_response(self, 422, {"error": "draft is required"})
                return

            index = load_index()
            json_response(self, 200, analyze_clause(index, draft, top_k=top_k))
        except Exception as exc:
            json_response(self, 500, {"error": str(exc)})


def main() -> None:
    print(f"PakLaw AI backend starting at http://{HOST}:{PORT}")
    print("Build the index first if /health says ok=false: python backend/build_index.py")
    server = ThreadingHTTPServer((HOST, PORT), PakLawHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
