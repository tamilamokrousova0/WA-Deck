function collectUnreadDetailsScript() {
  return `(() => {
    const normalize = (value) => String(value || '').replace(/\\u200e|\\u200f/g, '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
    const items = Array.from(
      document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]')
    );
    const result = [];
    for (const item of items) {
      let count = 0;

      /* Numbered badge (natural unread) */
      const badge = item.querySelector('[data-testid="icon-unread-count"], [aria-label*="unread"], [aria-label*="непрочит"]');
      if (badge) {
        const countText = normalize(badge.textContent || badge.getAttribute('aria-label') || '');
        const countMatch = countText.match(/(\\d+)/);
        count = countMatch ? (Number(countMatch[1]) || 1) : 0;
        /* Badge found but empty text = "marked as unread" dot */
        if (!count && !badge.textContent.trim()) count = 1;
      }

      /* "Marked as unread" green dot without number */
      if (!count) {
        const dot = item.querySelector(
          '[data-testid*="unread"]:not([data-testid="icon-unread-count"]), ' +
          'span[data-icon="unread-indicator"], ' +
          'span[data-icon="unread"]'
        );
        if (dot) count = 1;
      }

      if (!count) continue;

      const titleNode = item.querySelector('[data-testid="cell-frame-title"] span[title], [data-testid="conversation-list-item-title"] span[title]');
      const chatName = normalize(titleNode ? (titleNode.getAttribute('title') || titleNode.textContent) : '');

      const msgNode = item.querySelector('[data-testid="last-msg-status"] span[title], span.matched-text, [data-testid="cell-frame-secondary"] span[title]');
      let lastMsg = '';
      if (msgNode) {
        lastMsg = normalize(msgNode.getAttribute('title') || msgNode.textContent || '');
      }
      if (!lastMsg) {
        const secondary = item.querySelector('[data-testid="cell-frame-secondary"]');
        if (secondary) lastMsg = normalize(secondary.textContent || '');
      }
      if (lastMsg.length > 80) lastMsg = lastMsg.slice(0, 77) + '...';

      if (chatName) {
        result.push({ chatName, count, lastMsg });
      }
      if (result.length >= 20) break;
    }
    return result;
  })();`;
}
