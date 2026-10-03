from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "academic-profile.json"
INDEX = ROOT / "index.html"
CV_PUBLICATIONS = ROOT / "cv" / "publications.tex"
CV_EXPERIENCE = ROOT / "cv" / "experience.tex"
CV_RESPONSIBILITIES = ROOT / "cv" / "responsibilities.tex"
CV_OPEN_RESEARCH = ROOT / "cv" / "open_research.tex"

PORTFOLIO_PUB_START = "<!-- ACADEMIC_SYNC:PORTFOLIO_PUBLICATIONS:START -->"
PORTFOLIO_PUB_END = "<!-- ACADEMIC_SYNC:PORTFOLIO_PUBLICATIONS:END -->"
PORTFOLIO_LEAD_START = "<!-- ACADEMIC_SYNC:PORTFOLIO_LEADERSHIP:START -->"
PORTFOLIO_LEAD_END = "<!-- ACADEMIC_SYNC:PORTFOLIO_LEADERSHIP:END -->"

VALID_STATUSES = {"published", "accepted", "under_review", "submitted", "current_research"}
FORBIDDEN_PUBLIC_STATUSES = {"rejected", "withdrawn"}
SURFACES = {"cv", "portfolio", "github_profile"}


def load_data() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


def validate(data: dict) -> list[str]:
    errors: list[str] = []

    if data.get("schema_version") != 1:
        errors.append("schema_version must be 1")

    seen = set()
    for item in data.get("scholarship", []):
        item_id = item.get("id")
        if not item_id:
            errors.append("Every scholarship item requires an id")
            continue
        if item_id in seen:
            errors.append(f"Duplicate scholarship id: {item_id}")
        seen.add(item_id)

        status = item.get("status")
        if status not in VALID_STATUSES:
            errors.append(f"{item_id}: unsupported status {status!r}")
        if status in FORBIDDEN_PUBLIC_STATUSES:
            errors.append(f"{item_id}: rejected/withdrawn items must not be stored in the public master record")

        vis = item.get("visibility", {})
        for surface in SURFACES:
            if surface not in vis or not isinstance(vis[surface], bool):
                errors.append(f"{item_id}: visibility.{surface} must be boolean")

        if (vis.get("portfolio") or vis.get("github_profile")) and status not in {"published", "accepted"}:
            errors.append(
                f"{item_id}: only published/accepted scholarship may auto-render on portfolio/profile"
            )

    role_seen = set()
    for role in data.get("roles", []):
        role_id = role.get("id")
        if not role_id:
            errors.append("Every role requires an id")
            continue
        if role_id in role_seen:
            errors.append(f"Duplicate role id: {role_id}")
        role_seen.add(role_id)
        vis = role.get("visibility", {})
        for surface in SURFACES:
            if surface not in vis or not isinstance(vis[surface], bool):
                errors.append(f"{role_id}: visibility.{surface} must be boolean")

    programme_seen = set()
    for project in data.get("research_programmes", []):
        repo = project.get("repository")
        if not repo:
            errors.append("Every research programme requires repository")
            continue
        if repo in programme_seen:
            errors.append(f"Duplicate research repository: {repo}")
        programme_seen.add(repo)

    # Bespoke visual project cards are protected. If the master says a project
    # should be showcased, the corresponding card must already exist.
    index = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    for project in data.get("research_programmes", []):
        if project.get("showcase", {}).get("portfolio"):
            repo = project["repository"]
            if f"github.com/SunilgarGusai/{repo}" not in index:
                errors.append(
                    f"{repo}: portfolio showcase requested but no curated visual card exists"
                )

    return errors


def latex_escape(text: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
    }
    out = []
    for ch in text:
        out.append(replacements.get(ch, ch))
    return "".join(out)


def format_period(period: str) -> str:
    if period.endswith(" -- Present"):
        return latex_escape(period[:-len("Present")]) + r"\textbf{Present}"
    return latex_escape(period)


def replace_marked(text: str, start: str, end: str, body: str) -> str:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
    replacement = f"{start}\n{body.rstrip()}\n{end}"
    if not pattern.search(text):
        raise RuntimeError(f"Missing sync markers: {start} / {end}")
    return pattern.sub(replacement, text, count=1)


