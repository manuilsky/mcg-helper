/**
 * MCG Helper — Redirect script
 * 
 * Auto-redirects from the root path of the bug tracker to the login page.
 */

(function () {
  'use strict';

  // Safeguard: only redirect if path is root or default.aspx
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === '/' || pathname === '' || pathname === '/default.aspx') {
    window.location.replace('https://bugs.mycloudgrocer.com/login_form.aspx' + window.location.search);
  }
})();
