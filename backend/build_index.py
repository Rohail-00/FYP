from __future__ import annotations

import argparse
import json

from legal_ai import build_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Build PakLaw AI PDF retrieval index.")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit for faster smoke builds.",
    )
    args = parser.parse_args()

    report = build_index(limit=args.limit)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
