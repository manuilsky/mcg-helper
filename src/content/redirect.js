/**
 * MCG Helper — Redirect script
 * 
 * Auto-redirects from the root path of the bug tracker to the login page.
 */

(function () {
  'use strict';

  // Safeguard: only redirect if path is exactly '/' or empty
  if (window.location.pathname === '/' || window.location.pathname === '') {
    window.location.replace('https://bugs.mycloudgrocer.com/login_form.aspx');
  }
})();
