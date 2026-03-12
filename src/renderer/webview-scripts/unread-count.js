function collectUnreadCountScript() {
  return `(() => {
    const badges = Array.from(document.querySelectorAll('#pane-side [aria-label*="непрочит"], #pane-side [aria-label*="unread"], #pane-side [data-testid="icon-unread-count"]'));
    let total = 0;
    for (const badge of badges) {
      const text = String(badge.textContent || badge.getAttribute('aria-label') || '').trim();
      const match = text.match(/(\\d+)/);
      if (match) total += Number(match[1] || 0) || 0;
    }

    if (!total) {
      const title = String(document.title || '');
      const t = title.match(/\\((\\d+)\\)/);
      if (t) total = Number(t[1] || 0) || 0;
    }

    return total;
  })();`;
}
