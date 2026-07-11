/**
 * MCG Helper — Popup Script
 */

const API_KEY = window.API_KEY || '';
const API_BASE = 'https://bugs.mycloudgrocer.com/api';

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

// Cache for current staging site details and deployments for copying test data table
let currentStoreName = '';
let currentStageName = '';
let currentDeployments = [];
let currentBuildsCache = {};

/**
 * Extract hostname from a URL string safely.
 */
function getHostname(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

/**
 * Determine store name and stage name from current page URL.
 */
function getStoreAndStageFromUrl(url) {
  const hostname = url.hostname.toLowerCase();
  
  // 1. Check staging patterns like store.qa5.mycloudgrocer.com
  const stageMatch = hostname.match(/^([^.]+)\.(qa[1-6]|pd[1-6]|dev[1-6]|qa|pd|dev)\.mycloudgrocer\.com$/i);
  if (stageMatch) {
    return { storeName: stageMatch[1], stageName: stageMatch[2].toLowerCase() };
  }
  
  // 2. Check *.prod.mycloudgrocer.com pattern
  const prodSubdomainMatch = hostname.match(/^([^.]+)\.prod\.mycloudgrocer\.com$/i);
  if (prodSubdomainMatch) {
    return { storeName: prodSubdomainMatch[1], stageName: 'prod' };
  }
  
  // 3. Check custom prod domains
  for (const [storeKey, prodUrl] of Object.entries(PROD_MAP)) {
    const prodHost = getHostname(prodUrl);
    if (prodHost) {
      if (hostname === prodHost || hostname.endsWith('.' + prodHost)) {
        return { storeName: storeKey, stageName: 'prod' };
      }
    }
  }
  
  return null;
}

/**
 * Calculate the target URL for stage switching.
 */
function getTargetUrl(targetStage, storeName, currentUrlStr) {
  const currentUrl = new URL(currentUrlStr);
  
  // Identify the production base URL for this store
  let prodBaseUrlStr = '';
  if (PROD_MAP[storeName]) {
    prodBaseUrlStr = PROD_MAP[storeName];
  } else {
    prodBaseUrlStr = `https://${storeName}.prod.mycloudgrocer.com/`;
  }
  const prodBaseUrl = new URL(prodBaseUrlStr);
  
  // Extract relative path (stripping prod pathname prefix if present on prod site)
  let relativePath = currentUrl.pathname;
  if (currentUrl.hostname === prodBaseUrl.hostname || currentUrl.hostname.endsWith('.' + prodBaseUrl.hostname)) {
    const prodPrefix = prodBaseUrl.pathname.replace(/\/$/, '');
    if (prodPrefix && relativePath.startsWith(prodPrefix)) {
      relativePath = relativePath.slice(prodPrefix.length);
    }
  }
  
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  
  let targetUrlStr = '';
  if (targetStage === 'prod') {
    const base = prodBaseUrl.origin + prodBaseUrl.pathname.replace(/\/$/, '');
    targetUrlStr = base + relativePath + currentUrl.search + currentUrl.hash;
  } else {
    targetUrlStr = `https://${storeName}.${targetStage}.mycloudgrocer.com` + relativePath + currentUrl.search + currentUrl.hash;
  }
  
  return targetUrlStr;
}

/**
 * Setup stage switcher buttons.
 */
function setupStageSwitcher(tab, storeName, currentStage) {
  const stages = ['qa5', 'qa6', 'dev5', 'dev6', 'prod'];
  const storeUpper = storeName.toUpperCase();
  
  stages.forEach(stage => {
    let btn = document.getElementById(`btn-stage-${stage}`);
    if (!btn) return;
    
    const isCurrent = (stage === 'prod' && currentStage.toLowerCase() === 'prod') || 
                      (stage !== 'prod' && currentStage.toLowerCase() === stage);
                      
    if (isCurrent) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
      
      // Clone to remove old listeners (just in case setup is called multiple times)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      btn = newBtn;
      
      btn.addEventListener('click', async () => {
        const targetUrl = getTargetUrl(stage, storeName, tab.url);
        await chrome.tabs.update(tab.id, { url: targetUrl });
        window.close();
      });
    }
    
    // Find or create tooltip inside the active button element
    let tooltip = btn.querySelector('.qa-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('span');
      tooltip.className = 'qa-tooltip';
      btn.appendChild(tooltip);
    }
    
    const stageUpper = stage.toUpperCase();
    if (isCurrent) {
      tooltip.textContent = `Current Stage: ${storeUpper} ${stageUpper}`;
    } else {
      tooltip.textContent = `Switch to ${storeUpper} ${stageUpper}`;
    }
  });
}

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

  // Cache API Key in local storage for content scripts
  await chrome.storage.local.set({ apiKey: API_KEY });

  try {
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      statusText.textContent = 'No access to tab';
      statusEl.classList.add('inactive');
      return;
    }

    const url = new URL(tab.url);
    const matchedDetails = getStoreAndStageFromUrl(url);

    if (matchedDetails) {
      const storeName = matchedDetails.storeName;
      const stageName = matchedDetails.stageName;
      currentStoreName = storeName;
      currentStageName = stageName;
      
      // Set min-height immediately to prevent Chrome popup clipping bug on async load
      document.body.style.minHeight = '380px';
      
      // Hide status bar on storefront pages
      statusEl.style.display = 'none';
      
      const quickActionsEl = document.getElementById('quick-actions-section');
      if (quickActionsEl) {
        quickActionsEl.style.display = 'flex';
        await setupQuickActions(tab);
      }
      
      const stagesEl = document.getElementById('stages-section');
      if (stagesEl) {
        stagesEl.style.display = 'flex';
        setupStageSwitcher(tab, storeName, stageName);
      }
      
      try {
        await loadDeployments(storeName, stageName);
      } catch (depErr) {
        console.warn('[MCG Helper] Failed to load deployments for stage:', stageName, depErr);
        const deploymentsListEl = document.getElementById('deployments-list');
        if (deploymentsListEl) {
          deploymentsListEl.innerHTML = `<div class="no-deployments">Deployments information not available for ${stageName.toUpperCase()}</div>`;
        }
        if (deploymentsEl) {
          deploymentsEl.style.display = 'flex';
        }
      }
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
    currentDeployments = projectDeps;
    currentBuildsCache = resolvedBuildsCache;
    
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
/**
 * Visual feedback on a button
 */
function showButtonFeedback(btnId, msg) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const span = btn.querySelector('span');
  if (!span) return;
  const original = span.textContent;
  span.textContent = msg;
  btn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
  setTimeout(() => {
    span.textContent = original;
    btn.style.background = '';
  }, 1500);
}

