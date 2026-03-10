/**
 * projects.js — Renders project cards from the PROJECTS data array.
 * Depends on: assets/js/data/projects.js (loaded before this file)
 */

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid || typeof PROJECTS === 'undefined') return;

  grid.innerHTML = PROJECTS.map((p) => buildCard(p)).join('');
}

function buildCard(project) {
  const techBadges = project.tech
    .map((t) => `<span class="badge badge--${t.cat}">${t.cat === 'llm' ? '✦ ' : ''}${t.label}</span>`)
    .join('');

  const highlights = project.highlights
    .map((h) => `<li>${h}</li>`)
    .join('');

  const snippetButtons = (project.snippets || [])
    .map(
      (s) =>
        `<button class="btn btn-snippet" onclick="openSnippetModal('${project.id}','${s.file}','${escHtml(s.label)}')">
          &#x3C;/&#x3E; ${s.label}
        </button>`
    )
    .join('');

  return `
    <article class="project-card reveal" id="card-${project.id}">
      <div class="card__header">
        <h3 class="card__title">${escHtml(project.title)}</h3>
        <p class="card__subtitle">${escHtml(project.subtitle)}</p>
      </div>

      <p class="card__desc">${escHtml(project.description)}</p>

      <div class="card__tech">${techBadges}</div>

      <ul class="card__highlights">${highlights}</ul>

      <div class="card__actions">${snippetButtons}</div>
    </article>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  renderProjects();

  // Re-observe newly added cards for scroll-reveal
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
  );

  document.querySelectorAll('.project-card.reveal').forEach((el) =>
    revealObserver.observe(el)
  );
});
