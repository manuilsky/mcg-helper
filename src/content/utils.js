/**
 * MCG Helper — Utility functions
 */

const MCGUtils = {
  /**
   * Check if current page is a single bug/task page.
   * Bug pages typically have URL like: edit_bug.aspx?id=XXXX
   */
  isTaskPage() {
    return /edit_bug\.aspx/i.test(window.location.pathname);
  },

  /**
   * Check if current page is the bug list page.
   */
  isBugListPage() {
    return /bugs\.aspx/i.test(window.location.pathname);
  },

  /**
   * Extract the bug/task ID from the current page URL.
   * @returns {string|null} The task ID, or null if not on a task page.
   */
  getTaskId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || null;
  },

  /**
   * Extract the task description/title from the page.
   * BugTracker.NET usually has the short_desc field.
   * @returns {string} The task description or empty string.
   */
  getTaskDescription() {
    // Try common selectors for BugTracker.NET task title
    const shortDesc = document.querySelector('[id$="short_desc"]');
    if (shortDesc) {
      return shortDesc.value || shortDesc.textContent || '';
    }

    // Fallback: try the page title
    const title = document.title || '';
    return title.replace(/^.*?-\s*/, '').trim();
  },

  /**
   * Copy text to clipboard and return a promise.
   * @param {string} text
   * @returns {Promise<void>}
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / restricted contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   * @param {number} duration — ms
   * @param {'right'|'left'} position
   */
  showToast(message, type = 'success', duration = 2000, position = 'right') {
    // Remove any existing toast
    const existing = document.querySelector('.mcg-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mcg-toast';
    if (type === 'error') toast.classList.add('mcg-toast--error');
    if (type === 'info') toast.classList.add('mcg-toast--info');
    if (position === 'left') toast.classList.add('mcg-toast--left');
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('mcg-toast--visible');
    });

    setTimeout(() => {
      toast.classList.remove('mcg-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Create an SVG icon element from an SVG string.
   * @param {string} svgMarkup — inner SVG content (path, etc.)
   * @param {number} size
   * @returns {SVGSVGElement}
   */
  createSVGIcon(svgMarkup, size = 16) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">${svgMarkup}</svg>`;
    return wrapper.firstElementChild;
  }
};
