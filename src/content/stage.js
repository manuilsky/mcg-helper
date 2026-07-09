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
  if (pathname === '/login') {
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
    let loginBtn = document.querySelector('button[type="submit"]') ||
                   document.querySelector('input[type="submit"]');

    if (!loginBtn) {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a, [role="button"]'));
      loginBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase().trim();
        return text.includes('log in') || text === 'login' || text.includes('sign in') || text === 'signin';
      });
    }

    if (loginBtn) {
      setTimeout(() => {
        loginBtn.click();
      }, 150);
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
})();