/**
 * Visual feedback on a QA/tooltip action button
 */
function showQaButtonFeedback(btnId, msg) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const tooltip = btn.querySelector('.qa-tooltip');
  if (!tooltip) return;
  const original = tooltip.textContent;
  tooltip.textContent = msg;
  btn.style.borderColor = '#10B981';
  btn.style.color = '#10B981';
  btn.style.background = 'rgba(16, 185, 129, 0.1)';
  btn.classList.add('force-tooltip');
  
  setTimeout(() => {
    tooltip.textContent = original;
    btn.style.borderColor = '';
    btn.style.color = '';
    btn.style.background = '';
    btn.classList.remove('force-tooltip');
  }, 1500);
}

/**
 * Setup event listeners for staging page Quick Actions
 */
async function setupQuickActions(tab) {
  // Check header presence and admin access in the tab
  let isHeaderPresent = false;
  let hasAdminAccess = true;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const header = document.querySelector('.store-main-page-header-content');
        if (!header) {
          return { isHeaderPresent: false, hasAdminAccess: true };
        }
        
        const isLoggedIn = document.querySelector('#mcg-user-action-button') !== null;
        let hasAdminAccess = true;
        if (isLoggedIn) {
          const titles = Array.from(document.querySelectorAll('.store-menu-icon-wrapper > .content-title'));
          const hasManage = titles.some(t => (t.textContent || '').trim().toLowerCase() === 'manage');
          hasAdminAccess = hasManage;
        }
        
        return { isHeaderPresent: true, hasAdminAccess };
      }
    });
    if (result) {
      isHeaderPresent = result.isHeaderPresent;
      hasAdminAccess = result.hasAdminAccess;
    }
  } catch (err) {
    console.warn('[MCG Helper] Failed to check header/access presence:', err);
  }

  const btnLogin = document.getElementById('btn-qa-login');
  if (btnLogin) {
    // Clone button to strip any pre-existing listeners
    const newBtn = btnLogin.cloneNode(true);
    btnLogin.parentNode.replaceChild(newBtn, btnLogin);

    // Check if the user is already logged in via active tab's localStorage
    let isLoggedIn = false;
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => localStorage.getItem('isLoggedIn') === 'true'
      });
      isLoggedIn = result;
    } catch (err) {
      console.warn('[MCG Helper] Failed to check login status from tab:', err);
    }

    if (isLoggedIn) {
      newBtn.disabled = true;
      const tooltip = newBtn.querySelector('.qa-tooltip');
      if (tooltip) {
        tooltip.textContent = 'Already logged in';
      }
    }

    newBtn.addEventListener('click', async () => {
      try {
        const url = new URL(tab.url);
        const pathname = url.pathname.toLowerCase().replace(/\/$/, '');
        const isLoginPage = pathname.startsWith('/login') || pathname.endsWith('/login');
        const loginUrl = new URL('/login', tab.url).toString();

         if (isLoginPage) {
          // If we are already on `/login`, log in directly
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: performAutoLoginInPage,
            args: ["nick@mycloudgrocer.com", "Password2!"]
          });
        } else {
          // Always save credentials to local storage in case the header button triggers navigation
          await chrome.storage.local.set({
            autoLogin: {
              username: "nick@mycloudgrocer.com",
              password: "Password2!",
              timestamp: Date.now()
            }
          });

          // Try to click the header login button first
          let headerBtnClicked = false;
          try {
            const [{ result }] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: clickHeaderLoginAndFill,
              args: ["nick@mycloudgrocer.com", "Password2!"]
            });
            headerBtnClicked = result;
          } catch (e) {
            console.warn('[MCG Helper] Failed to check/click header login button:', e);
          }

          // If the header login button was not found, fallback to redirect
          if (!headerBtnClicked) {
            await chrome.tabs.update(tab.id, { url: loginUrl });
          }
        }
        
        // Close popup to give control back to tab
        window.close();
      } catch (err) {
        console.error('[MCG Helper] Quick Actions Login failed:', err);
      }
    });
  }

  const btnCopyTable = document.getElementById('btn-qa-copy-table');
  if (btnCopyTable) {
    const newBtn = btnCopyTable.cloneNode(true);
    btnCopyTable.parentNode.replaceChild(newBtn, btnCopyTable);

    newBtn.addEventListener('click', async () => {
      try {
        // 1. Get client specs from page context
        let clientSpecs = {
          os: 'Windows 11 x64',
          browser: 'Google Chrome',
          resolution: '1920x1080',
          device: 'Laptop',
          model: 'PC / Laptop'
        };
        
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const getOS = () => {
                const ua = navigator.userAgent;
                let os = 'Windows 11';
                if (ua.indexOf('Macintosh') !== -1) os = 'macOS';
                else if (ua.indexOf('Linux') !== -1) os = 'Linux';
                
                let arch = '';
                if (ua.indexOf('x86_64') !== -1 || ua.indexOf('Win64') !== -1 || ua.indexOf('WOW64') !== -1) {
                  arch = ' x64';
                } else if (ua.indexOf('arm64') !== -1 || ua.indexOf('ARM64') !== -1) {
                  arch = ' ARM64';
                }
                return os + arch;
              };

              const getBrowser = () => {
                const ua = navigator.userAgent;
                if (ua.indexOf('Firefox') !== -1) return 'Mozilla Firefox';
                if (ua.indexOf('Edg') !== -1) return 'Microsoft Edge';
                if (ua.indexOf('Chrome') !== -1) return 'Google Chrome';
                if (ua.indexOf('Safari') !== -1) return 'Apple Safari';
                return 'Google Chrome';
              };

              const getDeviceModel = () => {
                const ua = navigator.userAgent;
                if (/Macintosh/i.test(ua)) return 'MacBook';
                return 'PC / Laptop';
              };

              return {
                os: getOS(),
                browser: getBrowser(),
                resolution: `${window.screen.width}x${window.screen.height}`,
                device: 'Laptop',
                model: getDeviceModel() === 'MacBook' ? 'MacBook' : 'PC / Laptop'
              };
            }
          });
          if (result) clientSpecs = result;
        } catch (e) {
          console.warn('Failed to execute client spec script, falling back to defaults', e);
        }

        // 2. Get zoom factor
        let zoom = '100%';
        try {
          const zoomFactor = await chrome.tabs.getZoom(tab.id);
          zoom = `${Math.round(zoomFactor * 100)}%`;
        } catch (e) {
          console.warn('Failed to get zoom level, using default 100%', e);
        }

        // 3. Resolve front-end and back-end branches from cache
        const findProjectData = (keywords) => {
          if (!currentDeployments || currentDeployments.length === 0) {
            return { branch: '', build: '' };
          }
          const dep = currentDeployments.find(d => {
            const name = (d.project || '').toUpperCase();
            return keywords.some(k => name.includes(k));
          });
          if (!dep) return { branch: '', build: '' };
          const buildInfo = currentBuildsCache[dep.buildId] || {};
          return {
            branch: buildInfo.gitBranch || '',
            build: buildInfo.buildNumber ? String(buildInfo.buildNumber) : ''
          };
        };

        const frontend = findProjectData(['REACT', 'FRONT']);
        const backend = findProjectData(['WEB', 'API', 'BACK']);

        const storeNameUpper = (currentStoreName || '').toUpperCase();
        const stageNameUpper = (currentStageName || '').toUpperCase();

        // 4. Generate HTML table matching the user's structure and styles
        const htmlTable = `<table baot="1" border="1" cellpadding="0" cellspacing="0" dir="ltr" root="1" xmlns="http://www.w3.org/1999/xhtml" style="color: rgb(34, 34, 34); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; table-layout: fixed; font-size: 10pt; font-family: Arial; width: 0px; border-collapse: collapse; border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;">
  <colgroup>
    <col width="48">
    <col width="25">
    <col width="155">
    <col width="244">
    <col width="150">
    <col width="328">
  </colgroup>
  <tbody>
    <tr style="height: 25px;">
      <td colspan="1" rowspan="7" style="border: 1px solid rgb(183, 183, 183); overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: bold; color: rgb(234, 153, 153); text-align: center;">
        <div style="max-height: 458px;"><span></span></div>
      </td>
      <td colspan="5" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Environment:</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Device</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${clientSpecs.device}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Store</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: bottom; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${storeNameUpper}</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Model</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${clientSpecs.model}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Server</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: bottom; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${stageNameUpper}</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">OS</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${clientSpecs.os}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Back-end branch</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: bottom; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${backend.branch}</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Resolution</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${clientSpecs.resolution}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">BE Build number</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${backend.build}</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Browser</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${clientSpecs.browser}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Front-end branch</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: bottom; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${frontend.branch}</td>
    </tr>
    <tr style="height: 25px;">
      <td colspan="2" rowspan="1" style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Page Zoom</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${zoom}</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(239, 239, 239); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">Front-end number</td>
      <td style="border-width: 1px; border-style: solid; border-color: rgb(204, 204, 204) rgb(183, 183, 183) rgb(183, 183, 183) rgb(204, 204, 204); border-image: initial; overflow: hidden; padding: 2px 3px; vertical-align: middle; background-color: rgb(255, 255, 255); font-family: 'Times New Roman'; font-size: 14pt; font-weight: normal;">${frontend.build}</td>
    </tr>
  </tbody>
</table>`;

        // 5. Generate TSV representation for text/plain fallback
        const tsvData = [
          `\tEnvironment:\t\t\t\t`,
          `\tDevice\t${clientSpecs.device}\tStore\t${storeNameUpper}\t`,
          `\tModel\t${clientSpecs.model}\tServer\t${stageNameUpper}\t`,
          `\tOS\t${clientSpecs.os}\tBack-end branch\t${backend.branch}\t`,
          `\tResolution\t${clientSpecs.resolution}\tBE Build number\t${backend.build}\t`,
          `\tBrowser\t${clientSpecs.browser}\tFront-end branch\t${frontend.branch}\t`,
          `\tPage Zoom\t${zoom}\tFront-end number\t${frontend.build}\t`
        ].join('\n');

        // 6. Write to clipboard using active tab context
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (html, text) => {
            try {
              const blobHtml = new Blob([html], { type: 'text/html' });
              const blobText = new Blob([text], { type: 'text/plain' });
              const item = new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText
              });
              navigator.clipboard.write([item]).catch(err => {
                console.error('[MCG Helper] Failed to copy formatted table via ClipboardItem:', err);
                navigator.clipboard.writeText(text);
              });
            } catch (err) {
              console.error('[MCG Helper] Error writing to clipboard inside tab:', err);
            }
          },
          args: [htmlTable, tsvData]
        });

        // 7. Show success feedback
        showQaButtonFeedback('btn-qa-copy-table', 'Copied!');
      } catch (err) {
        console.error('[MCG Helper] Copy table failed:', err);
        showQaButtonFeedback('btn-qa-copy-table', 'Error!');
      }
    });
  }

  const setupNavigationAction = (btnId, parentName, tabName) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    if (!isHeaderPresent) {
      newBtn.disabled = true;
      const tooltip = newBtn.querySelector('.qa-tooltip');
      if (tooltip) {
        tooltip.textContent = 'Menu button not found';
      }
      return;
    }

    if (!hasAdminAccess) {
      newBtn.disabled = true;
      const tooltip = newBtn.querySelector('.qa-tooltip');
      if (tooltip) {
        tooltip.textContent = 'No admin access';
      }
      return;
    }

    newBtn.addEventListener('click', async () => {
      try {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'TRIGGER_QUICK_ACTION',
            parent: parentName,
            tab: tabName
          });
        } catch (e) {
          console.warn('[MCG Helper] Content script not loaded or listening yet:', e);
        }

        window.close();
      } catch (err) {
        console.error('[MCG Helper] Action navigation failed:', err);
      }
    });
  };

  setupNavigationAction('btn-qa-admin-site-config', 'Admin', 'Site Config');
  setupNavigationAction('btn-qa-admin-deli-menus', 'Admin', 'Deli Menus');
  setupNavigationAction('btn-qa-settings-store-general', 'Settings', 'Store General');
  setupNavigationAction('btn-qa-settings-service-areas', 'Settings', 'Service Areas');
  setupNavigationAction('btn-qa-settings-checkout-instructions', 'Settings', 'Checkout Insturctions');
}

