/**
 * snippet-viewer.js — Scroll-driven McKinsey-style case study viewer.
 *
 * Opens a full-screen overlay per snippet. The right panel (SVG architecture
 * diagram or dual code panels) stays sticky while the left narrative scrolls.
 * IntersectionObserver fires when each scroll-step enters the centre 24% band
 * of the overlay viewport, automatically updating the visualization.
 *
 * LOCAL DEV: Must run via `python -m http.server 8000` — fetch() is blocked on file://
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */

  var _rawCache  = {};   // filePath → raw text string
  var _observer  = null; // IntersectionObserver instance
  var _snippet   = null; // currently-open snippet config

  /* ── Public API ─────────────────────────────────────────────── */

  /**
   * Called by project card "View {label}" buttons.
   * @param {string} projectId
   * @param {string} filePath  e.g. "d2lt-enhanced/rate_limiter.py"
   * @param {string} label     button label
   */
  window.openSnippetViewer = function (projectId, filePath) {
    if (typeof PROJECTS === 'undefined') return;
    var project = PROJECTS.find(function (p) { return p.id === projectId; });
    if (!project) return;
    var snippet = (project.snippets || []).find(function (s) { return s.file === filePath; });
    if (!snippet) return;
    _open(project, snippet);
  };

  // Backward-compatibility alias (called by project card buttons)
  window.openSnippetModal = window.openSnippetViewer;

  /* ── Open / Close ───────────────────────────────────────────── */

  function _open(project, snippet) {
    _snippet = snippet;

    var ov = document.getElementById('cs-overlay');
    if (!ov) return;

    // Tear down previous observer
    if (_observer) { _observer.disconnect(); _observer = null; }

    // Render shell
    ov.innerHTML = _renderShell(project, snippet);
    ov.scrollTop = 0;
    ov.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    // Wire static events
    var closeBtn = ov.querySelector('.cs-close');
    if (closeBtn) closeBtn.addEventListener('click', _close);

    ov.addEventListener('click', function (e) {
      if (e.target === ov) _close();
    }, { once: true });

    // Wire tabs
    ov.querySelectorAll('.cs-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        window.openSnippetViewer(tab.dataset.pid, tab.dataset.file);
      });
    });

    // Wire chapter nav
    ov.querySelectorAll('.cs-chap-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = btn.getAttribute('href').slice(1);
        var target = document.getElementById(targetId);
        if (target) {
          ov.scrollTo({ top: target.offsetTop - 96, behavior: 'smooth' });
        }
        ov.querySelectorAll('.cs-chap-btn').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
      });
    });

    // Progress bar + chapter tracking on scroll
    var bar = ov.querySelector('.cs-progress-bar');
    ov.addEventListener('scroll', function () {
      var scrollable = ov.scrollHeight - ov.clientHeight;
      if (scrollable > 0 && bar) {
        bar.style.width = (ov.scrollTop / scrollable * 100) + '%';
      }
      _updateChapNav(ov);
    });

    // Load code and activate
    if (snippet.steps && snippet.steps.length > 0) {
      if (snippet.type === 'process') {
        _setupObserver(ov, snippet);
        _activateFirst(ov, snippet);
      } else {
        // code type: load impl file
        _loadLines(snippet.file).then(function (lines) {
          var imPane = ov.querySelector('.cs-pane--im .cs-pane-scroll');
          if (imPane) {
            imPane.innerHTML = _renderLines(lines);
          }
          _setupObserver(ov, snippet);
          _activateFirst(ov, snippet);
        });
      }
    } else {
      // Fallback: plain highlighted code view
      _loadHighlighted(snippet.file).then(function (html) {
        var fb = ov.querySelector('.cs-fallback pre');
        if (fb) fb.innerHTML = html;
      });
    }
  }

  function _close() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    var ov = document.getElementById('cs-overlay');
    if (!ov) return;
    ov.setAttribute('hidden', '');
    ov.innerHTML = '';
    document.body.style.overflow = '';
    _snippet = null;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('cs-overlay');
      if (ov && !ov.hasAttribute('hidden')) _close();
    }
  });

  /* ── HTML rendering ─────────────────────────────────────────── */

  function _renderShell(project, snippet) {
    return _renderHeader(project, snippet) +
           _renderChapNav() +
           '<div class="cs-content">' +
             _renderChallenge(snippet) +
             _renderSolution(snippet) +
             _renderImpact(snippet) +
           '</div>';
  }

  function _renderHeader(project, snippet) {
    var tabs = (project.snippets || []).map(function (s) {
      return '<button class="cs-tab' + (s.file === snippet.file ? ' on' : '') + '"' +
        ' data-pid="' + _esc(project.id) + '"' +
        ' data-file="' + _esc(s.file) + '">' +
        _esc(s.label) + '</button>';
    }).join('');

    return '<div class="cs-hdr">' +
      '<div class="cs-hdr-left">' +
        '<button class="cs-close" aria-label="Close">&times;</button>' +
        '<div class="cs-tabs">' + tabs + '</div>' +
      '</div>' +
      '<div class="cs-progress-bar"></div>' +
    '</div>';
  }

  function _renderChapNav() {
    return '<nav class="cs-chap-nav">' +
      '<span class="cs-chap-lbl">On this page</span>' +
      '<a class="cs-chap-btn on" href="#cs-challenge">The Challenge</a>' +
      '<a class="cs-chap-btn" href="#cs-solution">The Solution</a>' +
      '<a class="cs-chap-btn" href="#cs-impact">The Impact</a>' +
    '</nav>';
  }

  function _renderChallenge(snippet) {
    var ch = snippet.challenge || {};
    var bodyHtml = '';

    if (snippet.type === 'process' && ch.items && ch.items.length > 0) {
      var items = ch.items.map(function (item, i) {
        var num = i < 9 ? '0' + (i + 1) : '' + (i + 1);
        return '<div class="cs-proc-item">' +
          '<span class="cs-proc-num">' + num + '</span>' +
          '<span>' + _esc(item) + '</span>' +
        '</div>';
      }).join('');
      bodyHtml = '<p class="cs-proc-label">The conventional approach</p>' +
        '<div class="cs-proc-list">' + items + '</div>' +
        (ch.verdict ? '<div class="cs-verdict">' + _esc(ch.verdict) + '</div>' : '');

    } else if (ch.comparison) {
      var comp = ch.comparison;
      bodyHtml = '<div class="cs-compare-grid">' +
        '<div class="cs-compare-cell">' +
          '<div class="cs-compare-lbl cs-compare-lbl--cl">' + _esc(comp.classic.label) + '</div>' +
          '<div class="cs-compare-desc">' + _esc(comp.classic.desc) + '</div>' +
          '<div class="cs-compare-verdict cs-compare-verdict--cl">' + _esc(comp.classic.verdict) + '</div>' +
        '</div>' +
        '<div class="cs-compare-cell">' +
          '<div class="cs-compare-lbl cs-compare-lbl--im">' + _esc(comp.impl.label) + '</div>' +
          '<div class="cs-compare-desc">' + _esc(comp.impl.desc) + '</div>' +
          '<div class="cs-compare-verdict cs-compare-verdict--im">' + _esc(comp.impl.verdict) + '</div>' +
        '</div>' +
      '</div>';
    }

    return '<section id="cs-challenge" class="cs-challenge">' +
      '<div class="cs-ch-inner">' +
        (ch.eyebrow ? '<p class="cs-eyebrow">' + _esc(ch.eyebrow) + '</p>' : '') +
        (ch.headline ? '<h2 class="cs-headline">' + _esc(ch.headline) + '</h2>' : '') +
        (ch.body ? '<p class="cs-ctx-body">' + _esc(ch.body) + '</p>' : '') +
        '<div class="cs-divider"></div>' +
        bodyHtml +
      '</div>' +
    '</section>';
  }

  function _renderSolution(snippet) {
    if (!snippet.steps || snippet.steps.length === 0) {
      // Fallback: plain code view
      return '<section id="cs-solution">' +
        '<div class="cs-fallback"><pre><code>Loading&hellip;</code></pre></div>' +
      '</section>';
    }

    var total = snippet.steps.length;
    var stepsHtml = snippet.steps.map(function (step, i) {
      var num = i < 9 ? '0' + (i + 1) : '' + (i + 1);
      var tot = total < 10 ? '0' + total : '' + total;
      var statHtml = '';
      if (step.stat) {
        statHtml = '<div class="cs-step-stat">' +
          '<span class="cs-step-stat-num">' + _esc(step.stat.num) +
            (step.stat.suffix ? '<span>' + _esc(step.stat.suffix) + '</span>' : '') +
          '</span>' +
          '<div>' +
            '<div class="cs-step-stat-unit">' + _esc(step.stat.unit) + '</div>' +
            '<div class="cs-step-stat-desc">' + _esc(step.stat.desc) + '</div>' +
          '</div>' +
        '</div>';
      }

      var attrs = ' data-step="' + i + '"';
      if (snippet.type === 'code') {
        if (step.lc) attrs += ' data-lc="' + step.lc.join(',') + '"';
        if (step.li) attrs += ' data-li="' + step.li.join(',') + '"';
      } else {
        if (step.archStep !== undefined) attrs += ' data-arch-step="' + step.archStep + '"';
      }

      return '<div class="scroll-step"' + attrs + '>' +
        '<div class="cs-step-inner">' +
          (step.tag   ? '<span class="cs-step-tag">'   + _esc(step.tag)   + '</span>' : '') +
          (step.title ? '<h3 class="cs-step-title">'   + _esc(step.title) + '</h3>'   : '') +
          (step.body  ? '<p class="cs-step-body">'     + _esc(step.body)  + '</p>'    : '') +
          statHtml +
        '</div>' +
        '<span class="cs-step-counter">' + num + ' / ' + tot + '</span>' +
      '</div>';
    }).join('');

    var rightHtml;
    if (snippet.type === 'process' && snippet.arch) {
      rightHtml = '<div class="cs-sticky">' +
        '<div class="cs-arch-panel">' + _buildSvg(snippet.arch) + '</div>' +
      '</div>';
    } else {
      var clLabel = (snippet.classic && snippet.classic.label) || 'Classic approach';
      var clNote  = (snippet.classic && snippet.classic.note)  || '';
      // Pre-render classic code
      var clHtml  = (snippet.classic && snippet.classic.lines)
        ? _renderLines(snippet.classic.lines)
        : '';
      rightHtml = '<div class="cs-sticky">' +
        '<div class="cs-dual-code">' +
          '<div class="cs-pane cs-pane--cl">' +
            '<div class="cs-pane-hdr">' +
              '<span class="cs-pane-lbl">' + _esc(clLabel) + '</span>' +
              '<span class="cs-pane-note">' + _esc(clNote) + '</span>' +
            '</div>' +
            '<div class="cs-pane-scroll">' + clHtml + '</div>' +
          '</div>' +
          '<div class="cs-pane cs-pane--im">' +
            '<div class="cs-pane-hdr">' +
              '<span class="cs-pane-lbl">This implementation</span>' +
              '<span class="cs-pane-note">Loading&hellip;</span>' +
            '</div>' +
            '<div class="cs-pane-scroll"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<section id="cs-solution">' +
      '<div class="cs-wrap">' +
        '<div class="cs-scroll-track">' + stepsHtml + '</div>' +
        rightHtml +
      '</div>' +
    '</section>';
  }

  function _renderImpact(snippet) {
    var imp = snippet.impact || {};
    if (!imp.stats && !imp.eyebrow && !imp.caption) return '';

    var statsHtml = (imp.stats || []).map(function (s) {
      return '<div class="cs-imp-stat">' +
        '<div class="cs-imp-big">' + _esc(s.big) +
          (s.bigSuffix ? '<span>' + _esc(s.bigSuffix) + '</span>' : '') +
        '</div>' +
        '<div class="cs-imp-unit">' + _esc(s.unit) + '</div>' +
        '<div class="cs-imp-desc">' + _esc(s.desc) + '</div>' +
      '</div>';
    }).join('');

    return '<section id="cs-impact" class="cs-impact">' +
      (imp.eyebrow ? '<p class="cs-imp-eye">' + _esc(imp.eyebrow) + '</p>' : '') +
      (statsHtml ? '<div class="cs-imp-stats">' + statsHtml + '</div>' : '') +
      (imp.caption ? '<p class="cs-imp-cap">' + _esc(imp.caption) + '</p>' : '') +
    '</section>';
  }

  /* ── SVG builder ─────────────────────────────────────────────── */

  function _buildSvg(arch) {
    var defs = '<defs>' +
      '<marker id="cs-ar" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">' +
        '<polygon points="0 0,8 3,0 6" fill="rgba(255,255,255,.2)"/>' +
      '</marker>' +
      '<marker id="cs-ar-a" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">' +
        '<polygon points="0 0,8 3,0 6" fill="#6366f1"/>' +
      '</marker>' +
    '</defs>';

    var edgesHtml = (arch.edges || []).map(function (e) {
      var base = ' class="cs-e" id="' + e.id + '"';
      if (e.d) {
        return '<path' + base + ' d="' + e.d + '"' +
          (e.dashed ? ' stroke-dasharray="4,3"' : '') +
          ' marker-end="url(#cs-ar)"/>';
      }
      return '<line' + base +
        ' x1="' + e.x1 + '" y1="' + e.y1 + '" x2="' + e.x2 + '" y2="' + e.y2 + '"' +
        ' marker-end="url(#cs-ar)"/>';
    }).join('');

    var extrasHtml = (arch.extras || []).map(function (ex) {
      if (ex.type === 'line') {
        return '<line x1="' + ex.x1 + '" y1="' + ex.y1 + '" x2="' + ex.x2 + '" y2="' + ex.y2 + '"' +
          ' stroke="rgba(255,255,255,.14)" stroke-width="1"/>';
      }
      if (ex.type === 'text') {
        return '<text x="' + ex.x + '" y="' + ex.y + '" text-anchor="' + (ex.anchor || 'middle') + '"' +
          ' fill="' + ex.fill + '" font-size="' + ex.size + '" font-family="Inter,sans-serif"' +
          (ex.spacing ? ' letter-spacing="' + ex.spacing + '"' : '') + '>' + _esc(ex.text) + '</text>';
      }
      if (ex.type === 'pulse') {
        return '<circle class="cs-arch-pulse" id="pp-' + ex.nodeId + '"' +
          ' cx="' + ex.cx + '" cy="' + ex.cy + '" r="0" fill="none" stroke="#6366f1" stroke-width="1.5"/>';
      }
      return '';
    }).join('');

    var nodesHtml = (arch.nodes || []).map(function (n) {
      var cx = n.x + n.w / 2;
      var cy = n.y + n.h / 2;
      var mono  = n.mono  ? ' class="cs-mn"' : '';
      var bold  = n.bold  ? ' font-weight="600"' : '';
      var inner = '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="5"/>';

      if (n.compound) {
        inner +=
          '<line x1="' + (n.x + 10) + '" y1="' + cy + '" x2="' + (n.x + n.w - 10) + '" y2="' + cy + '"' +
            ' stroke="rgba(255,255,255,.07)" stroke-width="1"/>' +
          '<text x="' + cx + '" y="' + (cy - 12) + '" text-anchor="middle" font-size="8.5"' + mono + '>' + _esc(n.label1) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 1)  + '" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.18)">&#x2193;</text>' +
          '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" font-size="8.5"' + mono + '>' + _esc(n.label2) + '</text>';
      } else {
        inner +=
          '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" font-size="8.5"' + mono + bold + ' letter-spacing=".03em">' + _esc(n.label1) + '</text>';
        if (n.label2) {
          inner +=
            '<text x="' + cx + '" y="' + (cy + 11) + '" text-anchor="middle" font-size="8.5"' + mono + '>' + _esc(n.label2) + '</text>';
        }
      }

      return '<g class="cs-n" id="' + n.id + '">' + inner + '</g>';
    }).join('');

    return '<svg viewBox="' + arch.viewBox + '" width="100%" style="max-width:520px;overflow:visible">' +
      defs + edgesHtml + extrasHtml + nodesHtml +
    '</svg>';
  }

  /* ── IntersectionObserver ───────────────────────────────────── */

  function _setupObserver(ov, snippet) {
    var steps = ov.querySelectorAll('.scroll-step');
    if (steps.length === 0) return;

    var activeIdx = -1;
    _observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var idx = parseInt(entry.target.dataset.step, 10);
        if (idx === activeIdx) return;
        activeIdx = idx;
        steps.forEach(function (s) { s.classList.remove('active'); });
        entry.target.classList.add('active');
        _applyStep(ov, snippet, entry.target);
      });
    }, {
      root: ov,
      rootMargin: '-38% 0px -38% 0px',
      threshold: 0
    });

    steps.forEach(function (s) { _observer.observe(s); });
  }

  function _activateFirst(ov, snippet) {
    var first = ov.querySelector('.scroll-step');
    if (!first) return;
    first.classList.add('active');
    _applyStep(ov, snippet, first);
  }

  function _applyStep(ov, snippet, stepEl) {
    if (snippet.type === 'process') {
      var archIdx = parseInt(stepEl.dataset.archStep, 10);
      _updateArch(ov, snippet.arch, archIdx);
    } else {
      _updateCode(ov, stepEl);
    }
  }

  /* ── Architecture update ────────────────────────────────────── */

  function _updateArch(ov, arch, stepIdx) {
    var cfg      = (arch.archSteps || [])[stepIdx];
    var allNodes = arch.allNodes || [];
    var allEdges = arch.allEdges || [];
    if (!cfg) return;

    // Reset all
    allNodes.forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (el) el.classList.remove('a', 's', 'd');
      var p = ov.querySelector('#pp-' + id);
      if (p) p.style.animationPlayState = 'paused';
    });
    allEdges.forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (!el) return;
      el.classList.remove('a', 'd');
      el.setAttribute('marker-end', 'url(#cs-ar)');
    });

    // Apply step config
    (cfg.active || []).forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (el) el.classList.add('a');
      var p = ov.querySelector('#pp-' + id);
      if (p) p.style.animationPlayState = 'running';
    });
    (cfg.secondary || []).forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (el) el.classList.add('s');
    });
    (cfg.dim || []).forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (el) el.classList.add('d');
    });
    (cfg.edges || []).forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (!el) return;
      el.classList.add('a');
      el.setAttribute('marker-end', 'url(#cs-ar-a)');
    });
    // Dim non-active edges
    allEdges.forEach(function (id) {
      var el = ov.querySelector('#' + id);
      if (el && !el.classList.contains('a')) el.classList.add('d');
    });
  }

  /* ── Code panel update ──────────────────────────────────────── */

  function _updateCode(ov, stepEl) {
    var lcNums = _parseNums(stepEl.dataset.lc);
    var liNums = _parseNums(stepEl.dataset.li);
    _hilite(ov.querySelector('.cs-pane--cl .cs-pane-scroll'), lcNums);
    _hilite(ov.querySelector('.cs-pane--im .cs-pane-scroll'), liNums);
  }

  function _hilite(paneEl, active) {
    if (!paneEl) return;
    paneEl.querySelectorAll('.cs-line').forEach(function (row) {
      var n = parseInt(row.dataset.n, 10);
      row.classList.remove('cs-line--hi', 'cs-line--dim');
      if (active.indexOf(n) !== -1) row.classList.add('cs-line--hi');
      else row.classList.add('cs-line--dim');
    });
    var first = paneEl.querySelector('.cs-line--hi');
    if (first) {
      paneEl.scrollTo({
        top: Math.max(0, first.offsetTop - paneEl.clientHeight / 3),
        behavior: 'smooth'
      });
    }
  }

  /* ── Chapter nav tracking ───────────────────────────────────── */

  function _updateChapNav(ov) {
    var sections = ['cs-challenge', 'cs-solution', 'cs-impact'];
    var current  = sections[0];
    var ovTop    = ov.getBoundingClientRect().top;

    sections.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.getBoundingClientRect().top - ovTop < ov.clientHeight * 0.4) current = id;
    });

    ov.querySelectorAll('.cs-chap-btn').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('href') === '#' + current);
    });
  }

  /* ── Code rendering ─────────────────────────────────────────── */

  function _renderLines(lines) {
    return lines.map(function (l) {
      return '<div class="cs-line" data-n="' + l.n + '">' +
        '<span class="cs-line-n">' + l.n + '</span>' +
        '<span class="cs-line-t">' + _esc(l.t) + '</span>' +
      '</div>';
    }).join('');
  }

  /* ── Code fetching ──────────────────────────────────────────── */

  async function _loadLines(filePath) {
    var text = await _fetchRaw(filePath);
    return text.split('\n').map(function (t, i) { return { n: i + 1, t: t }; });
  }

  async function _loadHighlighted(filePath) {
    var text = await _fetchRaw(filePath);
    var lang = _getLang(filePath);
    if (typeof hljs !== 'undefined') {
      return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
    }
    return _esc(text);
  }

  async function _fetchRaw(filePath) {
    if (_rawCache[filePath]) return _rawCache[filePath];
    try {
      var resp = await fetch('snippets/' + filePath);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var text = await resp.text();
      _rawCache[filePath] = text;
      return text;
    } catch (err) {
      return '# Could not load: ' + err.message + '\n# Run: python -m http.server 8000';
    }
  }

  /* ── Utilities ──────────────────────────────────────────────── */

  function _parseNums(str) {
    if (!str) return [];
    return str.split(',').map(Number).filter(function (n) { return !isNaN(n); });
  }

  function _getLang(filePath) {
    var ext = filePath.split('.').pop().toLowerCase();
    return { py: 'python', js: 'javascript', ts: 'typescript', sh: 'bash' }[ext] || 'plaintext';
  }

  function _esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

})();
