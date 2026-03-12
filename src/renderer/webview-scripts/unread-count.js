function collectUnreadCountScript() {
  return `(() => {
    let total = 0;
    const items = Array.from(
      document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]')
    );
    for (const item of items) {
      /* Numbered badge (natural unread) */
      const badge = item.querySelector('[data-testid="icon-unread-count"], [aria-label*="unread"], [aria-label*="непрочит"]');
      if (badge) {
        const text = String(badge.textContent || badge.getAttribute('aria-label') || '').trim();
        const m = text.match(/(\\d+)/);
        if (m) { total += Number(m[1]) || 1; continue; }
      }

      /* "Marked as unread" green dot — no number, just a visual marker.
         WhatsApp renders it as a small colored circle/span inside the chat row.
         Possible selectors: data-testid containing "unread", or the dot badge without digits. */
      const dot = item.querySelector(
        '[data-testid*="unread"]:not([data-testid="icon-unread-count"]), ' +
        'span[data-icon="unread-indicator"], ' +
        'span[data-icon="unread"]'
      );
      if (dot) { total += 1; continue; }

      /* Fallback: any small green badge-like circle that WhatsApp uses as unread marker.
         Check for a badge element with specific styling inside the row's badge area. */
      if (badge && !badge.textContent.trim()) {
        total += 1;
        continue;
      }
    }

    /* Final fallback: page title contains (N) */
    if (!total) {
      const title = String(document.title || '');
      const t = title.match(/\\((\\d+)\\)/);
      if (t) total = Number(t[1] || 0) || 0;
    }

    return total;
  })();`;
}
