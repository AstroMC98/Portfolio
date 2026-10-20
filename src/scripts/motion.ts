/**
 * Motion layer. Everything here is progressive enhancement: the HTML renders complete
 * and visible without it, and nothing runs when the user prefers reduced motion.
 * Tweens use gsap.from(), so hidden "from" states only exist once JS is running.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMotion() {
  initRail();
  if (reduce) return;

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  gsap.defaults({ ease: 'power3.out', duration: 0.9 });

  heroIntro();
  reveals();
  counters();
  vizAnimations();
  diagrams();
  swimlane();

  // Fonts change line metrics — re-measure once they settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function heroIntro() {
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const tl = gsap.timeline({ delay: 0.1 });
  if (title) {
    const split = SplitText.create(title, { type: 'lines,words', mask: 'lines' });
    tl.from(split.words, { yPercent: 110, duration: 1.1, stagger: 0.05, ease: 'expo.out' });
  }
  tl.from('[data-hero-in]', { y: 24, opacity: 0, stagger: 0.08 }, 0.25)
    .from('.hero__m-line', { drawSVG: '0%', duration: 1.6, ease: 'power2.inOut' }, 0.2)
    .from('.hero__m-node', { scale: 0, transformOrigin: '50% 50%', stagger: 0.18, duration: 0.6, ease: 'back.out(2)' }, 0.35)
    .from('.hero__sat', { scale: 0.6, opacity: 0, transformOrigin: '50% 50%', stagger: 0.07, duration: 0.7, ease: 'back.out(1.7)' }, 0.6)
    .from('.hero__badge', { y: 16, opacity: 0 }, 1)
    .from('.ticker__item', { y: 30, opacity: 0, stagger: 0.08 }, 0.7);
}

function reveals() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 48,
      opacity: 0,
      duration: 1,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

function counters() {
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end) || end === 0) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: end > 50 ? 1.8 : 1.3,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onStart: () => (el.textContent = '0'),
      onUpdate: () => (el.textContent = String(Math.round(obj.v))),
    });
  });
}

function vizAnimations() {
  // 95% — the team collapses to a single glyph
  gsap.fromTo(
    '.fte__p:not(.fte__p--keep)',
    { fill: '#3df5a7' },
    { fill: '#2a3732', stagger: { each: 0.05, from: 'end' }, duration: 0.4, ease: 'none', scrollTrigger: { trigger: '.fte', start: 'top 80%', once: true } },
  );

  // ~40% donut sweeps in
  const donut = document.querySelector<SVGCircleElement>('[data-donut]');
  if (donut) {
    const final = donut.getAttribute('stroke-dasharray')!;
    const circ = final.split(' ')[1];
    gsap.fromTo(donut, { attr: { 'stroke-dasharray': `0 ${circ}` } }, { attr: { 'stroke-dasharray': final }, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: donut, start: 'top 85%', once: true } });
  }

  // 20% — the faster learning curve draws itself
  gsap.from('[data-draw]', { drawSVG: '0%', duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '.ramp', start: 'top 85%', once: true } });
  gsap.from('.ramp__dot', { scale: 0, transformOrigin: '50% 50%', delay: 1.4, scrollTrigger: { trigger: '.ramp', start: 'top 85%', once: true } });

  // 123 teams — field fills, one stays lit
  gsap.from('.field__dot', { opacity: 0, scale: 0.2, stagger: { each: 0.006, from: 'random' }, duration: 0.4, scrollTrigger: { trigger: '.field', start: 'top 85%', once: true } });

  // 25% — bars grow
  gsap.from('.bars__bar', { scaleX: 0, transformOrigin: 'left center', stagger: 0.2, duration: 1.2, scrollTrigger: { trigger: '.bars', start: 'top 88%', once: true } });
}

function diagrams() {
  gsap.utils.toArray<SVGSVGElement>('.arch').forEach((svg) => {
    const st = { trigger: svg, start: 'top 80%', once: true };
    gsap.from(svg.querySelectorAll('.dg-node'), { opacity: 0, y: 14, stagger: 0.08, duration: 0.6, scrollTrigger: st });
    gsap.from(svg.querySelectorAll('.dg-edge'), { drawSVG: '0%', stagger: 0.05, duration: 0.8, ease: 'power2.inOut', delay: 0.2, scrollTrigger: st });
  });
}

function swimlane() {
  gsap.from('.swim__bar rect', {
    scaleX: 0,
    transformOrigin: 'left center',
    stagger: 0.12,
    duration: 1.1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.swim', start: 'top 80%', once: true },
  });
  gsap.from('.swim__ms', { opacity: 0, y: -8, stagger: 0.1, delay: 0.6, scrollTrigger: { trigger: '.swim', start: 'top 80%', once: true } });
}

/** Fixed left rail: scroll progress + section ticks (desktop only, works without GSAP). */
function initRail() {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  if (!rail) return;
  const fill = rail.querySelector<HTMLElement>('[data-rail-fill]')!;
  const ticks = Array.from(rail.querySelectorAll<HTMLAnchorElement>('[data-rail-tick]'));
  const targets = ticks.map((t) => document.getElementById(t.hash.slice(1)));

  const place = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    ticks.forEach((t, i) => {
      const el = targets[i];
      if (el) t.style.top = `${Math.min(100, (el.offsetTop / max) * 100)}%`;
    });
  };
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    fill.style.transform = `scaleY(${p})`;
    let active = -1;
    targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top < innerHeight * 0.45) active = i; });
    ticks.forEach((t, i) => t.classList.toggle('is-active', i === active));
  };
  place();
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => { place(); update(); });
  addEventListener('load', place);
}

/** Calendly popup — library loads only when someone actually asks to book. */
export function initCalendly() {
  let loading: Promise<void> | null = null;
  const load = () => (loading ??= new Promise<void>((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.append(css);
    const js = document.createElement('script');
    js.src = 'https://assets.calendly.com/assets/external/widget.js';
    js.onload = () => resolve();
    js.onerror = () => reject();
    document.head.append(js);
  }));

  document.addEventListener('click', async (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-calendly]');
    if (!a) return;
    e.preventDefault();
    try {
      await load();
      (window as any).Calendly.initPopupWidget({ url: a.href });
    } catch {
      window.open(a.href, '_blank', 'noopener');
    }
  });
}