def render_portfolio_publications(data: dict) -> str:
    items = [x for x in data["scholarship"] if x["visibility"]["portfolio"]]
    articles = []

    for item in items:
        title = html.escape(item["title"])
        tags = "".join(f"<span>{html.escape(tag)}</span>" for tag in item.get("tags", []))

        if item["status"] == "accepted":
            venue = html.escape(item["venue"])
            manuscript = html.escape(item.get("manuscript_id", ""))
            date = html.escape(item.get("decision_date", ""))
            p = (
                f"<p><em>{venue}</em>"
                f"{' · Manuscript ' + manuscript if manuscript else ''}"
                f" · accepted for publication on <strong>{date}</strong>; "
                "public publication metadata pending.</p>"
            )
            article = (
                '<article class="publication-item accepted-item">'
                '<div class="pub-year">Accepted</div>'
                f'<div class="pub-content"><h3>{title}</h3>{p}'
                f'<div class="pub-tags">{tags}</div></div></article>'
            )
        else:
            authors_raw = item.get("authors", "")
            if "," in authors_raw:
                first, rest = authors_raw.split(",", 1)
                authors_html = f"<strong>{html.escape(first)}</strong>," + html.escape(rest)
            else:
                authors_html = f"<strong>{html.escape(authors_raw)}</strong>"
            venue = html.escape(item["venue"])
            detail = html.escape(item.get("citation_detail", ""))
            p = f"<p>{authors_html}. <em>{venue}</em>, {detail}.</p>"
            doi = ""
            if item.get("doi") and item.get("show_doi", {}).get("portfolio", True):
                doi_url = "https://doi.org/" + item["doi"]
                doi = (
                    '<div class="publication-actions">'
                    f'<a href="{html.escape(doi_url)}" target="_blank" rel="noopener">DOI ↗</a>'
                    "</div>"
                )
            article = (
                '<article class="publication-item">'
                f'<div class="pub-year">{item["year"]}</div>'
                f'<div class="pub-content"><h3>{title}</h3>{p}{doi}'
                f'<div class="pub-tags">{tags}</div></div></article>'
            )
        articles.append("    " + article)

    inner = "\n\n".join(articles)
    return (
        '<section id="publications" class="section section-shell"><div class="container">'
        '<div class="section-heading reveal"><p class="section-label">Published & Accepted Scholarship</p>'
        '<h2>Research that has crossed an editorial milestone.</h2>'
        '<p>Published records are linked where a stable DOI or publication page is available. '
        'Accepted work is labelled separately until a public publication record is verifiable.</p>'
        '</div><div class="publication-list reveal">\n\n'
        f"{inner}\n"
        "  </div></div></section>"
    )


def render_portfolio_leadership(data: dict) -> str:
    order = ["program-head-ds", "area-chair-advanced-computing", "assistant-professor"]
    role_map = {x["id"]: x for x in data["roles"]}
    cards = []
    for i, role_id in enumerate(order, start=1):
        role = role_map[role_id]
        if not role["visibility"]["portfolio"]:
            continue
        cards.append(
            f'<article><span>{i:02d}</span><h3>{html.escape(role["portfolio_card_title"])}</h3>'
            f'<p>{html.escape(role["portfolio_card_copy"])}</p></article>'
        )
    tail = data["portfolio_service_card_tail"]
    cards.append(
        f'<article><span>{len(cards)+1:02d}</span><h3>{html.escape(tail["title"])}</h3>'
        f'<p>{html.escape(tail["copy"])}</p></article>'
    )
    return (
        '<section id="leadership" class="section section-shell soft-section"><div class="container">'
        '<div class="section-heading reveal"><p class="section-label">Academic Leadership & Service</p>'
        '<h2>Research, teaching and institutional contribution.</h2></div>'
        f'<div class="service-grid reveal">{"".join(cards)}</div></div></section>'
    )


def render_cv_publications(data: dict) -> str:
    cv_items = [x for x in data["scholarship"] if x["visibility"]["cv"]]
    groups = {
        "published": [],
        "accepted": [],
        "active": [],
        "current_research": [],
    }
    for item in cv_items:
        if item["status"] == "published":
            groups["published"].append(item)
        elif item["status"] == "accepted":
            groups["accepted"].append(item)
        elif item["status"] in {"under_review", "submitted"}:
            groups["active"].append(item)
        elif item["status"] == "current_research":
            groups["current_research"].append(item)

    lines = [r"\begin{rubric}{Research Publications and Manuscripts}", ""]

    if groups["published"]:
        lines += [r"\subrubric{Published Research Articles}", ""]
        for item in groups["published"]:
            detail = item.get("cv_citation_detail", latex_escape(item.get("citation_detail", "")))
            lines += [
                rf"\entry*[{item['year']}]%",
                rf"\textbf{{{latex_escape(item['title'])}}}.\par",
                rf"\emph{{{latex_escape(item['venue'])}}}, {detail}."
                + (
                    rf" DOI: \url{{https://doi.org/{item['doi']}}}"
                    if item.get("doi") and item.get("show_doi", {}).get("cv", True)
                    else ""
                ),
                "",
            ]

    if groups["accepted"]:
        lines += [r"\subrubric{Accepted for Publication}", ""]
        for item in groups["accepted"]:
            manuscript = item.get("manuscript_id")
            detail = (
                rf"Accepted for publication in \emph{{{latex_escape(item['venue'])}}}"
                + (rf", Manuscript ID: {latex_escape(manuscript)}" if manuscript else "")
                + (rf", {latex_escape(item['decision_date'])}" if item.get("decision_date") else "")
                + "."
            )
            lines += [
                rf"\entry*[{item['year']}]%",
                rf"\textbf{{{latex_escape(item['title'])}}}.\par",
                detail,
                "",
            ]

    if groups["active"]:
        lines += [r"\subrubric{Selected Manuscripts Under Review / Submitted}", ""]
        for item in groups["active"]:
            prefix = "Under review" if item["status"] == "under_review" else "Submitted to"
            venue = latex_escape(item["venue"])
            statement = (
                rf"{prefix}, \emph{{{venue}}}."
                if item["status"] == "under_review"
                else rf"{prefix} \emph{{{venue}}}."
            )
            lines += [
                rf"\entry*[{item['year']}]%",
                rf"\textbf{{{latex_escape(item['title'])}}}.\par",
                statement,
                "",
            ]

    if groups["current_research"]:
        lines += [r"\subrubric{Selected Current Research}", ""]
        for item in groups["current_research"]:
            lines += [
                rf"\entry*[{item['year']}]%",
                rf"\textbf{{{latex_escape(item['title'])}}}.\par",
                latex_escape(item["note"]),
                "",
            ]

    lines += [r"\end{rubric}", ""]
    return "\n".join(lines)


