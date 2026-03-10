/**
 * main.js — Navigation, scroll behaviour, mobile menu, IntersectionObserver reveal
 */

/* ── Active nav highlight on scroll ────────────────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a[data-section]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => link.classList.remove('active'));
        const active = document.querySelector(
          `.nav__links a[data-section="${entry.target.id}"]`
        );
        if (active) active.classList.add('active');
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
);

sections.forEach((s) => sectionObserver.observe(s));

/* ── Scroll-reveal via IntersectionObserver ────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);   // fire once
      }
    });
  },
  { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
);

document.querySelectorAll(
  '.reveal, .reveal-stagger, .reveal-left, .reveal-right, .reveal-fade'
).forEach((el) => revealObserver.observe(el));

/* ── Mobile hamburger menu ──────────────────────────────────────────────── */
const hamburger = document.querySelector('.nav__hamburger');
const navMenu   = document.querySelector('.nav__links');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a link is clicked
  navMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
    }
  });
}

/* ── Nav background on scroll ───────────────────────────────────────────── */
const nav = document.querySelector('.nav');
if (nav) {
  const updateNav = () => {
    nav.style.borderBottomColor =
      window.scrollY > 20
        ? 'rgba(255,255,255,0.1)'
        : 'var(--border)';
  };
  window.addEventListener('scroll', updateNav, { passive: true });
}
