/**
 * Case-file page interactions. The page is fully readable without this:
 * code is pre-highlighted at build time with step 1's lines already lit.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCasePage() {
  document.querySelectorAll<HTMLElement>('[data-walk]').forEach(initWalk);
  initSubnav();
}

function initWalk(walk: HTMLElement) {
  const steps = Array.from(walk.querySelectorAll<HTMLButtonElement>('.wstep'));
  const tabs = Array.from(walk.querySelectorAll<HTMLButtonElement>('.viewer__tab'));
  const panes = new Map(
    Array.from(walk.querySelectorAll<HTMLElement>('[data-pane-body]')).map((p) => [p.dataset.paneBody!, p]),
  );
  const archEl = walk.querySelector<HTMLElement>('[data-arch-model]');
  const arch = archEl ? JSON.parse(archEl.dataset.archModel!) : null;
  let current = 0;

  const showPane = (key: string) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.pane === key)));
    panes.forEach((p, k) => p.classList.toggle('is-active', k === key));
    focusLines(panes.get(key));
  };

  const activate = (i: number) => {
    if (i === current && steps[i].classList.contains('is-active')) return;
    current = i;
    steps.forEach((s, j) => {
      s.classList.toggle('is-active', j === i);
      s.setAttribute('aria-pressed', String(j === i));
    });
    const st = steps[i];
    light(panes.get('impl'), JSON.parse(st.dataset.li || '[]'));
    light(panes.get('classic'), JSON.parse(st.dataset.lc || '[]'));
    if (arch && st.dataset.arch !== '') stepArch(archEl!, arch, Number(st.dataset.arch));
  };

  // Bring step 1's pre-highlighted lines into view (code panes start at line 1).
  panes.forEach((p) => focusLines(p, 'auto'));

  tabs.forEach((t) => t.addEventListener('click', () => showPane(t.dataset.pane!)));
  steps.forEach((s, i) => s.addEventListener('click', () => activate(i)));

  // Scroll-driven: the step crossing the middle band of the viewport becomes active.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) activate(steps.indexOf(e.target as HTMLButtonElement));
      });
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  steps.forEach((s) => io.observe(s));
}

function light(pane: HTMLElement | undefined, nums: number[]) {
  if (!pane) return;
  const wrap = pane.querySelector('.pane-code');
  wrap?.classList.toggle('has-hl', nums.length > 0);
  pane.querySelectorAll<HTMLElement>('.line[data-n]').forEach((l) => {
    l.classList.toggle('hl', nums.includes(Number(l.dataset.n)));
  });
  focusLines(pane);
}

function focusLines(pane: HTMLElement | undefined, behavior?: ScrollBehavior) {
  if (!pane) return;
  const first = pane.querySelector<HTMLElement>('.line.hl');
  if (!first) return;
  // Inactive panes are display:none (no layout) — they get positioned when shown.
  if (!pane.classList.contains('is-active')) return;
  const top = first.offsetTop - pane.clientHeight / 3;
  pane.scrollTo({ top: Math.max(0, top), behavior: behavior ?? (reduce ? 'auto' : 'smooth') });
}

function stepArch(root: HTMLElement, arch: any, idx: number) {
  const cfg = (arch.archSteps || [])[idx];
  if (!cfg) return;
  const q = (id: string) => root.querySelector<SVGElement>(`#${CSS.escape(`${arch.uid}-${id}`)}`);
  (arch.allNodes || []).forEach((id: string) => q(id)?.classList.remove('a', 's', 'd'));
  (arch.allEdges || []).forEach((id: string) => q(id)?.classList.remove('a'));
  root.querySelectorAll('.ax-pulse').forEach((p) => p.classList.remove('on'));
  (cfg.active || []).forEach((id: string) => {
    q(id)?.classList.add('a');
    root.querySelector(`[data-pulse="${CSS.escape(`${arch.uid}-${id}`)}"]`)?.classList.add('on');
  });
  (cfg.secondary || []).forEach((id: string) => q(id)?.classList.add('s'));
  (cfg.dim || []).forEach((id: string) => q(id)?.classList.add('d'));
  (cfg.edges || []).forEach((id: string) => q(id)?.classList.add('a'));
}

function initSubnav() {
  const nav = document.querySelector<HTMLElement>('[data-subnav]');
  if (!nav) return;
  const bar = nav.querySelector<HTMLElement>('[data-progress]')!;
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-subnav-link]'));
  const secs = links.map((a) => document.getElementById(a.hash.slice(1))!);

  const update = () => {
    const start = secs[0].offsetTop - innerHeight * 0.5;
    const end = secs[secs.length - 1].offsetTop + secs[secs.length - 1].offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)));
    bar.style.transform = `scaleX(${p})`;
    let active = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) active = i; });
    links.forEach((a, i) => a.classList.toggle('is-active', i === active));
  };
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
}
