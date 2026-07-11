/**
 * MCG Helper — Content Script for Staging sites
 * 
 * Handles quick actions like auto-login on staging storefronts.
 */

(function () {
  'use strict';

  // Safeguard: do not run on bug tracker or bitbucket
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'bugs.mycloudgrocer.com' || hostname === 'git.mycloudgrocer.com') {
    return;
  }

  const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');

  // 1. Auto-login handler
  if (pathname.startsWith('/login') || pathname.endsWith('/login')) {
    chrome.storage.local.get(['autoLogin'], (result) => {
      if (result && result.autoLogin) {
        const { username, password, timestamp } = result.autoLogin;
        // Verify the login request is fresh (made within last 30 seconds)
        if (Date.now() - timestamp < 30000) {
          performLogin(username, password);
        }
        // Clear the state immediately so it doesn't run on next reload
        chrome.storage.local.remove('autoLogin');
      }
    });
  }

  function setInputValue(input, value) {
    if (!input) return;
    input.value = value;
    // Dispatch events to trigger framework state updates (e.g. React)
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function performLogin(username, password) {
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
      console.warn('[MCG Helper] Login fields not found.');
      return;
    }

    setInputValue(emailInput, username);
    setInputValue(passwordInput, password);

    // Look for submit button
    let loginBtn = document.querySelector('.form-submit-btn[type="submit"]') ||
                   document.querySelector('button[type="submit"]');

    if (!loginBtn) {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a, [role="button"]'));
      loginBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase().trim();
        return text.includes('log in') || text === 'login' || text.includes('sign in') || text === 'signin';
      });
    }

    if (loginBtn) {
      const intId = setInterval(() => {
        console.log('int')
        loginBtn.click();

        if (!document.location.pathname.includes('/login') || document.querySelector('.login-text-field-wrapper > .login-error') !== null) {
          clearInterval(intId);
        }
      }, 15);
    } else {
      const form = emailInput.closest('form');
      if (form) {
        setTimeout(() => {
          form.submit();
        }, 150);
      } else {
        console.warn('[MCG Helper] Login button/form not found.');
      }
    }
  }

  function matchTabText(text, target) {
    const t = text.toLowerCase().trim().replace(/\s+/g, ' ');
    const g = target.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (g.includes('checkout inst')) {
      return t.includes('checkout inst');
    }
    
    return t === g || t.includes(g) || g.includes(t);
  }

  function selectLeftMenuTab(tabName) {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 60; // 6 seconds
      const interval = setInterval(() => {
        attempts++;
        
        let tabs = Array.from(document.querySelectorAll('.profile-admin-content button.MuiTab-root'));
      console.log('tabs', tabs)
        if (tabs.length === 0) {
          tabs = Array.from(document.querySelectorAll('button.MuiTab-root'));
        }

        if (tabs.length > 0) {
          const targetTab = tabs.find(btn => {
            const wrapper = btn.querySelector('span.MuiTab-wrapper');
            if (!wrapper) return false;
            const text = wrapper.textContent || '';
            return matchTabText(text, tabName);
          });

          if (targetTab) {
            clearInterval(interval);
            targetTab.click();
            resolve(true);
            return;
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  }

  function waitForPathAndClickTab(targetParentPath, tabName) {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    const interval = setInterval(async () => {
      attempts++;
      const currentPath = window.location.pathname.toLowerCase();
      
      console.log(`[MCG Helper] Waiting for path "${targetParentPath}" and tab "${tabName}". Current path: "${currentPath}"`);
      if (currentPath === targetParentPath || currentPath.startsWith(targetParentPath)) {
        clearInterval(interval);
        await selectLeftMenuTab(tabName);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`[MCG Helper] Timed out waiting for path "${targetParentPath}" and tab "${tabName}"`);
      }
    }, 100);
  }

  function openMenuAndClickParent(parentName, targetParentPath, tabName) {
    const userActionBtn = document.querySelector('#mcg-user-action-button');
    if (!userActionBtn) return;
    
    const initialDrawer = document.querySelector('.MuiDrawer-root .sidebar-content');
    if (!initialDrawer || window.getComputedStyle(initialDrawer).visibility === 'hidden') {
      userActionBtn.click();
    }
    
    let attempts = 0;
    const maxAttempts = 60; // 3 seconds max
    const interval = setInterval(() => {
      attempts++;
      
      const drawer = document.querySelector('.MuiDrawer-root');
      if (drawer) {
        const anchors = Array.from(drawer.querySelectorAll('a'));
        const targetPathNormalized = targetParentPath.toLowerCase().replace(/\/$/, '');
        
        let parentLink = anchors.find(a => {
          try {
            const path = a.pathname.toLowerCase().replace(/\/$/, '');
            return path === targetPathNormalized;
          } catch (e) {
            return false;
          }
        });
                         
        if (!parentLink) {
          parentLink = drawer.querySelector(`a.menu-button[href*="${targetParentPath}"]`) ||
                       drawer.querySelector(`a[href*="${targetParentPath}"]`);
        }
        
        if (!parentLink) {
          const links = Array.from(drawer.querySelectorAll('a, .menu-button, [role="button"]'));
          parentLink = links.find(l => {
            const text = (l.textContent || '').trim().toLowerCase();
            return text === parentName.toLowerCase() || text.includes(parentName.toLowerCase());
          });
        }
        
        if (parentLink) {
          clearInterval(interval);
          parentLink.click();
          waitForPathAndClickTab(targetParentPath, tabName);
          return;
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`[MCG Helper] Timed out waiting for drawer or parent link "${parentName}"`);
      }
    }, 50);
  }

  let loginMonitorInterval = null;
  function monitorLoginSuccess(callback) {
    if (loginMonitorInterval) {
      clearInterval(loginMonitorInterval);
    }
    
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max
    loginMonitorInterval = setInterval(() => {
      attempts++;
      
      const userActionBtn = document.querySelector('#mcg-user-action-button');
      if (userActionBtn) {
        clearInterval(loginMonitorInterval);
        loginMonitorInterval = null;
        if (callback) callback();
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(loginMonitorInterval);
        loginMonitorInterval = null;
      }
    }, 500);
  }

  async function handleLoginBeforeAction(callback) {
    await chrome.storage.local.set({
      autoLogin: {
        username: "nick@mycloudgrocer.com",
        password: "Password2!",
        timestamp: Date.now()
      }
    });

    const loginBtn = document.querySelector('#mcg-login-button');
    if (loginBtn) {
      loginBtn.click();
      
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds
      const interval = setInterval(() => {
        attempts++;
        const emailInput = document.querySelector('input[type="email"]') ||
                           document.querySelector('input[name="email" i]') ||
                           document.querySelector('input[id="email" i]') ||
                           document.querySelector('input[name="username" i]') ||
                           document.querySelector('input[id="username" i]');

        const passwordInput = document.querySelector('input[type="password"]') ||
                              document.querySelector('input[name="password" i]') ||
                              document.querySelector('input[id="password" i]');
                              
        if (emailInput && passwordInput) {
          clearInterval(interval);
          performLogin("nick@mycloudgrocer.com", "Password2!");
          monitorLoginSuccess(callback);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          monitorLoginSuccess(callback);
        }
      }, 100);
    }
  }

  async function runQuickAction(parent, tab) {
    const userActionBtn = document.querySelector('#mcg-user-action-button');
    if (!userActionBtn) {
      const loginBtn = document.querySelector('#mcg-login-button');
      if (loginBtn) {
        await handleLoginBeforeAction(() => runQuickAction(parent, tab));
      } else {
        if (window.location.pathname.toLowerCase().includes('/login')) {
          monitorLoginSuccess(() => runQuickAction(parent, tab));
          return;
        }
      }
      monitorLoginSuccess(() => runQuickAction(parent, tab));
      return;
    }

    const currentPath = window.location.pathname.toLowerCase();
    const targetParentPath = parent.toLowerCase() === 'admin' ? '/profile/admin' : '/profile/settings';

    if (currentPath.startsWith(targetParentPath)) {
      await selectLeftMenuTab(tab);
    } else {
      openMenuAndClickParent(parent, targetParentPath, tab);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'TRIGGER_QUICK_ACTION') {
      runQuickAction(message.parent, message.tab);
    }
  });
})();
