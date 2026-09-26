#!/usr/bin/env python3
"""Remind the agent when the parent gitlink lags yohaku-oss HEAD."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OSS = ROOT / "yohaku-oss"


def git(*args: str, cwd: Path = ROOT) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def gitlink_sha(spec: str) -> str:
    return git("rev-parse", spec)


def main() -> None:
    if not (ROOT / ".gitmodules").is_file() or not OSS.is_dir():
        print("{}")
        return

    recorded = gitlink_sha("HEAD:yohaku-oss")
    head = git("rev-parse", "HEAD", cwd=OSS)
    if not recorded or not head or recorded == head:
        print("{}")
        return

    staged = gitlink_sha(":yohaku-oss")
    if staged == head:
        message = (
            f"yohaku-oss pin is staged ({head[:7]}) but not committed. "
            "Commit and push the parent: "
            "chore(mobile): bump public iOS source — <latest oss subject>"
        )
    else:
        message = (
            f"yohaku-oss HEAD is {head[:7]} but the parent pin is {recorded[:7]}. "
            "Public work is not done. In the parent: git add yohaku-oss "
            "(plus pnpm-workspace.yaml / pnpm-lock.yaml if a public patch changed), "
            "commit chore(mobile): bump public iOS source — <latest oss subject>, "
            "and push Innei-dev/Yohaku."
        )

    print(json.dumps({"followup_message": message}))


if __name__ == "__main__":
    try:
        sys.stdin.read()
        main()
    except Exception:
        print("{}")