/**
 * Self-contained auto-login script to be injected via chrome.scripting.executeScript
 */
function performAutoLoginInPage(username, password) {
  function setVal(input, val) {
    if (!input) return;
    input.value = val;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  const emailInput = document.querySelector('input[type="email"]') ||
                     document.querySelector('input[name="email" i]') ||
                     document.querySelector('input[id="email" i]') ||
                     document.querySelector('input[name="username" i]') ||
                     document.querySelector('input[id="username" i]') ||
                     document.querySelector('input[name*="email" i]') ||
                     document.querySelector('input[id*="email" i]') ||
                     document.querySelector('input[name*="user" i]') ||
                     document.querySelector('input[id*="user" i]');

  const passwordInput = document.querySelector('input[type="password"]') ||
                        document.querySelector('input[name="password" i]') ||
                        document.querySelector('input[id="password" i]') ||
                        document.querySelector('input[name*="pass" i]') ||
                        document.querySelector('input[id*="pass" i]');

  if (!emailInput || !passwordInput) {
    console.error('[MCG Helper] Input elements not found.');
    return;
  }

  setVal(emailInput, username);
  setVal(passwordInput, password);

  let loginBtn = document.querySelector('.form-submit-btn[type="submit"]') ||
                 document.querySelector('button[type="submit"]') ||
                 document.querySelector('input[type="submit"]');

  if (!loginBtn) {
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a, [role="button"]'));
    loginBtn = buttons.find(btn => {
      const text = (btn.textContent || btn.value || '').toLowerCase().trim();
      return text.includes('log in') || text === 'login' || text.includes('sign in') || text === 'signin';
    });
  }

  if (loginBtn) {
    setTimeout(() => { loginBtn.click(); }, 15);
  } else {
    const form = emailInput.closest('form');
    if (form) {
      setTimeout(() => { form.submit(); }, 150);
    } else {
      console.error('[MCG Helper] Submit button/form not found.');
    }
  }
}

/**
 * In-page helper to click header login button and poll for credentials fields
 */
function clickHeaderLoginAndFill(username, password) {
  const headerLoginBtn = document.querySelector('.store-main-page-header-content .login-button');
  if (!headerLoginBtn) return false;

  headerLoginBtn.click();

  let attempts = 0;
  const interval = setInterval(() => {
    const emailInput = document.querySelector('input[type="email"]') ||
                       document.querySelector('input[name="email" i]') ||
                       document.querySelector('input[id="email" i]') ||
                       document.querySelector('input[name="username" i]') ||
                       document.querySelector('input[id="username" i]') ||
                       document.querySelector('input[name*="email" i]') ||
                       document.querySelector('input[id*="email" i]') ||
                       document.querySelector('input[name*="user" i]') ||
                       document.querySelector('input[id*="user" i]');

    const passwordInput = document.querySelector('input[type="password"]') ||
                          document.querySelector('input[name="password" i]') ||
                          document.querySelector('input[id="password" i]') ||
                          document.querySelector('input[name*="pass" i]') ||
                          document.querySelector('input[id*="pass" i]');

    if (emailInput && passwordInput) {
      clearInterval(interval);

      const setVal = (input, val) => {
        if (!input) return;
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      setVal(emailInput, username);
      setVal(passwordInput, password);

      let loginBtn = document.querySelector('.form-submit-btn[type="submit"]') ||
                     document.querySelector('button[type="submit"]') ||
                     document.querySelector('input[type="submit"]');

      if (!loginBtn) {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a, [role="button"]'));
        loginBtn = buttons.find(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase().trim();
          return text.includes('log in') || text === 'login' || text.includes('sign in') || text === 'signin';
        });
      }

      if (loginBtn) {
        setTimeout(() => { loginBtn.click(); }, 150);
      } else {
        const form = emailInput.closest('form');
        if (form) {
          setTimeout(() => { form.submit(); }, 150);
        }
      }
    }

    attempts++;
    if (attempts > 30) {
      clearInterval(interval);
    }
  }, 100);

  return true;
}
