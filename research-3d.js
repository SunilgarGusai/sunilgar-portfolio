const mount = document.getElementById("research-constellation");
if (mount) {
  const loading = document.getElementById("observatory-loading");
  const tooltip = document.getElementById("observatory-tooltip");
  const titleEl = document.getElementById("observatory-title");
  const fullTitleEl = document.getElementById("observatory-full-title");
  const summaryEl = document.getElementById("observatory-summary");
  const pickerEl = document.getElementById("observatory-project-picker");
  const pillarEl = document.getElementById("observatory-pillar");
  const statusEl = document.getElementById("observatory-status");
  const linkEl = document.getElementById("observatory-link");
  const filterButtons = [...document.querySelectorAll(".observatory-filter")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let started = false;

  const start = async () => {
    if (started) return;
    started = true;
    try {
      const [{ default: profile }, THREE, controlsModule] = await Promise.all([
        fetch("data/academic-profile.json", { cache: "no-store" }).then(async response => {
          if (!response.ok) throw new Error("Academic profile could not be loaded");
          return { default: await response.json() };
        }),
        import("three"),
        import("three/addons/controls/OrbitControls.js")
      ]);
      const { OrbitControls } = controlsModule;
      const programmes = profile.research_programmes.filter(p => p.showcase?.portfolio);
      buildScene(THREE, OrbitControls, programmes);
    } catch (error) {
      console.error("3D research observatory unavailable:", error);
      loading.textContent = "Interactive 3D view unavailable. Projects remain accessible below.";
    }
  };

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      start();
      observer.disconnect();
    }
  }, { rootMargin: "280px" });
  observer.observe(mount);

  function buildScene(THREE, OrbitControls, programmes) {
    const palette = {
      "Graph Theory & Formal Methods": 0x5b8cff,
      "Networked Systems & Resilience": 0x27d3c2,
      "Molecular & Biomolecular Graphs": 0xa77bff,
      "Reliable Scientific AI & Evidence": 0xf3b44b
    };
    const hubPositions = {
      "Graph Theory & Formal Methods": new THREE.Vector3(-4.8, 2.5, 0.8),
      "Networked Systems & Resilience": new THREE.Vector3(4.7, 2.1, -0.5),
      "Molecular & Biomolecular Graphs": new THREE.Vector3(-3.9, -2.9, -0.8),
      "Reliable Scientific AI & Evidence": new THREE.Vector3(4.3, -2.8, 0.7)
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07101d, 0.035);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.2, 14.7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.35 : 1.75));
    renderer.setClearColor(0x07101d, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.prepend(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.055;
    controls.minDistance = 7.5;
    controls.maxDistance = 24;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.34;
    controls.target.set(0, -0.15, 0);

    scene.add(new THREE.AmbientLight(0xb8d2ff, 1.25));
    const key = new THREE.PointLight(0x7aa7ff, 34, 28);
    key.position.set(-5, 6, 10);
    scene.add(key);
    const fill = new THREE.PointLight(0xa97cff, 26, 24);
    fill.position.set(6, -4, 7);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);
    const interactive = [];
    const projectMeshes = [];
    const connectionLines = [];
    const hubs = new Map();

    function makeLabel(text, colorHex) {
      const canvas = document.createElement("canvas");
      canvas.width = 620; canvas.height = 110;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.font = "700 30px Manrope, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(5,13,26,.76)";
      ctx.roundRect(10, 15, 600, 80, 22);
      ctx.fill();
      ctx.strokeStyle = "#" + colorHex.toString(16).padStart(6,"0");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#eef6ff";
      ctx.fillText(text, 310, 56);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthTest:false }));
      sprite.scale.set(4.6, .82, 1);
      return sprite;
    }

    Object.entries(hubPositions).forEach(([pillar, position]) => {
      const color = palette[pillar];
      const material = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: .19, metalness: .16, roughness: .28,
        transparent: true, opacity: .96
      });
      const hub = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 2), material);
      hub.position.copy(position);
      hub.userData = { type:"pillar", pillar };
      group.add(hub);
      hubs.set(pillar, hub);
      interactive.push(hub);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(.75, .013, 10, 80),
        new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.5 })
      );
      ring.position.copy(position);
      ring.rotation.x = Math.PI / 2.5;
      group.add(ring);

      // Labels are now contextual: hover/focus provides the full research direction.
    });

    const hubKeys = Object.keys(hubPositions);
    for (let i=0; i<hubKeys.length; i++) {
      for (let j=i+1; j<hubKeys.length; j++) {
        const pts = [hubPositions[hubKeys[i]], hubPositions[hubKeys[j]]];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color:0x7691ba, transparent:true, opacity:.13 }));
        group.add(line);
      }
    }

    const byPillar = {};
    programmes.forEach(p => (byPillar[p.pillar] ||= []).push(p));
    Object.entries(byPillar).forEach(([pillar, items]) => {
      const hub = hubPositions[pillar];
      const color = palette[pillar] ?? 0x7aa7ff;
      items.forEach((project, index) => {
        // Clusters occupy four intentional quadrants; no random label collisions.
        const quadrant = Object.keys(hubPositions).indexOf(pillar);
        const offsets = [
          [[-1.35,1.0,-.3],[1.35,1.0,.5],[-.1,1.6,-.4]],
          [[-1.35,1.0,.5],[1.35,1.0,-.3],[.1,1.6,-.4]],
          [[-1.35,-1.0,-.3],[1.35,-1.0,.5],[-.1,-1.6,-.4]],
          [[-1.35,-1.0,.5],[.05,-1.55,-.4],[1.35,-1.0,.3]]
        ];
        const shift = offsets[quadrant][index] || [0,0,index * .3];
        const pos = hub.clone().add(new THREE.Vector3(...shift));
        const material = new THREE.MeshStandardMaterial({
          color, emissive:color, emissiveIntensity:.1, roughness:.35, metalness:.08,
          transparent:true, opacity:.92
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 18), material);
        mesh.position.copy(pos);
        mesh.userData = { type:"project", project, pillar, baseScale:1 };
        group.add(mesh);
        interactive.push(mesh);
        projectMeshes.push(mesh);

        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(.35,.010,8,54),
          new THREE.MeshBasicMaterial({color,transparent:true,opacity:.36})
        );
        halo.position.copy(pos);
        halo.rotation.x = Math.PI / 2;
        halo.userData = { parentProject: mesh };
        group.add(halo);
        mesh.userData.halo = halo;

        const geo = new THREE.BufferGeometry().setFromPoints([hub, pos]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({color,transparent:true,opacity:.34}));
        line.userData = { pillar, project };
        group.add(line);
        connectionLines.push(line);
      });
    });

    const starsCount = window.innerWidth < 700 ? 90 : 180;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i=0;i<starsCount;i++) {
      starPositions[i*3] = (Math.random()-.5)*22;
      starPositions[i*3+1] = (Math.random()-.5)*15;
      starPositions[i*3+2] = (Math.random()-.5)*12 - 2;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions,3));
    const stars = new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x6f8fb8,size:.025,transparent:true,opacity:.6}));
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(9,9);
    let hovered = null;
    let selected = null;
    let activePillar = "all";

    function pointerToNdc(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function describeProject(project) {
      titleEl.textContent = project.short_title || project.title;
      fullTitleEl.textContent = project.title;
      fullTitleEl.hidden = titleEl.textContent === project.title;
      pillarEl.textContent = project.pillar;
      statusEl.textContent = project.status_label || "Public research programme";
      const matching = [...document.querySelectorAll(".project-card .project-link")]
        .find(a => a.getAttribute("href")?.endsWith("/" + project.repository));
      summaryEl.textContent = matching?.closest(".project-card")?.querySelector(":scope > p")?.textContent
        || "Explore the evidence, methods, and reproducibility materials.";
      linkEl.href = "https://github.com/SunilgarGusai/" + project.repository;
      linkEl.textContent = "Open repository ↗";
      pickerEl.value = project.repository;
    }

    function resetScale(mesh) {
      if (mesh?.userData?.type === "project") mesh.scale.setScalar(mesh === selected ? 1.42 : 1);
    }

    function setSelected(mesh) {
      if (selected && selected !== mesh) resetScale(selected);
      selected = mesh;
      if (mesh?.userData?.type === "project") {
        mesh.scale.setScalar(1.42);
        describeProject(mesh.userData.project);
        const pos = mesh.position;
        const startCam = camera.position.clone();
        const startTarget = controls.target.clone();
        const endTarget = pos.clone();
        const endCam = pos.clone().add(new THREE.Vector3(0.8,1.0,6.8));
        const start = performance.now();
        const duration = reducedMotion ? 1 : 700;
        const tween = now => {
          const t = Math.min(1,(now-start)/duration);
          const eased = 1 - Math.pow(1-t,3);
          camera.position.lerpVectors(startCam,endCam,eased);
          controls.target.lerpVectors(startTarget,endTarget,eased);
          controls.update();
          if (t < 1) requestAnimationFrame(tween);
        };
        requestAnimationFrame(tween);
      }
    }

    renderer.domElement.addEventListener("pointermove", event => {
      pointerToNdc(event);
      raycaster.setFromCamera(pointer,camera);
      const hits = raycaster.intersectObjects(interactive.filter(o => o.visible),false);
      const next = hits[0]?.object || null;
      if (hovered !== next) {
        if (hovered?.userData?.type === "project" && hovered !== selected) resetScale(hovered);
        hovered = next;
        if (hovered?.userData?.type === "project" && hovered !== selected) hovered.scale.setScalar(1.15);
      }
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
      if (hovered) {
        const label = hovered.userData.type === "project" ? hovered.userData.project.title : hovered.userData.pillar;
        tooltip.textContent = label;
        tooltip.style.left = (event.clientX - renderer.domElement.getBoundingClientRect().left) + "px";
        tooltip.style.top = (event.clientY - renderer.domElement.getBoundingClientRect().top) + "px";
        tooltip.classList.add("visible");
      } else {
        tooltip.classList.remove("visible");
      }
    });
    renderer.domElement.addEventListener("pointerleave", () => {
      tooltip.classList.remove("visible");
      if (hovered?.userData?.type === "project" && hovered !== selected) resetScale(hovered);
      hovered = null;
    });
    renderer.domElement.addEventListener("click", event => {
      pointerToNdc(event);
      raycaster.setFromCamera(pointer,camera);
      const hit = raycaster.intersectObjects(interactive.filter(o=>o.visible),false)[0]?.object;
      if (hit?.userData.type === "project") setSelected(hit);
      if (hit?.userData.type === "pillar") applyFilter(hit.userData.pillar);
    });

    function applyFilter(pillar) {
      activePillar = pillar;
      filterButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.pillar === pillar));
      projectMeshes.forEach(mesh => {
        const visible = pillar === "all" || mesh.userData.pillar === pillar;
        mesh.visible = visible;
        mesh.userData.halo.visible = visible;
      });
      connectionLines.forEach(line => line.visible = pillar === "all" || line.userData.pillar === pillar);
      hubs.forEach((hub,key) => {
        hub.material.opacity = pillar === "all" || key === pillar ? .96 : .18;
      });
      if (pillar !== "all" && hubPositions[pillar]) {
        const pos = hubPositions[pillar];
        controls.target.copy(pos);
        camera.position.copy(pos).add(new THREE.Vector3(0,0.6,9.2));
      } else {
        controls.target.set(0,-.15,0);
        camera.position.set(0,.5,15.5);
      }
      if (selected && !selected.visible) {
        resetScale(selected);
        selected = null;
      }
    }
    filterButtons.forEach(btn => btn.addEventListener("click", () => applyFilter(btn.dataset.pillar)));

    for (const mesh of projectMeshes) {
      const option = document.createElement("option");
      option.value = mesh.userData.project.repository;
      option.textContent = mesh.userData.project.short_title || mesh.userData.project.title;
      pickerEl.append(option);
    }
    pickerEl.hidden = false;
    pickerEl.addEventListener("change", () => {
      const chosen = projectMeshes.find(m => m.userData.project.repository === pickerEl.value);
      if (!chosen) return;
      if (!chosen.visible) applyFilter("all");
      setSelected(chosen);
    });
    mount.addEventListener("keydown", event => {
      if (event.target !== mount || !["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const visible = projectMeshes.filter(mesh => mesh.visible);
      const at = Math.max(0, visible.indexOf(selected));
      const offset = ["ArrowRight","ArrowDown"].includes(event.key) ? 1 : -1;
      setSelected(visible[(at + offset + visible.length) % visible.length]);
    });

    const newest = projectMeshes.find(m => m.userData.project.repository === "operation-marked-route-spectra");
    if (newest) {
      selected = newest;
      newest.scale.setScalar(1.42);
      describeProject(newest.userData.project);
    }

    function resize() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width,height,false);
      camera.aspect = width / Math.max(height,1);
      camera.updateProjectionMatrix();
      renderer.render(scene,camera);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frame = 0;
    let running = false;
    let onScreen = false;
    let previousFrame = 0;
    const draw = () => renderer.render(scene,camera);
    controls.addEventListener("change", draw);
    function animate(timestamp) {
      if (!running || document.hidden || !onScreen) { running = false; return; }
      if (timestamp - previousFrame >= (window.innerWidth < 700 ? 34 : 24)) {
        previousFrame = timestamp;
        frame++;
        if (!reducedMotion) {
          projectMeshes.forEach((mesh,i) => {
            if (mesh.visible && mesh !== selected) {
              const pulse = 1 + Math.sin((frame+i*17)*.014)*.018;
              mesh.scale.setScalar(mesh === hovered ? 1.15 * pulse : pulse);
            }
          });
        }
        controls.update();
        draw();
      }
      if (!reducedMotion) requestAnimationFrame(animate);
      else running = false;
    }
    function regulate() {
      const shouldRun = onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        previousFrame = 0;
        requestAnimationFrame(animate);
      } else if (!shouldRun) {
        running = false;
      }
    }
    const visibilityWatcher = new IntersectionObserver(entries => {
      onScreen = entries.some(entry => entry.isIntersecting);
      regulate();
    }, {threshold:.05});
    visibilityWatcher.observe(mount);
    document.addEventListener("visibilitychange",regulate);
    draw();
    mount.classList.add("is-ready");

    renderer.domElement.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      loading.textContent = "3D context paused. Projects remain accessible below.";
      mount.classList.remove("is-ready");
    }, false);
  }
}
