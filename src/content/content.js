/**
 * MCG Helper — Content Script
 * 
 * Injects helper toolbar on task pages at bugs.mycloudgrocer.com
 */

(function () {
  'use strict';

  // ── SVG Icon paths ───────────────────────────────────────────
  const ICONS = {
    copy: '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>',
    link: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>',
    plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
    close: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
  };

  // ── Only run on task pages ───────────────────────────────────
  if (!MCGUtils.isTaskPage()) {
    console.log('[MCG Helper] Not a task page, skipping toolbar injection.');
    return;
  }

  const taskId = MCGUtils.getTaskId();
  if (!taskId) {
    console.log('[MCG Helper] Could not determine task ID.');
    return;
  }

  console.log(`[MCG Helper] Task page detected — ID: ${taskId}`);

  // ── Clean up URL: remove the 'sg' parameter ─────────────────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('sg')) {
    urlParams.delete('sg');
    const cleanUrl = `${window.location.pathname}?${urlParams.toString()}`;
    history.replaceState(null, '', cleanUrl);
    console.log('[MCG Helper] Removed "sg" parameter from URL.');
  }

  // ── Build toolbar ────────────────────────────────────────────

  /**
   * Create a toolbar button.
   */
  function createButton(label, iconSVG, onClick, variant = '') {
    const btn = document.createElement('button');
    btn.className = `mcg-btn${variant ? ` mcg-btn--${variant}` : ''}`;
    btn.type = 'button';
    btn.appendChild(MCGUtils.createSVGIcon(iconSVG));

    const span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick(e);
    });
    return btn;
  }

  /**
   * Temporarily update button to "copied" state.
   */
  function flashCopied(btn, originalLabel) {
    btn.classList.add('mcg-btn--copied');
    btn.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('mcg-btn--copied');
      btn.querySelector('span').textContent = originalLabel;
    }, 1500);
  }

  // ── Toolbar container ────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'mcg-toolbar';
  toolbar.id = 'mcg-helper-toolbar';

  // 1. Copy Task ID
  const copyIdLabel = 'Copy ID';
  const btnCopyId = createButton(copyIdLabel, ICONS.copy, async () => {
    await MCGUtils.copyToClipboard(taskId);
    MCGUtils.showToast(`Copied: #${taskId}`);
    flashCopied(btnCopyId, copyIdLabel);
  });
  toolbar.appendChild(btnCopyId);

  // 3. Create PR (link to Bitbucket PR creation page)
  const prIcon = '<path d="M6 3a3 3 0 1 0-1.5 2.6v12.8A3 3 0 1 0 6 21V8.4a3 3 0 0 0 0-5.4Zm12 2.6a3 3 0 1 0-1.5 0V9l-6 4v5.4a3 3 0 1 0 1.5 0V13.8l6-4V5.6ZM4.5 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 19a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM18 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>';

  /**
   * Normalize sprint value from bug tracker format to branch format.
   * Examples: "RS34" → "rs34", "RS33B" → "rs33B", "rs33b" → "rs33B"
   * Rule: all lowercase, but a trailing letter (after digits) stays uppercase.
   */
  function normalizeSprint(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    // Match prefix letters + digits + optional trailing letter
    const m = trimmed.match(/^([a-zA-Z]+)(\d+)([a-zA-Z])?$/);
    if (!m) return trimmed.toLowerCase();
    const prefix = m[1].toLowerCase();
    const digits = m[2];
    const suffix = m[3] ? m[3].toUpperCase() : '';
    return `${prefix}${digits}${suffix}`;
  }

  const sprintField = document.getElementById('Sprint');
  const sprintRaw = sprintField ? sprintField.value.trim() : '';
  const sprintNormalized = normalizeSprint(sprintRaw);

  const btnCreatePR = createButton(
    'Create PR',
    prIcon,
    () => {
      const currentSprint = document.getElementById('Sprint')?.value.trim();
      const sprint = normalizeSprint(currentSprint);
      if (!sprint) {
        MCGUtils.showToast('Sprint field is empty!', 'error');
        return;
      }
      const prUrl = `https://git.mycloudgrocer.com/projects/MCG/repos/mcg-next.storefront/pull-requests`
        + `?create=`
        + `&targetBranch=${encodeURIComponent(`refs/heads/sprint/${sprint}`)}`
        + `&sourceBranch=${encodeURIComponent(`refs/heads/task/${taskId}`)}`;
      window.open(prUrl, '_blank');
    },
    'secondary'
  );
  toolbar.appendChild(btnCreatePR);

  document.body.appendChild(toolbar);

  console.log('[MCG Helper] Toolbar injected successfully.');
})();
