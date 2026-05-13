/**
 * project-detail.js — "Know More" modal with Overview + Snippet tabs.
 * Depends on: assets/js/data/projects.js (loaded before this file)
 */

(function () {
  var overlay  = document.getElementById('detail-modal-overlay');
  var titleEl  = document.getElementById('detail-modal-title');
  var subEl    = document.getElementById('detail-modal-subtitle');
  var tabsEl   = document.getElementById('detail-modal-tabs');
  var bodyEl   = document.getElementById('detail-modal-body');
  var closeBtn = document.getElementById('detail-modal-close');

  var _implCache = {};  // filePath → hljs-highlighted HTML

  // ── Public entry point ───────────────────────────────────────────────────

  window.openDetailModal = function (projectId) {
    if (typeof PROJECTS === 'undefined') return;
    var project = PROJECTS.find(function (p) { return p.id === projectId; });
    if (!project) return;

    titleEl.textContent = project.title;
    subEl.textContent   = project.subtitle;

    buildTabs(project);
    bodyEl.scrollTop = 0;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  // ── Tab system ───────────────────────────────────────────────────────────

  function buildTabs(project) {
    var snippets = project.snippets || [];
    var tabs = [];

    tabs.push({ id: 'overview', label: '◈ Overview' });
    snippets.forEach(function (s) { tabs.push({ id: s.file, label: s.label }); });

    if (tabs.length <= 1) {
      // No snippets — hide tab bar, show overview directly
      tabsEl.innerHTML = '';
      tabsEl.style.display = 'none';
      bodyEl.innerHTML = renderOverview(project.details);
      return;
    }

    tabsEl.style.display = '';
    tabsEl.innerHTML = tabs.map(function (t, i) {
      return '<button class="modal__tab' + (i === 0 ? ' active' : '') + '" data-tab="' + esc(t.id) + '">'
        + esc(t.label) + '</button>';
    }).join('');

    // Show overview by default
    bodyEl.innerHTML = renderOverview(project.details);

    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.modal__tab');
      if (!btn) return;
      tabsEl.querySelectorAll('.modal__tab').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var tabId = btn.dataset.tab;
      bodyEl.scrollTop = 0;
      if (tabId === 'overview') {
        bodyEl.innerHTML = renderOverview(project.details);
      } else {
        var snippet = snippets.find(function (s) { return s.file === tabId; });
        if (snippet) mountSnippetTab(project, snippet);
      }
    });
  }

  // ── Overview tab ─────────────────────────────────────────────────────────

  function buildProofOfValue(pov) {
    var statusClass = pov.deploymentStatus.toLowerCase().includes('prototype')
      ? 'detail__pov-status--prototype'
      : 'detail__pov-status--production';
    var statusDot = pov.deploymentStatus.toLowerCase().includes('prototype') ? '◎' : '●';

    var rows = [
      ['Status',   '<span class="detail__pov-status ' + statusClass + '">' + statusDot + ' ' + esc(pov.deploymentStatus) + '</span>'],
      ['KPI',      esc(pov.businessKpi)],
      ['Baseline', esc(pov.baseline)],
      ['Scope',    esc(pov.scope)],
      ['My Role',  esc(pov.myRole)]
    ];

    return '<div class="detail__section detail__pov">'
      + '<span class="detail__section-label">Proof of Value</span>'
      + '<div class="detail__arch-list">'
      + rows.map(function (row) {
          return '<div class="detail__arch-item">'
            + '<span class="detail__arch-name">' + row[0] + '</span>'
            + '<span class="detail__arch-desc">' + row[1] + '</span>'
            + '</div>';
        }).join('')
      + '</div>'
      + '</div>';
  }

  function renderOverview(d) {
    if (!d) return '<p style="padding:2rem;color:var(--text-muted)">No details available.</p>';

    var archRows = (d.architecture || []).map(function (a) {
      return '<div class="detail__arch-item">'
        + '<span class="detail__arch-name">' + esc(a.name) + '</span>'
        + '<span class="detail__arch-desc">' + esc(a.desc) + '</span>'
        + '</div>';
    }).join('');

    var flowSteps = (d.architecture || []).slice(0, 5).map(function (a) {
      return '<span class="detail__flow-step">' + esc(a.name) + '</span>';
    }).join('');

    var benefitItems = (d.benefits || []).map(function (b) {
      return '<li class="detail__benefit">' + esc(b) + '</li>';
    }).join('');

    return (d.proofOfValue ? buildProofOfValue(d.proofOfValue) : '')
      + '<div class="detail__section">'
      + '<span class="detail__section-label">How It Works</span>'
      + '<p class="detail__overview">' + esc(d.overview) + '</p>'
      + '</div>'
      + '<div class="detail__section">'
      + '<span class="detail__section-label">System Flow</span>'
      + '<div class="detail__flow">' + flowSteps + '</div>'
      + '</div>'
      + '<div class="detail__section">'
      + '<span class="detail__section-label">Architecture</span>'
      + '<div class="detail__arch-list">' + archRows + '</div>'
      + '</div>'
      + '<div class="detail__section">'
      + '<span class="detail__section-label">Key Benefits</span>'
      + '<ul class="detail__benefits-list">' + benefitItems + '</ul>'
      + '</div>';
  }

  // ── Snippet tab ───────────────────────────────────────────────────────────

  function mountSnippetTab(project, snippet) {
    bodyEl.innerHTML = renderSnippetHTML(snippet);

    var steps        = snippet.steps || [];
    var stepEls      = Array.from(bodyEl.querySelectorAll('.snip-step'));
    var prevBtn      = bodyEl.querySelector('.snip-nav-btn[data-dir="-1"]');
    var nextBtn      = bodyEl.querySelector('.snip-nav-btn[data-dir="1"]');
    var classicPanel = bodyEl.querySelector('.snip-code-panel[data-panel="classic"]');
    var implPanel    = bodyEl.querySelector('.snip-code-panel[data-panel="impl"]');

    if (snippet.process) {
      renderProcessPanel(classicPanel, snippet.process);
    } else {
      renderClassic(classicPanel, snippet.classic);
    }
    var classicPre = classicPanel ? classicPanel.querySelector('pre.snip-pre') : null;
    var implPre    = null;

    var idx = 0;
    activateStep(idx, stepEls, classicPanel, classicPre, implPanel, implPre, steps);

    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (idx > 0) {
        idx--;
        activateStep(idx, stepEls, classicPanel, classicPre, implPanel, implPre, steps);
        updateNav();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (idx < steps.length - 1) {
        idx++;
        activateStep(idx, stepEls, classicPanel, classicPre, implPanel, implPre, steps);
        updateNav();
      }
    });
    function updateNav() {
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === steps.length - 1;
    }
    updateNav();

    // Code tab toggles — switch panel and scroll to highlights
    bodyEl.querySelectorAll('.snip-code-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        bodyEl.querySelectorAll('.snip-code-tab').forEach(function (t) { t.classList.remove('active'); });
        bodyEl.querySelectorAll('.snip-code-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panelId = tab.dataset.for;
        var panel = bodyEl.querySelector('.snip-code-panel[data-panel="' + panelId + '"]');
        if (panel) {
          panel.classList.add('active');
          scrollPanelToHighlight(panel, panel.querySelector('pre.snip-pre'));
        }
      });
    });

    // Expand / side-by-side toggle
    var expandBtn = bodyEl.querySelector('.snip-expand-btn');
    var codeEl    = bodyEl.querySelector('.snip-code');
    var modalEl   = overlay.querySelector('.modal');
    var expanded  = false;
    if (expandBtn) expandBtn.addEventListener('click', function () {
      expanded = !expanded;
      codeEl.classList.toggle('snip-code--expanded', expanded);
      modalEl.classList.toggle('modal--expanded', expanded);
      expandBtn.textContent = expanded ? '⤡ Collapse' : '⤢ Compare';
      if (expanded) {
        scrollPanelToHighlight(classicPanel, classicPre);
        scrollPanelToHighlight(implPanel, implPre);
      }
    });

    // Async load impl code
    loadImpl(snippet.file, implPanel, null, function (loaded) {
      implPre = loaded;
      hilite(implPre, steps[idx] && steps[idx].li ? steps[idx].li : []);
      scrollPanelToHighlight(implPanel, implPre);
    });
  }

  function renderSnippetHTML(snippet) {
    var steps   = snippet.steps || [];
    var ch      = snippet.challenge || {};
    var comp    = ch.comparison || {};
    var classic = snippet.classic || {};
    var impact  = snippet.impact || {};

    // Challenge block
    var compareHTML = '';
    if (comp.classic || comp.impl) {
      compareHTML = '<div class="snip-compare">'
        + renderCol('classic', 'Classic', comp.classic)
        + renderCol('impl', 'Implementation', comp.impl)
        + '</div>';
    }

    var challengeHTML = '<div class="snip-challenge">'
      + (ch.eyebrow ? '<span class="snip-eyebrow">' + esc(ch.eyebrow) + '</span>' : '')
      + (ch.headline ? '<h3 class="snip-headline">' + esc(ch.headline) + '</h3>' : '')
      + (ch.body ? '<p class="snip-body">' + esc(ch.body) + '</p>' : '')
      + compareHTML
      + '</div>';

    // Steps block
    var stepsHTML = '';
    if (steps.length) {
      stepsHTML = '<div class="snip-steps">'
        + '<span class="snip-steps-label">The Solution</span>'
        + steps.map(function (s, i) {
            var stat = s.stat || {};
            return '<div class="snip-step' + (i === 0 ? ' active' : '') + '">'
              + '<div class="snip-step-hdr">'
              + '<span class="snip-tag">' + esc(s.tag || '') + '</span>'
              + '<span class="snip-counter">' + pad(i + 1) + ' / ' + pad(steps.length) + '</span>'
              + '</div>'
              + '<p class="snip-step-title">' + esc(s.title || '') + '</p>'
              + '<p class="snip-step-body">' + esc(s.body || '') + '</p>'
              + (stat.num ? renderStatBox(stat) : '')
              + '</div>';
          }).join('')
        + '<div class="snip-nav">'
        + '<button class="snip-nav-btn" data-dir="-1" disabled>← Prev</button>'
        + '<button class="snip-nav-btn" data-dir="1"' + (steps.length <= 1 ? ' disabled' : '') + '>Next →</button>'
        + '</div>'
        + '</div>';
    }

    // Code block — panels populated in mountSnippetTab; expand button wires up there too
    var hasProcess   = !!snippet.process;
    var leftTabLabel = hasProcess
      ? '◈ Architecture'
      : ('■ Classic' + (classic.label ? ' — ' + esc(classic.label) : ''));
    var leftPanelLabel = hasProcess
      ? 'Architecture'
      : ('Classic' + (classic.label ? ' — ' + esc(classic.label) : ''));

    var codeHTML = '<div class="snip-code">'
      + '<div class="snip-code-hdr">'
      + '<div class="snip-code-tabs">'
      + '<button class="snip-code-tab active" data-for="classic">' + leftTabLabel + '</button>'
      + '<button class="snip-code-tab" data-for="impl">Implementation</button>'
      + '</div>'
      + '<button class="snip-expand-btn" title="View side by side">⤢ Compare</button>'
      + '</div>'
      + '<div class="snip-code-body">'
      + '<div class="snip-code-panel active" data-panel="classic">'
      + '<span class="snip-panel-label classic">' + esc(leftPanelLabel) + '</span>'
      + '</div>'
      + '<div class="snip-code-panel" data-panel="impl">'
      + '<span class="snip-panel-label impl">Implementation</span>'
      + '<p style="padding:1rem 1.5rem;color:var(--text-muted);font-size:0.8rem">Loading…</p>'
      + '</div>'
      + '</div>'
      + '</div>';

    // Impact block
    var statsHTML = (impact.stats || []).map(function (s) {
      return '<div class="snip-stat-card">'
        + '<span class="snip-stat-card-num">' + esc(s.big || '') + esc(s.bigSuffix || '') + '</span>'
        + '<span class="snip-stat-card-unit">' + esc(s.unit || '') + '</span>'
        + '<span class="snip-stat-card-desc">' + esc(s.desc || '') + '</span>'
        + '</div>';
    }).join('');

    var impactHTML = '<div class="snip-impact">'
      + '<span class="snip-imp-label">' + esc(impact.eyebrow || 'The Impact') + '</span>'
      + '<div class="snip-stats-grid">' + statsHTML + '</div>'
      + '</div>';

    return challengeHTML + stepsHTML + codeHTML + impactHTML;
  }

  function renderCol(cls, label, col) {
    if (!col) return '';
    return '<div class="snip-col">'
      + '<span class="snip-col-label ' + cls + '">' + esc(label) + '</span>'
      + '<p class="snip-col-note">' + esc(col.desc || col.label || '') + '</p>'
      + (col.verdict
          ? '<div class="snip-col-verdict ' + (cls === 'classic' ? 'verdict--bad' : 'verdict--good') + '">'
            + (cls === 'classic' ? '✗ ' : '✓ ')
            + esc(col.verdict)
            + '</div>'
          : '')
      + '</div>';
  }

  function renderStatBox(stat) {
    return '<div class="snip-stat-box">'
      + '<div class="snip-stat-main">'
      + '<span class="snip-stat-num">' + esc(stat.num || '') + '</span>'
      + (stat.suffix ? '<span class="snip-stat-suffix">' + esc(stat.suffix) + '</span>' : '')
      + '</div>'
      + '<div class="snip-stat-meta">'
      + '<span class="snip-stat-unit">' + esc(stat.unit || '') + '</span>'
      + '<span class="snip-stat-desc">' + esc(stat.desc || '') + '</span>'
      + '</div>'
      + '</div>';
  }

  // ── Code loading ─────────────────────────────────────────────────────────

  function renderProcessPanel(panel, proc) {
    if (!panel || !proc) return;
    var stepsHTML = (proc.steps || []).map(function (s) {
      return '<div class="process-step">'
        + '<div class="process-step-icon">'
        + '<div class="process-dot"></div>'
        + '<div class="process-connector"></div>'
        + '</div>'
        + '<div class="process-step-content">'
        + '<div class="process-step-label">' + esc(s.label) + '</div>'
        + (s.note ? '<div class="process-step-note">' + esc(s.note) + '</div>' : '')
        + '</div>'
        + '</div>';
    }).join('');
    var labelEl = panel.querySelector('.snip-panel-label');
    panel.innerHTML = (labelEl ? labelEl.outerHTML : '')
      + '<div class="process-panel">'
      + (proc.title ? '<p class="process-title">' + esc(proc.title) + '</p>' : '')
      + '<div class="process-steps">' + stepsHTML + '</div>'
      + (proc.guarantee ? '<div class="process-guarantee">' + esc(proc.guarantee) + '</div>' : '')
      + '</div>';
  }

  function renderClassic(panel, classicData) {
    if (!panel) return;
    var lines = (classicData && classicData.lines) ? classicData.lines : [];
    var text = lines.map(function (l) { return l.t; }).join('\n');
    var highlighted = (window.hljs)
      ? hljs.highlight(text, { language: 'python' }).value
      : escCode(text);
    var hlLines = highlighted.split('\n');
    var wrapped = lines.map(function (l, i) {
      return '<span data-n="' + l.n + '">' + (hlLines[i] !== undefined ? hlLines[i] : '') + '\n</span>';
    }).join('');
    var pre = '<pre class="snip-pre classic"><code class="language-python hljs">' + wrapped + '</code></pre>';
    // Preserve the panel label if present, then append the pre
    var label = panel.querySelector('.snip-panel-label');
    panel.innerHTML = (label ? label.outerHTML : '') + pre;
  }

  function loadImpl(filePath, panel, implPreEl, cb) {
    if (!panel || !filePath) return;
    if (_implCache[filePath]) {
      injectImpl(panel, _implCache[filePath]);
      if (cb) cb(panel.querySelector('pre.snip-pre'));
      return;
    }
    fetch('/snippets/' + filePath)
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (text) {
        var highlighted;
        if (window.hljs) {
          highlighted = hljs.highlight(text, { language: 'python' }).value;
        } else {
          highlighted = escCode(text);
        }
        _implCache[filePath] = highlighted;
        injectImpl(panel, highlighted);
        if (cb) cb(panel.querySelector('pre.snip-pre'));
      })
      .catch(function () {
        panel.innerHTML = '<p style="padding:1rem 1.5rem;color:#f87171;font-size:0.8rem">Could not load file.</p>';
      });
  }

  function injectImpl(panel, highlighted) {
    var lines = highlighted.split('\n');
    var wrapped = lines.map(function (line, i) {
      return '<span data-n="' + (i + 1) + '">' + (line || ' ') + '\n</span>';
    }).join('');
    var pre = '<pre class="snip-pre"><code class="language-python hljs">' + wrapped + '</code></pre>';
    var label = panel.querySelector('.snip-panel-label');
    panel.innerHTML = (label ? label.outerHTML : '') + pre;
  }

  // ── Step activation & highlights ─────────────────────────────────────────

  function activateStep(idx, stepEls, classicPanel, classicPre, implPanel, implPre, steps) {
    stepEls.forEach(function (el, i) { el.classList.toggle('active', i === idx); });
    var step = steps[idx] || {};
    hilite(classicPre, step.lc || []);
    hilite(implPre,    step.li || []);
    scrollPanelToHighlight(classicPanel, classicPre);
    scrollPanelToHighlight(implPanel,    implPre);
  }

  function hilite(pre, lineNums) {
    if (!pre) return;
    pre.querySelectorAll('span[data-n]').forEach(function (span) {
      span.classList.toggle('hl', lineNums.indexOf(+span.dataset.n) !== -1);
    });
  }

  function scrollPanelToHighlight(panel, pre) {
    if (!panel || !pre) return;
    var first = pre.querySelector('span[data-n].hl');
    if (!first) return;
    var panelRect = panel.getBoundingClientRect();
    var spanRect  = first.getBoundingClientRect();
    var offset    = spanRect.top - panelRect.top;
    panel.scrollTop = panel.scrollTop + offset - (panel.clientHeight / 2) + (spanRect.height / 2);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escCode(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Modal close ───────────────────────────────────────────────────────────

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