def render_cv_experience(data: dict) -> str:
    roles = [x for x in data["roles"] if x["visibility"]["cv"]]
    lines = [r"\begin{rubric}{Experience}", ""]
    for role in roles:
        lines += [
            rf"\entry*[{format_period(role['period'])}]%",
            rf"\textbf{{{latex_escape(role['cv_heading'])}.}}\par",
            latex_escape(role["description"]),
            "",
        ]
    lines += [r"\end{rubric}", ""]
    return "\n".join(lines)


def render_cv_responsibilities(data: dict) -> str:
    lines = [r"\begin{rubric}{Academic Leadership and Administrative Contributions}", ""]
    for item in data["cv_service_entries"]:
        lines += [
            rf"\entry*[{format_period(item['period'])}]%",
            rf"\textbf{{{latex_escape(item['title'])}.}}\par",
            latex_escape(item["description"]),
            "",
        ]
    lines += [r"\end{rubric}", ""]
    return "\n".join(lines)


def render_cv_open_research(data: dict) -> str:
    selected = [x for x in data["research_programmes"] if x["visibility"]["cv"]]
    titles = "; ".join(rf"\textbf{{{latex_escape(x['title'])}}}" for x in selected)
    return (
        "\\begin{rubric}{Open Research and Reproducibility}\n\n"
        "\\entry*[Portfolio]%\n"
        "Maintain selected public reproducibility repositories at "
        "\\url{https://github.com/SunilgarGusai}, supporting work across graph theory, "
        "network resilience, molecular and biomolecular graphs, and reliable scientific machine learning.\n\n"
        "\\entry*[Selected]%\n"
        f"Representative open projects include {titles}.\n\n"
        "\\entry*[Practice]%\n"
        "Repositories emphasize executable workflows, validation checks, frozen outputs, provenance, "
        "figure/table regeneration, negative-result retention, and explicit claim boundaries.\n\n"
        "\\end{rubric}\n"
    )


def sync_files(data: dict) -> list[Path]:
    changed: list[Path] = []

    index_text = INDEX.read_text(encoding="utf-8")
    updated_index = replace_marked(
        index_text,
        PORTFOLIO_PUB_START,
        PORTFOLIO_PUB_END,
        render_portfolio_publications(data),
    )
    updated_index = replace_marked(
        updated_index,
        PORTFOLIO_LEAD_START,
        PORTFOLIO_LEAD_END,
        render_portfolio_leadership(data),
    )
    if updated_index != index_text:
        INDEX.write_text(updated_index, encoding="utf-8")
        changed.append(INDEX)

    generated = {
        CV_PUBLICATIONS: render_cv_publications(data),
        CV_EXPERIENCE: render_cv_experience(data),
        CV_RESPONSIBILITIES: render_cv_responsibilities(data),
        CV_OPEN_RESEARCH: render_cv_open_research(data),
    }
    for path, content in generated.items():
        old = path.read_text(encoding="utf-8") if path.exists() else ""
        if old != content:
            path.write_text(content, encoding="utf-8")
            changed.append(path)

    return changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    data = load_data()
    errors = validate(data)
    if errors:
        raise SystemExit("\n".join(f"ERROR: {e}" for e in errors))

    if args.validate_only:
        print(f"Academic profile {data['identity_version']} validated successfully.")
        return

    changed = sync_files(data)
    if changed:
        print("Updated:")
        for path in changed:
            print(f" - {path.relative_to(ROOT)}")
    else:
        print("Academic identity surfaces are already synchronized.")


if __name__ == "__main__":
    main()
