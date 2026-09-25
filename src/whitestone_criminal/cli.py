"""Human welcome for a package that is not ready yet."""

from __future__ import annotations

import json
import sys

AUTHOR = "Aziel Eliab"
NAME = "Whitestone-Criminal"
PRACTICE_AREA = "criminal procedure"
LAMB_LENS = ("Service", "Clarity", "Peace")

SUMMARY = (
    "This package is not ready yet. "
    "This welcome is the only screen in this download."
)
NEXT = (
    "When a release of this package ships, install that release "
    "and run whitestone-criminal again. That run is the first useful screen."
)
TRY = "Try: whitestone-criminal   or   whitestone-criminal --help"

HELP_FLAGS = {"-h", "--help"}
JSON_FLAGS = {"--json"}


def status_payload() -> dict:
    return {
        "ok": True,
        "name": NAME,
        "author": AUTHOR,
        "ready": False,
        "status": "not_ready",
        "practice_area": PRACTICE_AREA,
        "lamb_lens": list(LAMB_LENS),
        "summary": SUMMARY,
        "next": NEXT,
    }


def render_welcome() -> str:
    return (
        f"{NAME}\n"
        "\n"
        "Service\n"
        f"{NEXT}\n"
        "\n"
        "Clarity\n"
        f"{SUMMARY} Practice area: {PRACTICE_AREA}.\n"
        "\n"
        "Peace\n"
        f"Author: {AUTHOR}.\n"
        "\n"
        "Next:\n"
        "  whitestone-criminal --help\n"
        "  whitestone-criminal --json\n"
    )


def render_help() -> str:
    return (
        f"{NAME}\n"
        "\n"
        "Usage:\n"
        "  whitestone-criminal [--json]\n"
        "  whitestone-criminal --help\n"
        "\n"
        f"{SUMMARY}\n"
        f"{NEXT}\n"
        "\n"
        "Options:\n"
        "  --json       Print the same status as JSON\n"
        "  -h, --help   Show this help\n"
        "\n"
        "Examples:\n"
        "  whitestone-criminal\n"
        "  whitestone-criminal --help\n"
        "  whitestone-criminal --json\n"
    )


def _error(command: str, as_json: bool) -> int:
    reason = f'Unknown command "{command}".'
    if as_json:
        print(
            json.dumps(
                {"ok": False, "ready": False, "error": reason, "next": TRY},
                indent=2,
            )
        )
    else:
        print(f"{reason} {TRY}")
    return 2


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    unknown = [item for item in args if item not in HELP_FLAGS and item not in JSON_FLAGS]
    wants_json = any(item in JSON_FLAGS for item in args)
    wants_help = any(item in HELP_FLAGS for item in args)

    if unknown:
        return _error(unknown[0], wants_json)
    if wants_help:
        print(render_help())
        return 0
    if wants_json:
        print(json.dumps(status_payload(), indent=2))
        return 0
    print(render_welcome(), end="")
    return 0
