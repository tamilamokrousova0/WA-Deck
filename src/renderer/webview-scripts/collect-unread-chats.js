/* Unified inbox scan: rendered chat-list rows (#pane-side) that carry an
   unread badge — NO scrolling, WhatsApp floats unread chats to the top of
   the list, so a quick pass over rendered rows is enough and never disturbs
   the user. Returns an array of { name, preview, count } directly (no
   console markers). */
function collectUnreadChatsScript() {
  return `(() => {
    const norm = (v) => String(v || '').replace(/\\u200e|\\u200f/g, '').replace(/\\s+/g, ' ').trim();
    const looksLikeTime = (v) =>
      /^\\d{1,2}:\\d{2}$/.test(v) ||
      /^\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}$/.test(v) ||
      /^(вчера|сегодня|yesterday|today)$/i.test(v);
    const UNREAD_RE = /(непрочит|unread|non lus|nicht gelesen|ongelezen|non lett|no le[ií]d)/i;
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];
    const rows = Array.from(pane.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]'));
    const out = [];
    for (const item of rows) {
      /* unread badge: localized aria-label first, bare numeric badge fallback */
      let hasBadge = false;
      let count = 0;
      const labeled = item.querySelectorAll('[aria-label]');
      for (const el of labeled) {
        const al = el.getAttribute('aria-label') || '';
        if (UNREAD_RE.test(al)) {
          hasBadge = true;
          const m = al.match(/(\\d+)/);
          if (m) count = Math.max(count, parseInt(m[1], 10) || 0);
        }
      }
      if (!hasBadge) {
        for (const el of labeled) {
          const al = (el.getAttribute('aria-label') || '').trim();
          if (/^\\d{1,3}$/.test(al) && el.children.length === 0) {
            hasBadge = true;
            count = Math.max(count, parseInt(al, 10) || 0);
          }
        }
      }
      if (!hasBadge) continue;
      count = Math.max(1, count);

      /* chat name: span[title] inside the title cell, then any [title],
         then the first non-time line of the row text */
      let name = Array.from(item.querySelectorAll('[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] div[title], [data-testid="conversation-list-item-title"] span[title]'))
        .map((n) => norm(n.getAttribute('title') || ''))
        .find((t) => t && !looksLikeTime(t));
      if (!name) {
        name = Array.from(item.querySelectorAll('span[title], div[title]'))
          .map((n) => norm(n.getAttribute('title') || ''))
          .find((t) => t && !looksLikeTime(t));
      }
      const lines = String(item.innerText || '').split('\\n').map(norm).filter(Boolean);
      if (!name) name = lines.find((l) => !looksLikeTime(l)) || '';
      if (!name) continue;

      /* preview: the secondary text row (last message) — first line that is
         not the title, not a timestamp and not the bare badge counter */
      let preview = '';
      for (const line of lines) {
        if (line === name) continue;
        if (looksLikeTime(line)) continue;
        if (/^\\d{1,4}$/.test(line)) continue;
        preview = line;
        break;
      }
      if (preview.length > 80) preview = preview.slice(0, 80);

      out.push({ name, preview, count });
    }
    return out;
  })();`;
}

export { collectUnreadChatsScript };
