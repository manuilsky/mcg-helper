/**
 * MCG Helper — Bitbucket Content Script
 *
 * Injects:
 * 1. "Create PR" and "Task" buttons on commit pages.
 * 2. "Copy today task's" button on Pull Requests list pages.
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────
  const TARGET_BRANCH = 'sprint/rs34';

  // ── Route checks ──────────────────────────────────────────────
  const path = window.location.pathname;
  const isCommitPage = /\/projects\/([^/]+)\/repos\/([^/]+)\/commits\/([0-9a-f]+)/i.test(path);
  const isPRDetailPage = /\/projects\/([^/]+)\/repos\/([^/]+)\/pull-requests\/(\d+)/i.test(path);
  const isPRCreatePage = /\/projects\/([^/]+)\/repos\/([^/]+)\/pull-requests/i.test(path) && new URLSearchParams(window.location.search).has('create');
  const isPRListPage = /\/projects\/([^/]+)\/repos\/([^/]+)\/pull-requests/i.test(path) && !isPRDetailPage && !isPRCreatePage;

  if (isCommitPage) {
    initCommitPage();
  } else if (isPRCreatePage) {
    initPRCreatePage();
  } else if (isPRListPage) {
    initPRListPage();
  } else if (isPRDetailPage) {
    initPRDetailPage();
  }

  // ──────────────────────────────────────────────────────────────
  // ── SECTION 1: COMMIT PAGE LOGIC ─────────────────────────────
  // ──────────────────────────────────────────────────────────────
  function initCommitPage() {
    const match = path.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/commits\/([0-9a-f]+)/i);
    if (!match) return;

    const projectKey = match[1];
    const repoSlug = match[2];
    const commitHash = match[3];

    console.log(`[MCG Helper] Bitbucket commit page detected: ${projectKey}/${repoSlug}@${commitHash}`);

    function extractTaskIdFromBranch() {
      const branchLink = document.querySelector('.branch-info-branch');
      if (branchLink) {
        const text = branchLink.textContent.trim();
        const m = text.match(/task\/(\d+)/i);
        if (m) return m[1];
      }
      return null;
    }

    function extractTaskIdFromMessage(text) {
      if (!text) return null;
      const patterns = [
        /^(\d{4,6})\s*\|/,
        /#(\d{4,6})/,
        /\b(\d{5,6})\b/,
      ];
      for (const pattern of patterns) {
        const m = text.match(pattern);
        if (m) return m[1];
      }
      return null;
    }

    function buildPRUrl(taskId) {
      const baseUrl = `${window.location.origin}/projects/${projectKey}/repos/${repoSlug}/pull-requests`;
      const params = new URLSearchParams({
        'create': '',
        'targetBranch': `refs/heads/${TARGET_BRANCH}`,
        'sourceBranch': `refs/heads/task/${taskId}`,
      });
      return `${baseUrl}?${params.toString()}`;
    }

    function createPRButton(taskId) {
      const btn = document.createElement('a');
      btn.id = 'mcg-create-pr-btn';
      btn.href = buildPRUrl(taskId);
      btn.className = 'aui-button mcg-bb-create-pr';
      btn.title = `Create PR: task/${taskId} → ${TARGET_BRANCH}`;
      btn.innerHTML = `
        <svg class="mcg-pr-icon-svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6.75 9.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 12.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-2.25-.75a2.25 2.25 0 1 1 3-2.122V6.122a2.25 2.25 0 1 1 1.5 0v1.836A2.252 2.252 0 0 1 9.5 9.5h1.378a2.251 2.251 0 1 1 0 1.5H9.5A3.75 3.75 0 0 1 5.75 7.25V9.878A2.251 2.251 0 0 1 2.75 12Z"/>
        </svg>
        <span>Create PR → ${TARGET_BRANCH}</span>
      `;
      return btn;
    }

    function createTaskButton(taskId) {
      const btn = document.createElement('a');
      btn.id = 'mcg-task-btn';
      btn.href = `https://bugs.mycloudgrocer.com/edit_bug.aspx?id=${taskId}`;
      btn.target = '_blank';
      btn.className = 'aui-button mcg-bb-create-pr';
      btn.title = `Open task #${taskId} in Bug Tracker`;
      btn.innerHTML = `
        <svg class="mcg-pr-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
        <span>Task #${taskId}</span>
      `;
      return btn;
    }

    function injectButton() {
      if (document.getElementById('mcg-create-pr-btn')) return true;

      let taskId = extractTaskIdFromBranch();
      if (!taskId) {
        const msgEl = document.querySelector('.commit-message pre');
        if (msgEl) {
          taskId = extractTaskIdFromMessage(msgEl.textContent);
        }
      }
      if (!taskId) {
        taskId = extractTaskIdFromMessage(document.title);
      }

      if (!taskId) {
        const hasRendered = document.querySelector('.commit-message, .commit-badge-oneline');
        if (hasRendered) {
          console.log('[MCG Helper] No task ID found on this commit page.');
          return true;
        }
        return false;
      }

      const commitMsgDiv = document.querySelector('.commit-message');
      if (commitMsgDiv) {
        const wrapper = document.createElement('div');
        wrapper.id = 'mcg-bb-actions';
        wrapper.className = 'mcg-bb-actions';
        wrapper.appendChild(createTaskButton(taskId));
        wrapper.appendChild(createPRButton(taskId));
        commitMsgDiv.parentNode.insertBefore(wrapper, commitMsgDiv.nextSibling);
        console.log('[MCG Helper] Task + Create PR buttons injected after commit message.');
        return true;
      }
      return false;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      if (injectButton() || attempts >= 60) {
        clearInterval(interval);
      }
      attempts++;
    }, 100);
  }

  // ──────────────────────────────────────────────────────────────
  // ── SECTION 2: PULL REQUEST LIST PAGE LOGIC ───────────────────
  // ──────────────────────────────────────────────────────────────
  function initPRListPage() {
    console.log('[MCG Helper] Pull requests list page detected.');

    function extractTaskIdFromPRTitle(title) {
      if (!title) return null;
      const patterns = [
        /^(\d{4,6})\b/,          // e.g. "60827: description" or "64665 | description"
        /task\/(\d{4,6})/i,      // task/64328
        /bug\/(\d{4,6})/i,       // bug/64328
        /#(\d{4,6})/,            // #64328
        /\b(\d{5,6})\b/,         // standalone 5-6 digits
      ];
      for (const pattern of patterns) {
        const m = title.match(pattern);
        if (m) return m[1];
      }
      return null;
    }

    function handleCopyTasksForDate(selectedDateVal) {
      if (!selectedDateVal) {
        MCGUtils.showToast('Please select a valid date.', 'error');
        return;
      }

      const parts = selectedDateVal.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      // Start limit: selected date at 6:00 AM local time
      const startLimit = new Date(year, month, day, 6, 0, 0, 0);

      // End limit: next day at 6:00 AM local time
      const endLimit = new Date(year, month, day + 1, 6, 0, 0, 0);

      console.log('[MCG Helper] Filtering PRs merged between:', startLimit.toString(), 'and', endLimit.toString());

      // 2. Select pull request rows in the table
      const rows = document.querySelectorAll('.pull-request-row, tr.pull-request-row, .pull-request-list-item');
      if (rows.length === 0) {
        MCGUtils.showToast('No pull requests found on the page.', 'error');
        return;
      }

      const taskIds = new Set();
      const skippedTitles = [];

      rows.forEach(row => {
        // Find merge time
        const timeEl = row.querySelector('time');
        if (!timeEl) return;

        const datetimeStr = timeEl.getAttribute('datetime');
        if (!datetimeStr) return;

        const mergeDate = new Date(datetimeStr);
        if (isNaN(mergeDate.getTime())) return;

        // Filter: merged within the 24h window starting at 6 AM of selected date
        if (mergeDate >= startLimit && mergeDate < endLimit) {
          // Find title link
          const titleLink = row.querySelector('.pull-request-title, a.pull-request-title, a[class*="title"]');
          if (!titleLink) return;

          const titleText = titleLink.textContent.trim();
          const taskId = extractTaskIdFromPRTitle(titleText);

          if (taskId) {
            taskIds.add(taskId);
          } else {
            skippedTitles.push(titleText);
          }
        }
      });

      // 3. Copy results to clipboard and notify
      if (taskIds.size > 0) {
        const resultString = Array.from(taskIds).join(', ');
        MCGUtils.copyToClipboard(resultString);
        MCGUtils.showToast(`Copied ${taskIds.size} task(s) for ${selectedDateVal}: ${resultString}`, 'success', 4000);
      } else {
        MCGUtils.showToast(`No merged PRs found for ${selectedDateVal} (since 6:00 AM).`, 'error');
      }

      // 4. Notify if any PRs had no task numbers
      if (skippedTitles.length > 0) {
        setTimeout(() => {
          MCGUtils.showToast(`Skipped ${skippedTitles.length} PR(s) lacking task ID`, 'error', 4000);
        }, 800);
      }
    }

    function injectCopyButton() {
      // 1. Only show the button on the 'MERGED' pull requests tab
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('state') !== 'MERGED') {
        const existing = document.getElementById('mcg-bb-copy-widget-wrapper');
        if (existing) existing.remove();
        return false;
      }

      if (document.getElementById('mcg-copy-today-tasks-btn')) return true;

      // Find the right header action bar to place our button
      const targetContainer = document.querySelector('.pull-requests-page-header .buttons, .buttons-group, #list-create-pr-button');
      if (!targetContainer) return false;

      // Create a nice flex container wrapper for our widgets
      const wrapper = document.createElement('div');
      wrapper.id = 'mcg-bb-copy-widget-wrapper';
      wrapper.className = 'mcg-bb-copy-widget-wrapper';

      // 1. Create the visible date picker input next to the button
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.id = 'mcg-copy-tasks-date';
      dateInput.className = 'mcg-bb-date-input';

      // Default to today
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      dateInput.value = todayStr;

      // 2. Create the Copy button
      const btn = document.createElement('button');
      btn.id = 'mcg-copy-today-tasks-btn';
      btn.className = 'aui-button mcg-bb-copy-tasks-btn';
      btn.title = 'Copy tasks for the selected date';
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        Copy tasks
      `;

      // Click to copy tasks for selected date picker value
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handleCopyTasksForDate(dateInput.value);
      });

      wrapper.appendChild(dateInput);
      wrapper.appendChild(btn);

      // Insert relative to target
      if (targetContainer.id === 'list-create-pr-button') {
        targetContainer.parentNode.insertBefore(wrapper, targetContainer);
      } else {
        targetContainer.appendChild(wrapper);
      }

      console.log('[MCG Helper] Visible date picker widget injected successfully.');
      return true;
    }

    function improvePRDatesDisplay() {
      const times = document.querySelectorAll('.pull-request-row time, tr.pull-request-row time, .pull-request-list-item time');
      times.forEach(timeEl => {
        if (!timeEl.dataset.mcgFormatted) {
          const datetimeStr = timeEl.getAttribute('datetime');
          if (!datetimeStr) return;
          const date = new Date(datetimeStr);
          if (isNaN(date.getTime())) return;

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

          const diffTime = today.getTime() - target.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          const hh = String(date.getHours()).padStart(2, '0');
          const min = String(date.getMinutes()).padStart(2, '0');
          const timeStr = `${hh}:${min}`;

          let relativeStr = '';
          if (diffDays === 0) {
            relativeStr = `today at ${timeStr}`;
          } else if (diffDays === 1) {
            relativeStr = `yesterday at ${timeStr}`;
          } else if (diffDays > 1) {
            relativeStr = `${diffDays} days ago at ${timeStr}`;
          } else {
            // Future or fallback
            relativeStr = date.toLocaleDateString();
          }

          const originalText = timeEl.textContent.trim();
          timeEl.title = `${timeEl.title || ''} (original: ${originalText})`.trim();

          timeEl.textContent = relativeStr;
          timeEl.dataset.mcgFormatted = 'true';
        }
      });
    }

    // 1. Run instantly on load
    improvePRDatesDisplay();
    injectCopyButton();

    // 2. Set up a reactive MutationObserver to handle dynamic updates and lazy loading instantly
    const observer = new MutationObserver(() => {
      improvePRDatesDisplay();
      injectCopyButton();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ── SECTION 3: PULL REQUEST DETAILS PAGE LOGIC ────────────────
  // ──────────────────────────────────────────────────────────────
  function initPRDetailPage() {
    console.log('[MCG Helper] Pull request details page detected.');

    function extractTaskIdFromPRDetails() {
      const sourceBranchEl = document.querySelector('.source-branch .ref-lozenge-content, .ref-lozenge-content');
      if (sourceBranchEl) {
        const text = sourceBranchEl.textContent.trim();
        const m = text.match(/(?:task|tesk|bug|feature|fix|issue)\/(\d{4,6})/i) || text.match(/\b(\d{4,6})\b/);
        if (m) return m[1];
      }
      return null;
    }

    function createTaskButton(taskId) {
      const btn = document.createElement('a');
      btn.id = 'mcg-pr-task-btn';
      btn.href = `https://bugs.mycloudgrocer.com/edit_bug.aspx?id=${taskId}`;
      btn.target = '_blank';
      btn.className = 'aui-button mcg-bb-create-pr';
      btn.title = `Open task #${taskId} in Bug Tracker`;
      btn.style.marginRight = '8px';
      btn.innerHTML = `
        <svg class="mcg-pr-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
        <span>Task #${taskId}</span>
      `;
      return btn;
    }

    function injectPRTaskButton() {
      if (document.getElementById('mcg-pr-task-btn')) return true;

      const taskId = extractTaskIdFromPRDetails();
      if (!taskId) return false;

      const target = document.querySelector('.pull-request-actions');
      if (!target) return false;

      const taskBtn = createTaskButton(taskId);
      // Prepend task button so it sits neatly in the actions bar
      target.insertBefore(taskBtn, target.firstChild);
      console.log(`[MCG Helper] Task button for #${taskId} injected successfully into PR header.`);
      return true;
    }

    // Run instantly on load
    injectPRTaskButton();

    // Set up reactive MutationObserver
    const observer = new MutationObserver(() => {
      injectPRTaskButton();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ── SECTION 4: PULL REQUEST CREATE PAGE LOGIC ─────────────────
  // ──────────────────────────────────────────────────────────────
  function initPRCreatePage() {
    console.log('[MCG Helper] Pull request creation page detected.');

    function extractTaskIdFromPRCreatePage() {
      // 1. Try URL query parameters (primary)
      const urlParams = new URLSearchParams(window.location.search);
      const sourceBranchParam = urlParams.get('sourceBranch');
      if (sourceBranchParam) {
        const m = sourceBranchParam.match(/(?:task|tesk|bug|feature|fix|issue)\/(\d{4,6})/i) || sourceBranchParam.match(/\b(\d{4,6})\b/);
        if (m) return m[1];
      }

      // 2. Try targetBranch param just in case
      const targetBranchParam = urlParams.get('targetBranch');
      if (targetBranchParam) {
        const m = targetBranchParam.match(/(?:task|tesk|bug|feature|fix|issue)\/(\d{4,6})/i) || targetBranchParam.match(/\b(\d{4,6})\b/);
        if (m) return m[1];
      }

      // 3. Try to extract from UI elements (e.g. source branch selectors)
      const selectors = [
        '.source-branch-selector .branch-name',
        '.source-branch-trigger .branch-name',
        '.source-branch .ref-lozenge-content',
        '.source-branch .ref-name',
        '.branch-compare-container .source-branch',
        '#source-branch-trigger',
        '.source-branch-trigger',
        '.source-branch',
        '.branch-name',
        '.ref-name',
        '.ref-lozenge'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent.trim();
          const m = text.match(/(?:task|tesk|bug|feature|fix|issue)\/(\d{4,6})/i) || text.match(/\b(\d{4,6})\b/);
          if (m) return m[1];
        }
      }

      // 4. Try from form input or text area (e.g. PR Title input which is pre-filled with branch name or commit message)
      const titleInput = document.getElementById('title') || document.querySelector('input[name="title"]');
      if (titleInput && titleInput.value) {
        const m = titleInput.value.match(/(?:task|tesk|bug|feature|fix|issue)\/(\d{4,6})/i) || titleInput.value.match(/\b(\d{4,6})\b/);
        if (m) return m[1];
      }

      return null;
    }

    function createTaskButton(taskId) {
      const btn = document.createElement('a');
      btn.id = 'mcg-create-pr-task-btn';
      btn.href = `https://bugs.mycloudgrocer.com/edit_bug.aspx?id=${taskId}`;
      btn.target = '_blank';
      btn.className = 'aui-button mcg-bb-create-pr';
      btn.title = `Open task #${taskId} in Bug Tracker`;
      btn.innerHTML = `
        <svg class="mcg-pr-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
        <span>Task #${taskId}</span>
      `;
      return btn;
    }

    function injectPRCreateTaskButton() {
      const taskId = extractTaskIdFromPRCreatePage();
      const existingBtn = document.getElementById('mcg-create-pr-task-btn');

      if (!taskId) {
        if (existingBtn) existingBtn.remove();
        return false;
      }

      // Determine active target container
      const collapsedBranches = document.querySelector('.collapsed-branches');
      
      let changeBtn = null;
      if (!collapsedBranches) {
        changeBtn = document.querySelector('.branch-change, .show-hide-button, .compare-widget .change-button, #change-branches, .compare-widget button');
        if (!changeBtn) {
          const buttons = document.querySelectorAll('button, a.aui-button, .aui-button');
          for (const btn of buttons) {
            if (btn.textContent.trim().toLowerCase() === 'change') {
              changeBtn = btn;
              break;
            }
          }
        }
      }

      let bottomActions = null;
      if (!collapsedBranches && !changeBtn) {
        bottomActions = document.querySelector('form.create-pull-request .buttons, .buttons-container .buttons, form .buttons, .pull-request-create-actions');
      }

      const activeTarget = collapsedBranches || changeBtn || bottomActions;
      if (!activeTarget) return false;

      // If button already exists, update its properties and move it to the best available position if needed
      if (existingBtn) {
        const expectedHref = `https://bugs.mycloudgrocer.com/edit_bug.aspx?id=${taskId}`;
        if (existingBtn.getAttribute('href') !== expectedHref) {
          existingBtn.href = expectedHref;
          existingBtn.title = `Open task #${taskId} in Bug Tracker`;
          existingBtn.querySelector('span').textContent = `Task #${taskId}`;
        }

        if (collapsedBranches) {
          if (existingBtn.parentNode !== collapsedBranches) {
            existingBtn.style.marginLeft = '8px';
            existingBtn.style.marginRight = '0';
            collapsedBranches.appendChild(existingBtn);
            console.log(`[MCG Helper] Repositioned task button inside .collapsed-branches.`);
          }
        } else if (changeBtn) {
          if (changeBtn.nextElementSibling !== existingBtn) {
            existingBtn.style.marginLeft = '8px';
            existingBtn.style.marginRight = '0';
            changeBtn.parentNode.insertBefore(existingBtn, changeBtn.nextSibling);
            console.log(`[MCG Helper] Repositioned task button next to the Change button.`);
          }
        } else if (bottomActions) {
          const cancelBtn = bottomActions.querySelector('a.cancel, .cancel');
          if (cancelBtn) {
            if (cancelBtn.previousElementSibling !== existingBtn) {
              existingBtn.style.marginLeft = '0';
              existingBtn.style.marginRight = '8px';
              bottomActions.insertBefore(existingBtn, cancelBtn);
              console.log(`[MCG Helper] Repositioned task button next to bottom Cancel button.`);
            }
          } else {
            if (existingBtn.parentNode !== bottomActions) {
              existingBtn.style.marginLeft = '0';
              existingBtn.style.marginRight = '8px';
              bottomActions.appendChild(existingBtn);
              console.log(`[MCG Helper] Repositioned task button in bottom actions.`);
            }
          }
        }
        return true;
      }

      // If button doesn't exist, create it and inject it
      const taskBtn = createTaskButton(taskId);

      if (collapsedBranches) {
        taskBtn.style.marginLeft = '8px';
        taskBtn.style.marginRight = '0';
        collapsedBranches.appendChild(taskBtn);
        console.log(`[MCG Helper] Injected new task button inside .collapsed-branches.`);
      } else if (changeBtn) {
        taskBtn.style.marginLeft = '8px';
        taskBtn.style.marginRight = '0';
        changeBtn.parentNode.insertBefore(taskBtn, changeBtn.nextSibling);
        console.log(`[MCG Helper] Injected new task button next to the Change button.`);
      } else if (bottomActions) {
        taskBtn.style.marginLeft = '0';
        taskBtn.style.marginRight = '8px';
        const cancelBtn = bottomActions.querySelector('a.cancel, .cancel');
        if (cancelBtn) {
          bottomActions.insertBefore(taskBtn, cancelBtn);
        } else {
          bottomActions.appendChild(taskBtn);
        }
        console.log(`[MCG Helper] Injected new task button next to bottom Cancel button.`);
      }

      return true;
    }

    // Run instantly
    injectPRCreateTaskButton();

    // Set up reactive MutationObserver
    const observer = new MutationObserver(() => {
      injectPRCreateTaskButton();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

})();
