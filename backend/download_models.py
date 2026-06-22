from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "backend" / "model_manifest.json"


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Download PakLaw AI model cache.")
    parser.add_argument(
        "--profile",
        choices=["demo", "full"],
        default="demo",
        help="demo is smaller for presentation day; full downloads the planned Part 2 model set.",
    )
    args = parser.parse_args()

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("Missing dependency: huggingface-hub")
        print("Install first:")
        print("  pip install -r backend/requirements-ai.txt")
        return 1

    manifest = load_manifest()
    cache_dir = ROOT / manifest["cache_dir"]
    cache_dir.mkdir(parents=True, exist_ok=True)
    models = manifest["profiles"][args.profile]

    print(f"PakLaw AI model download profile: {args.profile}")
    print(f"Cache directory: {cache_dir}")
    print(f"Models: {len(models)}")

    for index, model in enumerate(models, start=1):
        model_id = model["id"]
        target = cache_dir / model_id.replace("/", "__")
        print(f"\n[{index}/{len(models)}] {model_id}")
        print(f"Purpose: {model['purpose']}")
        snapshot_download(
            repo_id=model_id,
            local_dir=target,
        )
        print(f"Cached at: {target}")

    print("\nAll requested models are cached.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
