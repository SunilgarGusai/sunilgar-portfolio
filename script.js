(() => {
  const html = document.documentElement;
  const header = document.getElementById('site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const themeToggle = document.querySelector('.theme-toggle');
  const year = document.getElementById('current-year');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load the progressive "live" visual layer without changing the base design.
  if (!document.querySelector('link[data-live-layer]')) {
    const liveCss = document.createElement('link');
    liveCss.rel = 'stylesheet';
    liveCss.href = 'live.css';
    liveCss.dataset.liveLayer = 'true';
    document.head.appendChild(liveCss);
  }

  const storedTheme = localStorage.getItem('sg-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (storedTheme === 'dark' || (!storedTheme && prefersDark)) html.dataset.theme = 'dark';

  const updateThemeIcon = () => {
    if (!themeToggle) return;
    const dark = html.dataset.theme === 'dark';
    themeToggle.textContent = dark ? '☀' : '◐';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  updateThemeIcon();

  themeToggle?.addEventListener('click', () => {
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('sg-theme', next);
    updateThemeIcon();
  });

  navToggle?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(Boolean(open)));
    navToggle.textContent = open ? '✕' : '☰';
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
      if (navToggle) navToggle.textContent = '☰';
    });
  });

  // Scroll state + a thin live reading/progress rail.
  const progress = document.createElement('div');
  progress.className = 'live-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const onScroll = () => {
    header?.classList.toggle('scrolled', window.scrollY > 14);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    progress.style.setProperty('--scroll-progress', `${pct}%`);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  const sections = [...document.querySelectorAll('main section[id]')];
  const navAnchors = [...document.querySelectorAll('.nav-links a')];
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navAnchors.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
  }, { threshold: [0.22, 0.45, 0.65], rootMargin: '-80px 0px -35% 0px' });
  sections.forEach((section) => sectionObserver.observe(section));

  // Rotating research focus: motion is restrained and text remains accessible.
  const heroCopy = document.querySelector('.hero-copy');
  const heroLead = heroCopy?.querySelector('.lead');
  const focusItems = [
    'Spectral graph theory & graph energy',
    'Network resilience & failure screening',
    'Molecular graphs, QSPR & QSAR',
    'Reliable scientific AI & uncertainty',
    'Open, inspectable reproducibility'
  ];

  if (heroCopy && heroLead) {
    const focus = document.createElement('div');
    focus.className = 'live-focus';
    focus.setAttribute('aria-label', 'Research focus');
    focus.innerHTML = '<span class="live-focus-label">Research pulse</span><strong class="live-focus-value"></strong>';
    heroCopy.insertBefore(focus, heroLead);
    const target = focus.querySelector('.live-focus-value');

    if (reduceMotion) {
      target.textContent = focusItems[0];
    } else {
      let itemIndex = 0;
      let charIndex = 0;
      let deleting = false;
      const typeStep = () => {
        const phrase = focusItems[itemIndex];
        charIndex += deleting ? -1 : 1;
        target.textContent = phrase.slice(0, Math.max(0, charIndex));
        let delay = deleting ? 24 : 42;
        if (!deleting && charIndex >= phrase.length) {
          deleting = true;
          delay = 1750;
        } else if (deleting && charIndex <= 0) {
          deleting = false;
          itemIndex = (itemIndex + 1) % focusItems.length;
          delay = 380;
        }
        window.setTimeout(typeStep, delay);
      };
      typeStep();
    }
  }

  // Count-up metrics when the signal bar first enters view.
  const counterNodes = [...document.querySelectorAll('.signal strong')];
  counterNodes.forEach((node) => node.dataset.liveCounter = 'true');
  const animateCounter = (node) => {
    if (node.dataset.counted === 'true') return;
    node.dataset.counted = 'true';
    const original = node.textContent.trim();
    const numeric = Number(original.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric)) return;
    const prefix = original.startsWith('₹') ? '₹' : '';
    const suffix = original.endsWith('K') ? 'K' : original.endsWith('%') ? '%' : '';
    const hasComma = original.includes(',');
    const decimals = (original.match(/\.(\d+)/)?.[1] || '').length;
    const duration = 1350;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = numeric * eased;
      let rendered = decimals ? value.toFixed(decimals) : Math.round(value).toString();
      if (hasComma && !decimals) rendered = Number(rendered).toLocaleString('en-IN');
      node.textContent = `${prefix}${rendered}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else node.textContent = original;
    };
    requestAnimationFrame(tick);
  };

  const signalBar = document.querySelector('.signal-bar');
  if (signalBar) {
    const counterObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        if (!reduceMotion) counterNodes.forEach((node, i) => window.setTimeout(() => animateCounter(node), i * 100));
        counterObserver.disconnect();
      }
    }, { threshold: 0.35 });
    counterObserver.observe(signalBar);
  }

  // Interactive research cards: cursor light follows the card, not the page.
  document.querySelectorAll('.project-card').forEach((card) => {
    const glow = document.createElement('span');
    glow.className = 'live-card-glow';
    glow.setAttribute('aria-hidden', 'true');
    card.prepend(glow);
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - box.left}px`);
      card.style.setProperty('--my', `${event.clientY - box.top}px`);
    });
  });

  // Gentle depth response around the portrait for desktop/fine pointers.
  const heroVisual = document.querySelector('.hero-visual');
  const portrait = heroVisual?.querySelector('.portrait-frame');
  const finePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if (heroVisual && portrait && finePointer && !reduceMotion) {
    heroVisual.addEventListener('pointermove', (event) => {
      const box = heroVisual.getBoundingClientRect();
      const nx = ((event.clientX - box.left) / box.width) - 0.5;
      const ny = ((event.clientY - box.top) / box.height) - 0.5;
      portrait.style.transform = `perspective(900px) rotateY(${nx * 4}deg) rotateX(${ny * -4}deg) rotateZ(1.2deg) translate3d(${nx * 5}px,${ny * 5}px,0)`;
      heroVisual.classList.add('is-tracking');
    });
    heroVisual.addEventListener('pointerleave', () => {
      portrait.style.transform = '';
      heroVisual.classList.remove('is-tracking');
    });
  }

  // Animated graph field behind the hero. Pure canvas; no external library.
  const hero = document.querySelector('.hero');
  if (hero) {
    const canvas = document.createElement('canvas');
    canvas.className = 'research-network';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const nodes = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const resetNodes = () => {
      nodes.length = 0;
      const count = Math.max(18, Math.min(34, Math.floor(width / 48)));
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 1.1 + Math.random() * 1.8
        });
      }
    };

    const resize = () => {
      const box = hero.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetNodes();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const dark = html.dataset.theme === 'dark';
      const nodeColor = dark ? 'rgba(154,190,255,.70)' : 'rgba(57,104,180,.42)';
      const edgeBase = dark ? 0.16 : 0.11;
      const maxDist = Math.min(155, width * 0.14);

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = edgeBase * (1 - dist / maxDist);
            ctx.strokeStyle = `rgba(104,142,230,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduceMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -8) n.x = width + 8;
          if (n.x > width + 8) n.x = -8;
          if (n.y < -8) n.y = height + 8;
          if (n.y > height + 8) n.y = -8;
        }
      });

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      resize();
      draw();
    }, { passive: true });
  }

  if (year) year.textContent = String(new Date().getFullYear());
})();
