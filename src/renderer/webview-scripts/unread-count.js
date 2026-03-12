function collectUnreadCountScript() {
  return `(() => {
    let total = 0;

    /* 1. Standard numbered badges in chat list */
    const badges = document.querySelectorAll(
      '#pane-side [data-testid="icon-unread-count"], ' +
      '#pane-side [aria-label*="unread"], ' +
      '#pane-side [aria-label*="непрочит"]'
    );
    for (const badge of badges) {
      const text = String(badge.textContent || badge.getAttribute('aria-label') || '').trim();
      const m = text.match(/(\\d+)/);
      if (m) {
        total += Number(m[1]) || 1;
      } else if (!text) {
        /* Empty badge = marked-as-unread indicator */
        total += 1;
      }
    }

    /* 2. WhatsApp filter button: "Непрочитанное N" / "Unread N" etc.
       This is the MOST reliable source for mark-as-unread detection,
       because WhatsApp itself counts them and shows in the filter. */
    if (!total) {
      const allEls = document.querySelectorAll('button, [role="button"], [role="tab"], [role="option"], span, div');
      for (const el of allEls) {
        if (el.children.length > 2) continue;
        const t = String(el.textContent || '').trim();
        if (t.length > 40) continue;
        const m = t.match(/(?:Непрочитанное|Непрочитанных|Unread|Non lus?|Nicht gelesen|Ongelezen)\\s*(\\d+)/i);
        if (m) { total = Number(m[1]) || 0; break; }
      }
    }

    /* 3. Page title fallback: "(N)" */
    if (!total) {
      const title = String(document.title || '');
      const t = title.match(/\\((\\d+)\\)/);
      if (t) total = Number(t[1] || 0) || 0;
    }

    return total;
  })();`;
}
