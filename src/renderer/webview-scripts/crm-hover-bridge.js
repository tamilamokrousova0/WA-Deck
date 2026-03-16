function crmHoverBridgeScript() {
  return `(() => {
    if (window.__waDeckCrmHoverBound) return true;
    window.__waDeckCrmHoverBound = true;

    const normalize = (value) =>
      String(value || '')
        .replace(/\\u200e|\\u200f/g, '')
        .replace(/\\u00a0/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();

    const isStatusText = (text) => {
      if (!text) return true;
      const t = text.toLowerCase();
      if (/^(online|в сети|typing|печатает|recording|записывает|tap here|нажмите)/i.test(t)) return true;
      if (/^(last seen|seen |был|была|сегодня в|вчера в)/i.test(t)) return true;
      if (/^\\d{1,2}:\\d{2}$/.test(t)) return true;
      return false;
    };

    const getContactName = (item) => {
      if (!item) return '';
      const titleEls = item.querySelectorAll(
        'span[title], [data-testid="cell-frame-title"] span, [dir="auto"]'
      );
      for (const el of titleEls) {
        const text = normalize(el.getAttribute('title') || el.textContent || '');
        if (text && !isStatusText(text) && text.length < 80) return text;
      }
      return '';
    };

    let hoverTimer = null;
    let lastSentName = '';
    let hideTimer = null;

    const paneSelector = '#pane-side';

    function sendHide() {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      if (lastSentName) {
        lastSentName = '';
        console.log('__WADECK_CRM_HOVER__' + JSON.stringify({ type: 'hide' }));
      }
    }

    document.addEventListener('mouseover', (event) => {
      const pane = document.querySelector(paneSelector);
      if (!pane || !pane.contains(event.target)) {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => sendHide(), 150);
        return;
      }

      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

      const item = event.target.closest('[role="listitem"], [data-testid="cell-frame-container"], [tabindex]');
      if (!item || !pane.contains(item)) {
        // Inside pane but not on a contact row — start hide
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => sendHide(), 150);
        return;
      }

      const contactName = getContactName(item);
      if (!contactName || contactName === lastSentName) return;

      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        lastSentName = contactName;
        const rect = item.getBoundingClientRect();
        console.log('__WADECK_CRM_HOVER__' + JSON.stringify({
          type: 'show',
          contactName,
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        }));
      }, 350);
    }, true);

    document.addEventListener('mouseout', (event) => {
      const pane = document.querySelector(paneSelector);
      if (!pane) return;
      // If mouse left the pane entirely, hide immediately
      const related = event.relatedTarget;
      if (!related || !pane.contains(related)) {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => sendHide(), 100);
      }
    }, true);

    return true;
  })();`;
}
