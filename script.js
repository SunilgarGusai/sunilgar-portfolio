const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

const closeMenu = () => {
  links?.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
};

toggle?.addEventListener('click', () => {
  const isOpen = links?.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
