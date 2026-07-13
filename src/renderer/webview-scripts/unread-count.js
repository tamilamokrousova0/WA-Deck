function collectUnreadCountScript() {
  return `(() => {
    /* -1 means "could not determine" — the host keeps the previous value.
       An honest 0 is returned only when we are confident (see below). */
    let total = -1;

    /* 1. Page title "(N)" — most reliable, WhatsApp always updates it */
    const title = String(document.title || '');
    const titleMatch = title.match(/\\((\\d+)\\)/);
    if (titleMatch) {
      total = Number(titleMatch[1] || 0) || 0;
    }

    /* 2. WhatsApp filter button: "Непрочитанное N" / "Unread N" etc.
       Shows the count of unread CHATS (not messages). */
    if (total < 0) {
      const allEls = document.querySelectorAll('header button, header [role="button"], [role="tab"], [data-tab], #app button, .two > div:first-child button');
      for (const el of allEls) {
        if (el.children.length > 2) continue;
        const t = String(el.textContent || '').trim();
        if (t.length > 40) continue;
        const m = t.match(/(?:Непрочитанное|Непрочитанных|Непрочитані|Unread|Non lus?|Nicht gelesen|Ungelesen|Ongelezen|No le[ií]das?|Sin leer|Não lidas?|Non lette?|Por ler)\\s*(\\d+)/i);
        if (m) { total = Number(m[1]) || 0; break; }
      }
    }

    /* 3. Fallback: sum unread badges via aria-labels on chat-list rows
       ("3 unread messages" / "3 непрочитанных сообщения" / ...). */
    if (total < 0) {
      let badgeTotal = 0;
      let found = false;
      const labeled = document.querySelectorAll('#pane-side [aria-label]');
      for (const el of labeled) {
        const label = String(el.getAttribute('aria-label') || '');
        const m = label.match(/(\\d+)\\s*(?:unread|непрочитан|ungelesen|nicht gelesen|ongelezen|no le[ií]da|sin leer|não lida|non lett|por ler)/i);
        if (m) { badgeTotal += Number(m[1]) || 0; found = true; }
      }
      if (found) total = badgeTotal;
    }

    /* Honest zero only when the chat list is actually rendered and the title
       carries no "(N)" counter; otherwise report -1 so the host does not
       flash a false 0 while the page is still loading. */
    if (total < 0) {
      const pane = document.querySelector('#pane-side');
      const hasRows = !!(pane && pane.querySelector('[role="listitem"], [data-testid="cell-frame-container"]'));
      if (hasRows && !/\\(\\d+\\)/.test(title)) total = 0;
    }

    return total;
  })();`;
}

export { collectUnreadCountScript };
