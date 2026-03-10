/**
 * project-detail.js — "Know More" project detail modal.
 * Depends on: assets/js/data/projects.js (loaded before this file)
 */

(function () {
  const overlay  = document.getElementById('detail-modal-overlay');
  const titleEl  = document.getElementById('detail-modal-title');
  const subEl    = document.getElementById('detail-modal-subtitle');
  const bodyEl   = document.getElementById('detail-modal-body');
  const closeBtn = document.getElementById('detail-modal-close');

  window.openDetailModal = function (projectId) {
    if (typeof PROJECTS === 'undefined') return;
    const project = PROJECTS.find((p) => p.id === projectId);
    if (!project) return;

    titleEl.textContent = project.title;
    subEl.textContent   = project.subtitle;
    bodyEl.innerHTML    = renderBody(project.details);

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderBody(d) {
    if (!d) return '<p style="padding:2rem;color:var(--text-muted)">No details available.</p>';

    const archRows = (d.architecture || [])
      .map((a) => `
        <div class="detail__arch-item">
          <span class="detail__arch-name">${esc(a.name)}</span>
          <span class="detail__arch-desc">${esc(a.desc)}</span>
        </div>`)
      .join('');

    const benefitItems = (d.benefits || [])
      .map((b) => `<li class="detail__benefit">${esc(b)}</li>`)
      .join('');

    return `
      <div class="detail__section">
        <span class="detail__section-label">How It Works</span>
        <p class="detail__overview">${esc(d.overview)}</p>
      </div>
      <div class="detail__section">
        <span class="detail__section-label">Architecture</span>
        <div class="detail__arch-list">${archRows}</div>
      </div>
      <div class="detail__section">
        <span class="detail__section-label">Key Benefits</span>
        <ul class="detail__benefits-list">${benefitItems}</ul>
      </div>`;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
