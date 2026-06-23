/**
 * MCG Helper — Popup Script
 */

const API_KEY = window.API_KEY || '';
const API_BASE = 'https://bugs.mycloudgrocer.com/api';

document.addEventListener('DOMContentLoaded', async () => {
  // Show version from manifest
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `v${manifest.version}`;

  const statusEl = document.getElementById('status');
  const statusText = statusEl.querySelector('.status-text');
  const actionsEl = document.getElementById('actions');
  const deploymentsEl = document.getElementById('deployments-section');

  if (!API_KEY) {
    statusText.textContent = 'API Key missing. Please configure config.js';
    statusEl.classList.add('inactive');
    return;
  }

  try {
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      statusText.textContent = 'No access to tab';
      statusEl.classList.add('inactive');
      return;
    }

    const url = new URL(tab.url);
    const stageMatch = url.hostname.match(/^([^.]+)\.(qa[1-6]|pd[1-6]|dev[1-6]|qa|pd|dev)\.mycloudgrocer\.com$/i);

    if (stageMatch) {
      const storeName = stageMatch[1];
      const stageName = stageMatch[2];
      
      // Set min-height immediately to prevent Chrome popup clipping bug on async load
      document.body.style.minHeight = '380px';
      
      statusText.textContent = `Loading: ${storeName.toUpperCase()} ${stageName.toUpperCase()}`;
      statusEl.classList.add('active');
      
      await loadDeployments(storeName, stageName);
      
      // Update header when finished
      statusText.textContent = `${storeName.toUpperCase()} ${stageName.toUpperCase()}`;
    } else {
      const isMCG = url.hostname === 'bugs.mycloudgrocer.com';
      const isTaskPage = /edit_bug\.aspx/i.test(url.pathname);

      if (!isMCG) {
        statusText.textContent = 'Not on MCG tracker or stage site';
        statusEl.classList.add('inactive');
        return;
      }

      if (!isTaskPage) {
        statusText.textContent = 'On MCG, but not a task page';
        statusEl.classList.add('inactive');
        return;
      }

      // We're on a task page!
      const taskId = url.searchParams.get('id');
      statusText.textContent = `Task #${taskId}`;
      statusEl.classList.add('active');
      actionsEl.style.display = 'flex';

      // --- Button: Copy task ID ---
      document.getElementById('btn-copy-id').addEventListener('click', async () => {
        await copyToClipboardViaTab(tab.id, taskId);
        showButtonFeedback('btn-copy-id', 'Copied!');
      });

      // --- Button: Copy link ---
      document.getElementById('btn-copy-link').addEventListener('click', async () => {
        const canonicalUrl = `https://bugs.mycloudgrocer.com/edit_bug.aspx?id=${taskId}`;
        await copyToClipboardViaTab(tab.id, canonicalUrl);
        showButtonFeedback('btn-copy-link', 'Copied!');
      });
    }
  } catch (err) {
    statusText.textContent = 'Error: ' + err.message;
    statusEl.classList.remove('active');
    statusEl.classList.add('inactive');
  }
});

/**
 * Fetch helper using X-Api-Key
 */
