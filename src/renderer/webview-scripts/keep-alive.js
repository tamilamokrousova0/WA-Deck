/**
 * Injected into each WhatsApp webview on dom-ready to prevent the account
 * from "freezing" after 5-10 minutes when it's not the active account.
 *
 * The CSS-level fix (visibility:hidden instead of display:none in styles.css)
 * already keeps Chromium reporting the inner page as visible. This script is
 * belt-and-suspenders: it locks the Page Visibility API to always say
 * "visible", so even if WhatsApp reads `document.hidden` after some future
 * Chromium change flips it back to hidden for stacked-invisible webviews,
 * WA's own pause logic won't trigger.
 *
 * Must run before WhatsApp's main bundle grabs a reference to the original
 * property descriptors — dom-ready is early enough in practice because WA
 * only reads visibilityState reactively (on visibilitychange events), not
 * during script parse.
 */
function keepAliveScript() {
  return `(() => {
    if (window.__waDeckKeepAliveBound) return true;
    window.__waDeckKeepAliveBound = true;

    // Lock visibilityState / hidden to "visible" / false. Use configurable:true
    // so we can re-define on hot-reload without crashing.
    const lockVisible = (obj, prop, value) => {
      try {
        Object.defineProperty(obj, prop, {
          configurable: true,
          get: () => value,
        });
      } catch (e) {
        /* non-fatal: some locked-down pages may have frozen the descriptor */
      }
    };
    lockVisible(document, 'visibilityState', 'visible');
    lockVisible(document, 'hidden', false);
    lockVisible(document, 'webkitVisibilityState', 'visible');
    lockVisible(document, 'webkitHidden', false);

    // Swallow any 'visibilitychange' events that sneak through — WhatsApp
    // listens for them to trigger its own heartbeat-pause path. We only
    // stop propagation for events that claim the page is NOT visible.
    const swallow = (e) => {
      try {
        if (document.visibilityState !== 'visible') {
          e.stopImmediatePropagation();
        }
      } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', swallow, { capture: true });
    document.addEventListener('webkitvisibilitychange', swallow, { capture: true });

    return true;
  })();`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { keepAliveScript };
}
