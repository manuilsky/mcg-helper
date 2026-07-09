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

  // ── Production Sites Mapping ──────────────────────────────────
  const PROD_MAP = {
    'a661': 'https://six60one.com/',
    'a9': 'https://aisle9market.com/',
    'allf': 'https://allfreshsupermarket.com/',
    'bayk': 'https://baykosher.com/',
    'bb': 'https://breadberry.com/',
    'butch': 'https://butcherie.com/',
    'butchc': 'https://butcherie.com/',
    'canyon': 'https://thekoshercanyon.shop/',
    'cd': 'https://shop.crowndrugs.com/',
    'certo': 'https://certomarket.com/',
    'chbutch': 'https://chbutcher.com/',
    'emp': 'https://empirekoshersupermarket.com/',
    'food': 'https://shop.westorangefooderie.com/',
    'ge': 'https://shop.grandandessex.com/',
    'gf': 'https://galasupermarkets.com/',
    'hog': 'https://thehouseofglatt.com/',
    'hok': 'https://houseofkosher.com/',
    'honey': 'https://honeydewsupermarket.com/',
    'iko': 'https://islandkosher.shop/',
    'kc': 'https://koshercentral.com/',
    'kf': 'https://kosherfamily.com/',
    'king': 'https://kosherkingdom.com/',
    'kowe': 'https://kosherwest.com/',
    'ktown': 'https://koshertown.com/',
    'lan': 'https://landauskj.com/',
    'lanbp': 'https://landausmarket.com/',
    'mada': 'https://madanim.com/',
    'meat': 'https://meatmaven.com/',
    'mega': 'https://mega53market.com/',
    'meha': 'https://mehudar.ca/',
    'mf': 'https://shopmountainfruit.com/',
    'mm': 'https://marketmavenmd.com/',
    'moti': 'https://motismarket.com/',
    'nutmeg': 'https://nutmegkoshermarket.com/',
    'ref': 'https://refreshfruits.com/',
    'rk': 'https://rocklandkosher.com/',
    'rose': 'https://rosemarykosher.com/',
    'sara': 'https://sarahstentkoshermarket.com/',
    'sea': 'https://seattlekosher.com/',
    'shau': 'https://shaulysmeat.com/',
    'shlo': 'https://shlomoskosher.com/',
    'shoppe': 'https://theshoppeli.com/',
    'sk': 'https://seasonskosher.com/',
    'skop': 'https://skoppssupermarket.com/',
    'ss': 'https://superstopnj.com/',
    'was': 'https://wassermansupermarket.com/',
    'wk': 'https://westernkosher.com/ap',
    'yes': 'https://yesmarketmiami.com/',
    'zipk': 'https://zipkosher.com/'
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

  // ── Build Verification and Table Features Injection ────────────────
  const buildIdCache = {};

  function normalizeBranch(br) {
    if (!br) return '';
    return br.trim().toLowerCase().replace(/-/g, '/');
  }

  function isBackendProject(projectName) {
    const name = (projectName || '').toLowerCase();
    return name.includes('web') || (!name.includes('storefront') && !name.includes('react') && !name.includes('mobile'));
  }

  function resetButton(btn) {
    btn.classList.remove('mcg-check-build-btn--loading');
  }

  async function checkAnyTaskActivity(apiToken, currentTaskId) {
    // Check DOM comments first (fastest)
    const postsTable = document.getElementById('posts_table');
    if (postsTable) {
      const rows = postsTable.querySelectorAll('tr td.cmt, tr td.cmt_selected');
      for (const cell of rows) {
        const text = cell.textContent.toLowerCase();
        if (text.includes('commit') || text.includes('merged') || text.includes('pull request') || text.includes(`task/${currentTaskId}`)) {
          return true;
        }
      }
    }

    if (apiToken) {
      try {
        const mergesUrl = `https://bugs.mycloudgrocer.com/api/merges/bug/${currentTaskId}`;
        const mergesRes = await fetch(mergesUrl, {
          headers: { 'X-Api-Key': apiToken, 'Accept': 'application/json' }
        });
        if (mergesRes.ok) {
          const merges = await mergesRes.json();
          if (merges.length > 0) return true;
        }
      } catch (err) {
        console.warn(err);
      }

      try {
        const bugUrl = `https://bugs.mycloudgrocer.com/api/bugs/${currentTaskId}`;
        const bugRes = await fetch(bugUrl, {
          headers: { 'X-Api-Key': apiToken, 'Accept': 'application/json' }
        });
        if (bugRes.ok) {
          const bug = await bugRes.json();
          if (bug.taskBranch || bug.sprintBranch || bug.sprintBranchMergedOnUtc) {
            return true;
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    return false;
  }

  function getMergeTimeFromDOM(isBackend, branchName) {
    const postsTable = document.getElementById('posts_table');
    if (!postsTable) return null;
    
    const targetBranchNorm = normalizeBranch(branchName);
    const rows = postsTable.querySelectorAll('tr td.cmt, tr td.cmt_selected');
    
    let latestMergeTime = null;
    
    rows.forEach(cell => {
      const text = cell.textContent;
      if (text.includes('Merged') || text.includes('Commit')) {
        const normalizedText = text.toLowerCase();
        if (normalizedText.includes(targetBranchNorm) || normalizedText.includes(targetBranchNorm.replace(/\//g, '-'))) {
          // Check if this comment pertains to backend vs frontend
          const isCommitBE = isBackendProject(text);
          if (isBackend === isCommitBE) {
            const headerEl = cell.querySelector('.pst');
            if (headerEl) {
              const headerText = headerEl.textContent;
              const match = headerText.match(/on\s+([0-9/:\sAMPMampm]+?)(?:,|$)/);
              if (match) {
                const dateStr = match[1].trim();
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  if (!latestMergeTime || parsedDate > latestMergeTime) {
                    latestMergeTime = parsedDate;
                  }
                }
              }
            }
          }
        }
      }
    });
    
    return latestMergeTime;
  }

  function getCommentTime(tableElement) {
    const postCell = tableElement.closest('td.cmt, td.cmt_selected');
    if (!postCell) return null;
    
    const headerEl = postCell.querySelector('.pst');
    if (!headerEl) return null;
    
    const headerText = headerEl.textContent;
    const match = headerText.match(/on\s+([0-9/:\sAMPMampm]+?)(?:,|$)/);
    if (match) {
      const dateStr = match[1].trim();
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return null;
  }

  async function resolveBuildId(isBackend, branchName, buildStr) {
    const cacheKey = `${isBackend}:${branchName || ''}:${buildStr}`;
    if (buildIdCache[cacheKey] !== undefined) {
      return buildIdCache[cacheKey];
    }

    const promise = (async () => {
      try {
        const { apiKey } = await chrome.storage.local.get('apiKey');
        const apiToken = apiKey || window.API_KEY || '';
        if (!apiToken) return null;

        // Parse build number
        const parts = buildStr.trim().split('.');
        let buildNumber = 0;
        let buildNumberMinor = 0;

        if (parts.length >= 4) {
          buildNumber = parseInt(parts[parts.length - 1], 10) || 0;
          buildNumberMinor = parseInt(parts[1], 10) || 0;
        } else if (parts.length === 2) {
          buildNumber = parseInt(parts[1], 10) || 0;
          buildNumberMinor = parseInt(parts[0], 10) || 0;
        } else {
          buildNumber = parseInt(parts[parts.length - 1], 10) || 0;
          buildNumberMinor = 0;
        }

        const branchCandidates = branchName ? [
          branchName.trim(),
          branchName.trim().replace(/-/g, '/'),
          branchName.trim().replace(/\//g, '-')
        ] : [];

        const project = isBackend ? 'web' : 'react';
        let matchedBuild = null;

        // Query branch candidates
        for (const br of [...new Set(branchCandidates)]) {
          try {
            const buildUrl = `https://bugs.mycloudgrocer.com/api/builds?project=${encodeURIComponent(project)}&branch=${encodeURIComponent(br)}&pageSize=100`;
            const res = await fetch(buildUrl, {
              headers: {
                'X-Api-Key': apiToken,
                'Accept': 'application/json'
              }
            });
            if (res.ok) {
              const builds = await res.json();
              const found = builds.find(b => b.buildNumber === buildNumber && b.buildNumberMinor === buildNumberMinor);
              if (found) {
                matchedBuild = found;
                break;
              }
            }
          } catch (err) {
            console.warn(`Failed fetching builds for branch ${br}`, err);
          }
        }

        // Fallback query
        if (!matchedBuild) {
          try {
            const buildUrl = `https://bugs.mycloudgrocer.com/api/builds?project=${encodeURIComponent(project)}&pageSize=100`;
            const res = await fetch(buildUrl, {
              headers: {
                'X-Api-Key': apiToken,
                'Accept': 'application/json'
              }
            });
            if (res.ok) {
              const builds = await res.json();
              matchedBuild = builds.find(b => b.buildNumber === buildNumber && b.buildNumberMinor === buildNumberMinor);
            }
          } catch (err) {
            console.warn(`Failed fallback builds query`, err);
          }
        }

        if (matchedBuild) {
          return matchedBuild.id !== undefined ? matchedBuild.id : matchedBuild.Id;
        }
      } catch (err) {
        console.warn('resolveBuildId error', err);
      }
      return null;
    })();

    buildIdCache[cacheKey] = promise;
    return promise;
  }

  function initBuildNumberLink(buildCell, isBackend, branchName, buildStr) {
    if (!buildCell || !buildStr) return;
    if (buildCell.querySelector('.mcg-build-link')) return;

    const link = document.createElement('a');
    link.href = 'javascript:void(0)';
    link.textContent = buildStr;
    link.className = 'mcg-build-link mcg-build-link--clickable';

    const handleBuildClick = async (e) => {
      // Only allow left click (button 0) for 'click' event, and middle click (button 1) for 'auxclick' event
      if (e.type === 'click' && e.button !== 0) return;
      if (e.type === 'auxclick' && e.button !== 1) return;

      e.preventDefault();
      e.stopPropagation();

      if (link.classList.contains('mcg-build-link--loading')) return;

      if (link.dataset.buildId) {
        window.open(`/monitor/deployments.aspx?BuildId=${link.dataset.buildId}`, '_blank');
        return;
      }

      link.classList.add('mcg-build-link--loading');

      try {
        const buildId = await resolveBuildId(isBackend, branchName, buildStr);
        if (buildId) {
          link.dataset.buildId = buildId;
          link.href = `/monitor/deployments.aspx?BuildId=${buildId}`;
          link.classList.remove('mcg-build-link--clickable');
          window.open(link.href, '_blank');
        } else {
          const { apiKey } = await chrome.storage.local.get('apiKey');
          if (!apiKey && !window.API_KEY) {
            MCGUtils.showToast('API Key missing. Please configure it in popup.', 'error', 5000, 'left');
          } else {
            MCGUtils.showToast(`Build ${buildStr} was not found in the database.`, 'error', 5000, 'left');
          }
        }
      } catch (err) {
        console.error(err);
        MCGUtils.showToast(`Failed to resolve build ID: ${err.message}`, 'error', 5000, 'left');
      } finally {
        link.classList.remove('mcg-build-link--loading');
      }
    };

    link.addEventListener('click', handleBuildClick);
    link.addEventListener('auxclick', handleBuildClick);

    Array.from(buildCell.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.remove();
      }
    });

    buildCell.insertBefore(link, buildCell.firstChild);
  }

  async function checkBuildFix(btn, isBackend, branchName, buildStr, table) {
    btn.classList.add('mcg-check-build-btn--loading');
    btn.classList.remove('mcg-check-build-btn--success', 'mcg-check-build-btn--error');

    try {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      const apiToken = apiKey || window.API_KEY || '';

      if (!branchName) {
        MCGUtils.showToast('Branch name is missing in the table.', 'error', 4000, 'left');
        resetButton(btn);
        btn.classList.add('mcg-check-build-btn--error');
        return;
      }

      if (!buildStr) {
        MCGUtils.showToast('Build number is missing in the table.', 'error', 4000, 'left');
        resetButton(btn);
        btn.classList.add('mcg-check-build-btn--error');
        return;
      }

      const currentTaskId = MCGUtils.getTaskId();

      // ── Parse build string ──
      const parts = buildStr.trim().split('.');
      let buildNumber = 0;
      let buildNumberMinor = 0;

      if (parts.length >= 4) {
        buildNumber = parseInt(parts[parts.length - 1], 10) || 0;
        buildNumberMinor = parseInt(parts[1], 10) || 0;
      } else if (parts.length === 2) {
        buildNumber = parseInt(parts[1], 10) || 0;
        buildNumberMinor = parseInt(parts[0], 10) || 0;
      } else {
        buildNumber = parseInt(parts[parts.length - 1], 10) || 0;
        buildNumberMinor = 0;
      }

      // ── Query builds from DB first ──
      const branchCandidates = [
        branchName.trim(),
        branchName.trim().replace(/-/g, '/'),
        branchName.trim().replace(/\//g, '-')
      ];

      const project = isBackend ? 'web' : 'react';

      let matchedBuild = null;
      
      // Try to get build by ID from the link first if already resolved/cached
      const buildLink = btn.parentElement ? btn.parentElement.querySelector('.mcg-build-link') : null;
      if (buildLink && buildLink.dataset.buildId && apiToken) {
        try {
          const res = await fetch(`https://bugs.mycloudgrocer.com/api/builds/${buildLink.dataset.buildId}`, {
            headers: {
              'X-Api-Key': apiToken,
              'Accept': 'application/json'
            }
          });
          if (res.ok) {
            matchedBuild = await res.json();
          }
        } catch (err) {
          console.warn(`Failed fetching build details for ID ${buildLink.dataset.buildId}`, err);
        }
      }

      if (!matchedBuild && apiToken) {
        for (const br of [...new Set(branchCandidates)]) {
          try {
            const buildUrl = `https://bugs.mycloudgrocer.com/api/builds?project=${encodeURIComponent(project)}&branch=${encodeURIComponent(br)}&pageSize=100`;
            const res = await fetch(buildUrl, {
              headers: {
                'X-Api-Key': apiToken,
                'Accept': 'application/json'
              }
            });
            if (res.ok) {
              const builds = await res.json();
              const found = builds.find(b => b.buildNumber === buildNumber && b.buildNumberMinor === buildNumberMinor);
              if (found) {
                matchedBuild = found;
                break;
              }
            }
          } catch (err) {
            console.warn(`Failed fetching builds for branch ${br}`, err);
          }
        }

        if (!matchedBuild) {
          try {
            const buildUrl = `https://bugs.mycloudgrocer.com/api/builds?project=${encodeURIComponent(project)}&pageSize=100`;
            const res = await fetch(buildUrl, {
              headers: {
                'X-Api-Key': apiToken,
                'Accept': 'application/json'
              }
            });
            if (res.ok) {
              const builds = await res.json();
              matchedBuild = builds.find(b => b.buildNumber === buildNumber && b.buildNumberMinor === buildNumberMinor);
            }
          } catch (err) {
            console.warn(`Failed fallback builds query`, err);
          }
        }
      }

      if (!matchedBuild) {
        if (!apiToken) {
          MCGUtils.showToast('API Key missing. Cannot fetch build details from database. Please configure it in popup.', 'error', 5000, 'left');
        } else {
          MCGUtils.showToast(`Build ${buildStr} was not found in the database.`, 'error', 5000, 'left');
        }
        resetButton(btn);
        btn.classList.add('mcg-check-build-btn--error');
        return;
      }

      // Wrap the build number in a link
      const buildCell = btn.parentElement;
      if (buildCell) {
        const buildId = matchedBuild.id !== undefined ? matchedBuild.id : matchedBuild.Id;
        const existingLink = buildCell.querySelector('.mcg-build-link');
        if (existingLink) {
          existingLink.dataset.buildId = buildId;
          existingLink.href = `/monitor/deployments.aspx?BuildId=${buildId}`;
          existingLink.classList.remove('mcg-build-link--clickable');
        } else {
          const link = document.createElement('a');
          link.href = `/monitor/deployments.aspx?BuildId=${buildId}`;
          link.target = '_blank';
          link.textContent = buildStr;
          link.className = 'mcg-build-link';
          
          Array.from(buildCell.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.remove();
            }
          });
          
          buildCell.insertBefore(link, buildCell.firstChild);
        }
      }

      // ── Step 3: Now resolve merges and mergeTime ────────
      let mergeTime = null;
      let mergeSource = '';
      let detectedSprintBranch = null;

      if (apiToken) {
        try {
          const mergesUrl = `https://bugs.mycloudgrocer.com/api/merges/bug/${currentTaskId}`;
          const mergesRes = await fetch(mergesUrl, {
            headers: {
              'X-Api-Key': apiToken,
              'Accept': 'application/json'
            }
          });

          if (mergesRes.ok) {
            const merges = await mergesRes.json();
            const normalizedTargetBranch = normalizeBranch(branchName);

            const matchingMerges = merges.filter(m => 
              normalizeBranch(m.toBranch) === normalizedTargetBranch || 
              normalizeBranch(m.fromBranch) === normalizedTargetBranch
            );

            const merge = matchingMerges.find(m => {
              const isMergeBE = isBackendProject(m.project);
              return isBackend ? isMergeBE : !isMergeBE;
            });

            if (merge) {
              mergeTime = new Date(merge.mergedOnUtc);
              mergeSource = 'API merges history';
              detectedSprintBranch = merge.toBranch;
              console.log(`[MCG Helper] Found merge time via Tier 1 (API merges): ${mergeTime} (source: ${mergeSource})`);
            }
          }
        } catch (err) {
          console.warn('[MCG Helper] Failed Tier 1 merges API query', err);
        }
      }

      if (!mergeTime && apiToken) {
        try {
          const bugUrl = `https://bugs.mycloudgrocer.com/api/bugs/${currentTaskId}`;
          const bugRes = await fetch(bugUrl, {
            headers: {
              'X-Api-Key': apiToken,
              'Accept': 'application/json'
            }
          });

          if (bugRes.ok) {
            const bug = await bugRes.json();
            const sprintBranchField = bug.sprintBranch || bug.SprintBranch;
            const sprintBranchMergedOnUtcField = bug.sprintBranchMergedOnUtc || bug.SprintBranchMergedOnUtc;

            if (sprintBranchField && sprintBranchMergedOnUtcField) {
              const normalizedBugBranch = normalizeBranch(sprintBranchField);
              const normalizedTargetBranch = normalizeBranch(branchName);

              const isBugBE = isBackendProject(sprintBranchField);
              if (normalizedBugBranch.includes(normalizedTargetBranch) && (isBackend === isBugBE)) {
                mergeTime = new Date(sprintBranchMergedOnUtcField);
                mergeSource = 'API task details';
                detectedSprintBranch = sprintBranchField.split(' ')[0];
                console.log(`[MCG Helper] Found merge time via Tier 2 (API bug details): ${mergeTime} (source: ${mergeSource})`);
              }
            }
          }
        } catch (err) {
          console.warn('[MCG Helper] Failed Tier 2 bug API query', err);
        }
      }

      if (!mergeTime) {
        const domMergeTime = getMergeTimeFromDOM(isBackend, branchName);
        if (domMergeTime) {
          mergeTime = domMergeTime;
          mergeSource = 'Page comments (DOM)';
          console.log(`[MCG Helper] Found merge time via Tier 3 (DOM scraping): ${mergeTime} (source: ${mergeSource})`);
        }
      }

      if (!mergeTime) {
        const hasActivity = await checkAnyTaskActivity(apiToken, currentTaskId);
        resetButton(btn);
        if (hasActivity) {
          MCGUtils.showToast(`❌ Fix is found but has NOT been merged into ${branchName} yet.`, 'error', 5000, 'left');
          btn.classList.add('mcg-check-build-btn--error');
        } else {
          MCGUtils.showToast(`ℹ️ Fix is not found (no branch or commits detected for task #${currentTaskId}).`, 'info', 5000, 'left');
          btn.classList.add('mcg-check-build-btn--info');
        }
        return;
      }

      const buildTime = new Date(matchedBuild.startedOnUtc);
      const isIncluded = buildTime > mergeTime;

      const normalizedTargetBranch = normalizeBranch(branchName);
      const normalizedBuildBranch = normalizeBranch(matchedBuild.gitBranch);
      const branchMatches = normalizedBuildBranch === normalizedTargetBranch;

      let branchWarning = '';
      if (!branchMatches) {
        branchWarning = `\n⚠️ Build is on branch ${matchedBuild.gitBranch}, but table says ${branchName}!`;
      }

      let commentWarning = '';
      const commentTime = getCommentTime(table);
      if (commentTime && mergeTime && commentTime < mergeTime) {
        commentWarning = `\n⚠️ Build table comment was posted BEFORE the fix was merged!\n` +
          `(Comment: ${commentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${commentTime.toLocaleDateString()})`;
      }

      resetButton(btn);

      const timeSourceInfo = `\n(Merge time found via: ${mergeSource})`;

      if (isIncluded) {
        btn.classList.add('mcg-check-build-btn--success');
        const msg = `✅ Fix IS INCLUDED in build ${buildStr}!${branchWarning}${commentWarning}\n` +
          `Merged: ${mergeTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${mergeTime.toLocaleDateString()}\n` +
          `Build: ${buildTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${buildTime.toLocaleDateString()}` +
          timeSourceInfo;
        MCGUtils.showToast(msg, 'success', 8000, 'left');
      } else {
        btn.classList.add('mcg-check-build-btn--error');
        const msg = `❌ Fix IS NOT INCLUDED in build ${buildStr}!${branchWarning}${commentWarning}\n` +
          `Merged: ${mergeTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${mergeTime.toLocaleDateString()}\n` +
          `Build: ${buildTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${buildTime.toLocaleDateString()}` +
          timeSourceInfo;
        MCGUtils.showToast(msg, 'error', 8000, 'left');
      }

    } catch (err) {
      console.error('Error during build verification:', err);
      MCGUtils.showToast(`Verification error: ${err.message}`, 'error', 5000, 'left');
      resetButton(btn);
      btn.classList.add('mcg-check-build-btn--error');
    }
  }

  function normalizeKey(text) {
    if (!text) return '';
    return text.toLowerCase()
               .trim()
               .replace(/:$/, '') // Remove trailing colon
               .replace(/-/g, ' ') // Replace hyphens with spaces
               .replace(/\s+/g, ' '); // Normalize spaces
  }

  function isFEBranchKey(text) {
    const t = normalizeKey(text);
    return t === 'front end branch' || t === 'fe branch';
  }

  function isFEBuildKey(text) {
    const t = normalizeKey(text);
    return t === 'fe build number' || t === 'front end number' || t === 'fe number' || t === 'fe build' || t === 'front end build';
  }

  function isBEBranchKey(text) {
    const t = normalizeKey(text);
    return t === 'back end branch' || t === 'be branch';
  }

  function isBEBuildKey(text) {
    const t = normalizeKey(text);
    return t === 'be build number' || t === 'back end number' || t === 'be number' || t === 'be build' || t === 'back end build';
  }

  function isStoreKey(text) {
    const t = normalizeKey(text);
    return t === 'store';
  }

  function isServerKey(text) {
    const t = normalizeKey(text);
    return t === 'server';
  }

  function createCheckButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'mcg-check-build-btn';
    btn.type = 'button';
    btn.title = 'Check if this build contains the task fix';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`;
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function getBuildValFromCell(cell) {
    if (!cell) return null;
    const link = cell.querySelector('.mcg-build-link');
    if (link) return link.textContent.trim();
    const cloned = cell.cloneNode(true);
    cloned.querySelectorAll('button, a, script, style').forEach(el => el.remove());
    return cloned.textContent.trim();
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function injectTableFeatures() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const cells = Array.from(table.querySelectorAll('td, th'));
      
      let storeValCell = null;
      let serverValCell = null;

      for (let i = 0; i < cells.length; i++) {
        const cellText = cells[i].textContent.trim();
        
        // --- Detect Store and Server for Staging links ---
        if (isStoreKey(cellText)) {
          storeValCell = cells[i].nextElementSibling;
        } else if (isServerKey(cellText)) {
          serverValCell = cells[i].nextElementSibling;
        }

        // --- Detect BE Build and wrap/inject button ---
        if (isBEBuildKey(cellText)) {
          const buildCell = cells[i].nextElementSibling;
          const buildVal = getBuildValFromCell(buildCell);
          if (buildVal) {
            // Find closest preceding BE Branch key
            let branchVal = null;
            for (let j = i - 1; j >= 0; j--) {
              if (isBEBranchKey(cells[j].textContent)) {
                const branchCell = cells[j].nextElementSibling;
                branchVal = branchCell ? branchCell.textContent.trim() : null;
                break;
              }
            }

            // 1. Initialize clickable build number link
            initBuildNumberLink(buildCell, true, branchVal, buildVal);

            // 2. Inject check button if not already present
            if (!buildCell.querySelector('.mcg-check-build-btn')) {
              const btn = createCheckButton(() => {
                checkBuildFix(btn, true, branchVal, buildVal, table);
              });
              buildCell.appendChild(btn);
            }
          }
        }

        // --- Detect FE Build and wrap/inject button ---
        if (isFEBuildKey(cellText)) {
          const buildCell = cells[i].nextElementSibling;
          const buildVal = getBuildValFromCell(buildCell);
          if (buildVal) {
            // Find closest preceding FE Branch key
            let branchVal = null;
            for (let j = i - 1; j >= 0; j--) {
              if (isFEBranchKey(cells[j].textContent)) {
                const branchCell = cells[j].nextElementSibling;
                branchVal = branchCell ? branchCell.textContent.trim() : null;
                break;
              }
            }

            // 1. Initialize clickable build number link
            initBuildNumberLink(buildCell, false, branchVal, buildVal);

            // 2. Inject check button if not already present
            if (!buildCell.querySelector('.mcg-check-build-btn')) {
              const btn = createCheckButton(() => {
                checkBuildFix(btn, false, branchVal, buildVal, table);
              });
              buildCell.appendChild(btn);
            }
          }
        }
      }

      // --- Inject stage links if store and server values are present ---
      if (storeValCell && serverValCell) {
        const storeVal = storeValCell.textContent.trim();
        const serverVal = serverValCell.textContent.trim();
        if (storeVal && serverVal) {
          let stageUrl;
          if (serverVal.toLowerCase() === 'prod') {
            const storeKey = storeVal.toLowerCase();
            if (PROD_MAP[storeKey]) {
              stageUrl = PROD_MAP[storeKey];
            } else {
              stageUrl = `https://${storeVal.toLowerCase()}.prod.mycloudgrocer.com`;
            }
          } else {
            stageUrl = `https://${storeVal.toLowerCase()}.${serverVal.toLowerCase()}.mycloudgrocer.com`;
          }
          
          if (!storeValCell.querySelector('a')) {
            const link = document.createElement('a');
            link.href = stageUrl;
            link.target = '_blank';
            link.className = 'mcg-stage-link';
            while (storeValCell.firstChild) {
              link.appendChild(storeValCell.firstChild);
            }
            storeValCell.appendChild(link);
          }
          
          if (!serverValCell.querySelector('a')) {
            const link = document.createElement('a');
            link.href = stageUrl;
            link.target = '_blank';
            link.className = 'mcg-stage-link';
            while (serverValCell.firstChild) {
              link.appendChild(serverValCell.firstChild);
            }
            serverValCell.appendChild(link);
          }
        }
      }
    });
  }

  const debouncedInject = debounce(injectTableFeatures, 100);

  // Run instantly on load
  injectTableFeatures();

  // MutationObserver to capture dynamically rendered tables in posts/comments
  const observer = new MutationObserver(() => {
    debouncedInject();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