async function fetchFromApi(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'X-Api-Key': API_KEY,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load environments lookup list with 24-hour cache
 */
async function getEnvironmentId(stageName) {
  const cacheKey = 'environments_cache';
  const data = await chrome.storage.local.get(cacheKey);
  const now = Date.now();
  
  let environments = null;
  if (data[cacheKey] && data[cacheKey].expiry > now) {
    environments = data[cacheKey].list;
  } else {
    try {
      environments = await fetchFromApi('/monitor/lookups/environments');
      await chrome.storage.local.set({
        [cacheKey]: {
          list: environments,
          expiry: now + 24 * 60 * 60 * 1000
        }
      });
    } catch (err) {
      console.warn('Failed to fetch environments, trying to fallback to expired cache', err);
      if (data[cacheKey]) {
        environments = data[cacheKey].list;
      } else {
        throw err;
      }
    }
  }

  // Map PD/pd to PR in lookups
  let lookupName = stageName.toUpperCase();
  if (lookupName.startsWith('PD')) {
    lookupName = lookupName.replace('PD', 'PR');
  }

  const env = environments.find(e => e.environmentName.toUpperCase() === lookupName);
  if (!env) {
    throw new Error(`Environment "${stageName}" (mapped to "${lookupName}") not found`);
  }
  return env.id;
}

/**
 * Resolve build branch/number information with indefinite cache for immutable builds
 */
async function resolveBuilds(buildIds) {
  const cacheKey = 'builds_cache';
  const storageData = await chrome.storage.local.get(cacheKey);
  const cache = storageData[cacheKey] || {};
  
  const missingBuildIds = buildIds.filter(id => !cache[id]);
  
  if (missingBuildIds.length > 0) {
    // Fetch missing builds in parallel
    const promises = missingBuildIds.map(async (id) => {
      try {
        const build = await fetchFromApi(`/builds/${id}`);
        return {
          id,
          gitBranch: (build.gitBranch || '').trim(),
          buildNumber: build.buildNumber
        };
      } catch (err) {
        console.error(`Failed to fetch build ${id}`, err);
        return {
          id,
          gitBranch: 'unknown',
          buildNumber: 'unknown'
        };
      }
    });
    
    const fetchedBuilds = await Promise.all(promises);
    
    // Update cache
    for (const fb of fetchedBuilds) {
      cache[fb.id] = {
        gitBranch: fb.gitBranch,
        buildNumber: fb.buildNumber
      };
    }
    await chrome.storage.local.set({ [cacheKey]: cache });
  }
  
  return cache;
}

/**
 * Main logic to load and render deployments
 */
async function loadDeployments(storeName, stageName) {
  const deploymentsListEl = document.getElementById('deployments-list');
  const deploymentsEl = document.getElementById('deployments-section');
  
  try {
    // 1. Resolve environmentId
    const envId = await getEnvironmentId(stageName);
    
    // 2. Fetch deployments for tenant and environment
    const deployments = await fetchFromApi(`/deployments?tenantCode=${storeName.toUpperCase()}&environmentId=${envId}`);
    
    // 3. Filter to latest deployment per project
    const latestByProject = {};
    for (const dep of deployments) {
      const projName = (dep.project || '').trim().toLowerCase();
      if (!projName) continue;
      // First one is the latest (API returns descending by buildId/date)
      if (!latestByProject[projName]) {
        latestByProject[projName] = dep;
      }
    }
    
    const projectDeps = Object.values(latestByProject);
    if (projectDeps.length === 0) {
      deploymentsListEl.innerHTML = '<div class="no-deployments">No deployments found.</div>';
      deploymentsEl.style.display = 'flex';
      return;
    }

    // Sort projectDeps: REACT first, WEB second, then others alphabetically
    projectDeps.sort((a, b) => {
      const nameA = (a.project || '').trim().toUpperCase();
      const nameB = (b.project || '').trim().toUpperCase();
      
      const priority = { 'REACT': 1, 'WEB': 2 };
      const priorityA = priority[nameA] || 99;
      const priorityB = priority[nameB] || 99;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return nameA.localeCompare(nameB);
    });
    
    // 4. Resolve build branches in parallel
    const buildIds = projectDeps.map(dep => dep.buildId).filter(Boolean);
    const resolvedBuildsCache = await resolveBuilds(buildIds);
    
    // 5. Partition deployments
    const priorityDeps = [];
    const otherDeps = [];
    for (const dep of projectDeps) {
      const projName = (dep.project || '').trim().toUpperCase();
      if (projName === 'REACT' || projName === 'WEB') {
        priorityDeps.push(dep);
      } else {
        otherDeps.push(dep);
      }
    }

    // Render card helper
    function renderCard(dep) {
      const project = (dep.project || '').trim().toUpperCase();
      const buildInfo = resolvedBuildsCache[dep.buildId] || { gitBranch: 'unknown', buildNumber: 'unknown' };
      const gitBranch = buildInfo.gitBranch || 'unknown';
      const buildNumber = buildInfo.buildNumber || 'unknown';
      
      let statusClass = 'status--unknown';
      let statusText = 'Unknown';
      if (dep.statusId === 2) {
        statusClass = 'status--completed';
        statusText = 'Completed';
      } else if (dep.statusId === 4) {
        statusClass = 'status--failed';
        statusText = 'Failed';
      } else if (dep.statusId === 1 || dep.statusId === 3) {
        statusClass = 'status--pending';
        statusText = 'Pending';
      }

      const createdBy = (dep.createdBy || 'system').trim();
      let formattedDate = 'Unknown date';
      if (dep.startedOnUtc) {
        try {
          const dateObj = new Date(dep.startedOnUtc + 'Z');
          formattedDate = dateObj.toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } catch (e) {
          console.error('Error formatting date', e);
        }
      }

      return `
        <a href="https://bugs.mycloudgrocer.com/monitor/deployments.aspx?buildid=${dep.buildId}" target="_blank" class="deployment-card">
          <div class="deployment-header">
            <span class="deployment-project">${project}</span>
            <span class="deployment-status ${statusClass}">${statusText}</span>
          </div>
          <div class="deployment-branch-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
            <span class="deployment-branch" title="${gitBranch}">${gitBranch}</span>
          </div>
          <div class="deployment-meta">
            <span>Build #${buildNumber} • by ${createdBy}</span>
            <span>${formattedDate}</span>
          </div>
        </a>
      `;
    }

    // Populate UI
    const moreListEl = document.getElementById('deployments-more-list');
    const expandBtn = document.getElementById('btn-expand-deployments');

    if (priorityDeps.length > 0) {
      deploymentsListEl.innerHTML = priorityDeps.map(renderCard).join('');
    } else {
      deploymentsListEl.innerHTML = '<div class="no-deployments">No core deployments found.</div>';
    }

    if (otherDeps.length > 0) {
      moreListEl.innerHTML = otherDeps.map(renderCard).join('');
      expandBtn.style.display = 'flex';
      
      expandBtn.onclick = () => {
        const isHidden = moreListEl.style.display === 'none';
        if (isHidden) {
          moreListEl.style.display = 'flex';
          expandBtn.classList.add('expanded');
          expandBtn.querySelector('span').textContent = 'Hide Services';
        } else {
          moreListEl.style.display = 'none';
          expandBtn.classList.remove('expanded');
          expandBtn.querySelector('span').textContent = 'Show More Services';
        }
      };
    } else {
      expandBtn.style.display = 'none';
      moreListEl.style.display = 'none';
    }

    deploymentsEl.style.display = 'flex';
  } catch (err) {
    deploymentsListEl.innerHTML = `<div class="no-deployments" style="color: #f87171;">Failed to load: ${err.message}</div>`;
    deploymentsEl.style.display = 'flex';
    throw err;
  }
}

/**
 * Copy text via the content script's context
 */
async function copyToClipboardViaTab(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => navigator.clipboard.writeText(t),
    args: [text],
  });
}

/**
 * Visual feedback on a button
 */
function showButtonFeedback(btnId, msg) {
  const btn = document.getElementById(btnId);
  const span = btn.querySelector('span');
  const original = span.textContent;
  span.textContent = msg;
  btn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
  setTimeout(() => {
    span.textContent = original;
    btn.style.background = '';
  }, 1500);
}
