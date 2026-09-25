"""Checks for the unreleased welcome stub."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SRC)
    return subprocess.run(
        [sys.executable, "-m", "whitestone_criminal", *args],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )


class WelcomeStubTests(unittest.TestCase):
    def test_bare_welcome_order(self) -> None:
        result = run([])
        self.assertEqual(result.returncode, 0, result.stderr)
        text = result.stdout
        self.assertLess(text.index("Service"), text.index("Clarity"))
        self.assertLess(text.index("Clarity"), text.index("Peace"))
        self.assertIn("not ready yet", text)
        self.assertIn("criminal procedure", text)
        self.assertIn("Aziel Eliab", text)
        self.assertIn("whitestone-criminal --help", text)
        self.assertIn("install that release", text)
        self.assertNotIn("not a lawyer", text.lower())
        self.assertNotIn("what this is not", text.lower())
        self.assertEqual(result.stderr, "")

    def test_help(self) -> None:
        result = run(["--help"])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Usage:", result.stdout)
        self.assertIn("Examples:", result.stdout)
        self.assertIn("--json", result.stdout)
        self.assertNotIn("changelog", result.stdout.lower())
        self.assertEqual(result.stderr, "")

    def test_json(self) -> None:
        result = run(["--json"])
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["ready"])
        self.assertEqual(payload["status"], "not_ready")
        self.assertEqual(payload["author"], "Aziel Eliab")
        self.assertEqual(payload["lamb_lens"], ["Service", "Clarity", "Peace"])
        self.assertEqual(payload["practice_area"], "criminal procedure")
        self.assertIn("not ready yet", payload["summary"])

    def test_unknown_command(self) -> None:
        result = run(["bogus"])
        self.assertEqual(result.returncode, 2)
        self.assertIn('Unknown command "bogus".', result.stdout)
        self.assertIn("whitestone-criminal --help", result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_unknown_command_json(self) -> None:
        result = run(["--json", "bogus"])
        self.assertEqual(result.returncode, 2)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertFalse(payload["ready"])
        self.assertIn("bogus", payload["error"])
        self.assertIn("whitestone-criminal --help", payload["next"])


if __name__ == "__main__":
    unittest.main()
