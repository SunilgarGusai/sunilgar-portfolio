from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "data" / "repository-hygiene-policy.json"
API = "https://api.github.com"


def request(method: str, path: str, token: str, payload: dict | None = None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API + path,
        data=body,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "SunilgarGusai-repository-metadata-sync",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    owner = policy["owner"]
    token = os.environ.get("REPOSITORY_ADMIN_TOKEN", "")

    if not args.dry_run and not token:
        raise SystemExit(
            "REPOSITORY_ADMIN_TOKEN is missing. Add a fine-grained PAT with "
            "Administration: Read and write permission for the listed repositories."
        )

    rows = []
    changed = 0

    for spec in policy["repositories"]:
        repo = spec["name"]
        desired_description = spec.get("description") or ""
        desired_homepage = spec.get("homepage")
        desired_topics = sorted(set(spec.get("topics") or []))

        # The script is intentionally limited to three public metadata fields.
        patch_payload = {"description": desired_description}
        if desired_homepage is not None:
            patch_payload["homepage"] = desired_homepage

        if args.dry_run:
            rows.append({
                "repository": repo,
                "description": desired_description,
                "homepage": desired_homepage,
                "topics": desired_topics,
                "mode": "dry-run",
            })
            continue

        current = request("GET", f"/repos/{owner}/{repo}", token)
        current_topics = sorted(current.get("topics") or [])

        repo_needs_patch = (
            (current.get("description") or "") != desired_description
            or (
                desired_homepage is not None
                and (current.get("homepage") or "") != desired_homepage
            )
        )
        topics_need_patch = current_topics != desired_topics

        if repo_needs_patch:
            request("PATCH", f"/repos/{owner}/{repo}", token, patch_payload)
            changed += 1

        if topics_need_patch:
            request(
                "PUT",
                f"/repos/{owner}/{repo}/topics",
                token,
                {"names": desired_topics},
            )
            changed += 1

        rows.append({
            "repository": repo,
            "description_changed": repo_needs_patch,
            "homepage_changed": (
                desired_homepage is not None
                and (current.get("homepage") or "") != desired_homepage
            ),
            "topics_changed": topics_need_patch,
        })

    print(json.dumps(rows, indent=2, ensure_ascii=False))
    print(f"Metadata operations applied: {changed}")


if __name__ == "__main__":
    main()
