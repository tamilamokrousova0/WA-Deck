function collectUnreadCountScript() {
  return `(() => {
    let total = 0;

    /* 1. Page title "(N)" — most reliable, WhatsApp always updates it */
    const title = String(document.title || '');
    const titleMatch = title.match(/\\((\\d+)\\)/);
    if (titleMatch) {
      total = Number(titleMatch[1] || 0) || 0;
    }

    /* 2. WhatsApp filter button: "Непрочитанное N" / "Unread N" etc.
       Shows the count of unread CHATS (not messages). */
    if (!total) {
      const allEls = document.querySelectorAll('header button, header [role="button"], [role="tab"], [data-tab], #app button, .two > div:first-child button');
      for (const el of allEls) {
        if (el.children.length > 2) continue;
        const t = String(el.textContent || '').trim();
        if (t.length > 40) continue;
        const m = t.match(/(?:Непрочитанное|Непрочитанных|Unread|Non lus?|Nicht gelesen|Ongelezen)\\s*(\\d+)/i);
        if (m) { total = Number(m[1]) || 0; break; }
      }
    }

    return total;
  })();`;
}
