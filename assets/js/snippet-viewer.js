/**
 * snippet-viewer.js — Modal that fetches and syntax-highlights code snippets.
 *
 * Uses highlight.js (loaded via CDN in index.html) for syntax highlighting.
 * Snippets are plain .py files served as static text from the /snippets/ dir.
 * fetch() works same-origin on GitHub Pages — no CORS issues.
 *
 * LOCAL DEV: Must run via `python -m http.server 8000`, NOT via file://
 *            because fetch() is blocked on file:// protocol.
 */

const modal        = document.getElementById('snippet-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalSub     = document.getElementById('modal-subtitle');
const modalBody    = document.getElementById('modal-body');
const modalTabs    = document.getElementById('modal-tabs');
const modalClose   = document.getElementById('modal-close');

/** Currently-open project id */
let _activeProjectId = null;

/** Cache: file path → highlighted HTML string */
const _snippetCache = {};

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Called by each "View Snippet" button.
 * @param {string} projectId  - project.id
 * @param {string} filePath   - e.g. "d2lt-enhanced/rate_limiter.py"
 * @param {string} label      - button label used as tab label
 */
window.openSnippetModal = function (projectId, filePath, label) {
  if (typeof PROJECTS === 'undefined') return;

  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) return;

  _activeProjectId = projectId;

  // Set modal header
  modalTitle.textContent = project.title;
  modalSub.textContent   = label;

  // Build tabs for all snippets in this project
  const snippets = project.snippets || [];
  modalTabs.innerHTML = snippets
    .map(
      (s) =>
        `<button class="modal__tab${s.file === filePath ? ' active' : ''}"
                 data-file="${s.file}"
                 data-label="${escapeAttr(s.label)}"
                 onclick="switchTab(this, '${s.file}', '${escapeAttr(s.label)}')">
           ${s.label}
         </button>`
    )
    .join('');

  // Open overlay
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load the requested snippet
  loadSnippet(filePath, getLanguage(filePath));
};

window.switchTab = function (btn, filePath, label) {
  // Update active tab style
  modalTabs.querySelectorAll('.modal__tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');

  modalSub.textContent = label;
  loadSnippet(filePath, getLanguage(filePath));
};

/* ── Close logic ─────────────────────────────────────────────────────────── */

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  _activeProjectId = null;
}

modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

/* ── Snippet loading ─────────────────────────────────────────────────────── */

async function loadSnippet(filePath, language) {
  // Show loading spinner
  modalBody.innerHTML = `
    <div class="modal__loading">
      <div class="spinner"></div>
      Loading snippet…
    </div>`;

  // Return cached highlighted HTML if available
  if (_snippetCache[filePath]) {
    modalBody.innerHTML = _snippetCache[filePath];
    return;
  }

  try {
    const resp = await fetch(`snippets/${filePath}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const code = await resp.text();

    // Highlight with highlight.js
    const highlighted =
      typeof hljs !== 'undefined'
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : escapeHtml(code);

    const html = `
      <pre class="modal__code"><code class="hljs language-${language}">${highlighted}</code></pre>`;

    _snippetCache[filePath] = html;
    modalBody.innerHTML = html;
  } catch (err) {
    modalBody.innerHTML = `
      <div class="modal__loading" style="flex-direction:column;gap:0.5rem;color:var(--text-muted)">
        <p>Could not load snippet.</p>
        <p style="font-size:0.75rem">${err.message}</p>
        <p style="font-size:0.72rem;margin-top:0.5rem">
          Run <code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px">
          python -m http.server 8000</code> for local preview.
        </p>
      </div>`;
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getLanguage(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const map = { py: 'python', js: 'javascript', ts: 'typescript', sh: 'bash', md: 'markdown' };
  return map[ext] || 'plaintext';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
