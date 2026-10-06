from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / "data" / "repository-hygiene-policy.json").read_text(encoding="utf-8"))
TOKEN = os.environ.get("GITHUB_TOKEN", "")
OWNER = POLICY["owner"]


def api(path: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "SunilgarGusai-repository-hygiene-audit",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(f"https://api.github.com{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def exists(repo: str, path: str) -> bool:
    try:
        api(f"/repos/{OWNER}/{repo}/contents/{path}")
        return True
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return False
        raise


def latest_ci(repo: str):
    try:
        data = api(f"/repos/{OWNER}/{repo}/actions/runs?per_page=10")
    except urllib.error.HTTPError:
        return None
    runs = data.get("workflow_runs", [])
    if not runs:
        return None
    return {
        "name": runs[0].get("name"),
        "status": runs[0].get("status"),
        "conclusion": runs[0].get("conclusion"),
    }


def main():
    rows = []
    warning_count = 0
    critical_count = 0

    for expected in POLICY["repositories"]:
        name = expected["name"]
        actual = api(f"/repos/{OWNER}/{name}")
        warnings = []
        critical = []

        if (actual.get("description") or "") != expected.get("description", ""):
            warnings.append("description")
        if expected.get("homepage") is not None and (actual.get("homepage") or "") != expected.get("homepage", ""):
            warnings.append("homepage")

        actual_topics = set(actual.get("topics") or [])
        expected_topics = set(expected.get("topics") or [])
        if actual_topics != expected_topics:
            warnings.append("topics")

        expected_license = expected.get("expected_license")
        actual_license = (actual.get("license") or {}).get("spdx_id")
        if expected_license and actual_license != expected_license:
            warnings.append(f"license ({actual_license or 'none'} != {expected_license})")

        for path in expected.get("required_files", []):
            if not exists(name, path):
                critical.append(f"missing {path}")

        ci = latest_ci(name) if expected.get("ci_required") else None
        if expected.get("ci_required"):
            if ci is None:
                critical.append("no GitHub Actions run")
            elif ci["status"] == "completed" and ci["conclusion"] not in {"success", "neutral", "skipped"}:
                critical.append(f"latest CI {ci['conclusion']}")

        warning_count += len(warnings)
        critical_count += len(critical)
        rows.append((name, warnings, critical, ci))

    lines = [
        "# Public Repository Hygiene Audit",
        "",
        f"Policy version: **{POLICY['version']}**",
        "",
        "| Repository | Metadata drift | Critical checks | Latest CI |",
        "|---|---|---|---|",
    ]

    for name, warnings, critical, ci in rows:
        warn = ", ".join(warnings) if warnings else "—"
        crit = ", ".join(critical) if critical else "—"
        ci_text = "—" if ci is None else f"{ci['status']} / {ci['conclusion'] or 'pending'}"
        lines.append(f"| {name} | {warn} | {crit} | {ci_text} |")

    lines += [
        "",
        f"**Metadata warnings:** {warning_count}",
        f"**Critical repository checks:** {critical_count}",
        "",
        "Metadata drift is reported but does not fail the workflow because GitHub About/Topics administration is intentionally kept separate from scientific repository content.",
    ]

    report = "\n".join(lines) + "\n"
    print(report)

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        Path(summary).write_text(report, encoding="utf-8")

    if critical_count:
        raise SystemExit(f"{critical_count} critical repository-hygiene check(s) failed.")


if __name__ == "__main__":
    main()
