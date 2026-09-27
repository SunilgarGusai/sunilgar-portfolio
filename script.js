(() => {
  const html = document.documentElement;
  const header = document.getElementById('site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const themeToggle = document.querySelector('.theme-toggle');
  const year = document.getElementById('current-year');

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

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 14);
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

  if (year) year.textContent = String(new Date().getFullYear());
})();
