/* Research landscape: accessible project catalogue with a restrained depth layer.
   All project names and repository paths are read from academic-profile.json. */
(() => {
  const stage = document.getElementById("research-constellation");
  if (!stage) return;
  const board = document.getElementById("research-atlas-board");
  const picker = document.getElementById("observatory-project-picker");
  const fields = {
    title: document.getElementById("observatory-title"),
    full: document.getElementById("observatory-full-title"),
    pillar: document.getElementById("observatory-pillar"),
    status: document.getElementById("observatory-status"),
    summary: document.getElementById("observatory-summary"),
    link: document.getElementById("observatory-link")
  };
  const buttons = [...document.querySelectorAll(".observatory-filter")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)");
  const topics = [
    ["Graph Theory & Formal Methods", "01", "λ", "Spectra, structure and mathematical proof"],
    ["Networked Systems & Resilience", "02", "⌘", "Failure, vulnerability and network decisions"],
    ["Molecular & Biomolecular Graphs", "03", "⬡", "Descriptors, residues and molecular structure"],
    ["Reliable Scientific AI & Evidence", "04", "◎", "Uncertainty, generalisation and sound evidence"]
  ];
  const blurbs = {
    "operation-marked-route-spectra":"Exact spectral results for operation-labelled feedforward architecture graphs, supported by symbolic verification.",
    "Claim-Evidence-Consistency-Reproducibility":"Graph-theoretic formulations of evidence consistency, correction and verification.",
    "Assam-Road-Inspection-Benchmark":"How to prioritise inspection on flood-affected road networks under practical limits.",
    "VELE-PowerGrid-Reproducibility":"Testing eccentricity-based graph measures for their value in power-grid vulnerability screening.",
    "mutation-geodesic-shielding-protein-stability":"Studying the local geometry of protein residue networks around amino-acid mutations.",
    "EGFR-Graph-QSAR-Reproducibility":"Examining where classical molecular graph descriptors retain or lose chemical distinctions.",
    "global-msw-reliability-under-shift":"Assessing reliability when waste-service predictions are transferred between geographic settings.",
    "applicability-gated-molecular-ai":"Evaluating when an explicit scientific rule is useful, misleading or needs correction.",
    "PAPER-JCMM-reproducibility":"Studying prediction intervals and their calibration under composition and distribution shift."
  };
  const reduce = () => reducedMotion.matches || !finePointer.matches;
  let active = "all", selected = null, projects = [];
  const projectButtons = new Map(), regions = new Map();

  function choose(project) {
    selected = project;
    fields.title.textContent = project.short_title || project.title;
    fields.full.textContent = project.title;
    fields.full.hidden = project.title === fields.title.textContent;
    fields.pillar.textContent = project.pillar;
    fields.status.textContent = project.status_label || "Public research";
    fields.summary.textContent = blurbs[project.repository] || "See the research materials, methods and supporting documentation.";
    fields.link.href = "https://github.com/SunilgarGusai/" + project.repository;
    picker.value = project.repository;
    for (const [repo, element] of projectButtons) {
      const isSelected = repo === project.repository;
      element.classList.toggle("is-selected", isSelected);
      element.setAttribute("aria-pressed", String(isSelected));
    }
    stage.dataset.selectedDomain = String(topics.findIndex(t => t[0] === project.pillar) + 1);
  }

  function filter(domain) {
    active = domain;
    stage.classList.toggle("has-focus", active !== "all");
    for (const [name, region] of regions) {
      region.classList.toggle("is-muted", active !== "all" && active !== name);
      region.classList.toggle("is-highlighted", active !== "all" && active === name);
    }
    for (const button of buttons) {
      const current = button.dataset.pillar === domain;
      button.classList.toggle("active", current);
      button.setAttribute("aria-pressed", String(current));
    }
    if (active !== "all" && selected?.pillar !== active) {
      const first = projects.find(project => project.pillar === active);
      if (first) choose(first);
    }
  }

  function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function render(data) {
    projects = data.research_programmes.filter(p => p.showcase?.portfolio);
    if (!projects.length) throw new Error("No public projects");
    const list = document.createDocumentFragment();
    picker.replaceChildren();
    topics.forEach(([name, number, symbol, subtitle], index) => {
      const items = projects.filter(project => project.pillar === name);
      if (!items.length) return;
      const region = element("section", "atlas-region atlas-tone-" + (index + 1));
      region.setAttribute("aria-label", name);
      region.style.setProperty("--region-index", String(index));
      const heading = element("div", "atlas-region-heading");
      const emblem = element("span", "atlas-emblem", symbol);
      emblem.setAttribute("aria-hidden", "true");
      const headingText = element("div", "atlas-region-copy");
      const headingTop = element("span", "atlas-index", number + " / " + items.length + " projects");
      const h = element("h3", "", name);
      headingText.append(headingTop, h);
      heading.append(emblem, headingText);
      region.append(heading, element("p", "atlas-region-subtitle", subtitle));
      const links = element("div", "atlas-project-list");
      items.forEach(project => {
        const choice = element("button", "atlas-project", project.short_title || project.title);
        choice.type = "button";
        choice.setAttribute("aria-label", "View " + project.title);
        choice.setAttribute("aria-pressed", "false");
        choice.addEventListener("click", () => {
          if (active !== "all" && active !== name) filter("all");
          choose(project);
        });
        const arrow = element("span", "atlas-project-arrow", "↗");
        arrow.setAttribute("aria-hidden", "true");
        choice.append(arrow);
        links.append(choice);
        projectButtons.set(project.repository, choice);
      });
      region.append(links);
      regions.set(name, region);
      list.append(region);
    });
    board.replaceChildren(list);
    projects.forEach(project => {
      const option = element("option", "", project.short_title || project.title);
      option.value = project.repository;
      picker.append(option);
    });
    const original = projects.find(p => p.repository === "operation-marked-route-spectra") || projects[0];
    choose(original);

    // A tiny spatial response, applied only to the four areas.
    if (!reduce()) {
      regions.forEach(region => {
        let queued = false, point = null;
        region.addEventListener("pointermove", event => {
          point = [event.clientX, event.clientY];
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            if (!point) return;
            const rect = region.getBoundingClientRect();
            const x = (point[0] - rect.left) / rect.width - .5;
            const y = (point[1] - rect.top) / rect.height - .5;
            region.style.setProperty("--tilt-x", (-y*3.4).toFixed(2) + "deg");
            region.style.setProperty("--tilt-y", (x*3.4).toFixed(2) + "deg");
            region.style.setProperty("--light-x", ((x+.5)*100).toFixed(1) + "%");
            region.style.setProperty("--light-y", ((y+.5)*100).toFixed(1) + "%");
          });
        }, {passive:true});
        region.addEventListener("pointerleave", () => {
          point = null;
          region.style.removeProperty("--tilt-x");
          region.style.removeProperty("--tilt-y");
        });
      });
    }
  }

  buttons.forEach(button => button.addEventListener("click", () => filter(button.dataset.pillar)));
  picker.addEventListener("change", () => {
    const project = projects.find(p => p.repository === picker.value);
    if (project) {
      if (active !== "all" && active !== project.pillar) filter("all");
      choose(project);
    }
  });

  fetch("data/academic-profile.json", {cache:"no-store"})
    .then(response => {if(!response.ok) throw new Error("Cannot read projects");return response.json();})
    .then(render)
    .catch(error => {
      console.warn("Research map not available", error);
      board.replaceChildren();
      const p = element("p", "atlas-loading", "Projects are available in the Open Research section below.");
      const a = element("a", "atlas-fallback-link", "View all projects ↗");
      a.href = "#open-research";
      board.append(p, a);
    });
})();
