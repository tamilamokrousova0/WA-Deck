function collectUnreadCountScript() {
  return `(() => {
    let total = 0;
    const items = Array.from(
      document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]')
    );
    for (const item of items) {
      /* 1. Numbered badge (natural unread) */
      const badge = item.querySelector('[data-testid="icon-unread-count"], [aria-label*="unread"], [aria-label*="непрочит"]');
      if (badge) {
        const text = String(badge.textContent || badge.getAttribute('aria-label') || '').trim();
        const m = text.match(/(\\d+)/);
        if (m) { total += Number(m[1]) || 1; continue; }
        /* Badge found but no number = marked-as-unread dot */
        if (!text) { total += 1; continue; }
      }

      /* 2. "Marked as unread" green dot — broad selector search */
      const dot = item.querySelector(
        '[data-testid*="unread"]:not([data-testid="icon-unread-count"]), ' +
        'span[data-icon="unread-indicator"], ' +
        'span[data-icon="unread"], ' +
        '[data-testid="unread-count"], ' +
        '[data-icon="unread-indicator"]'
      );
      if (dot) { total += 1; continue; }

      /* 3. Visual detection: small green circle in the chat row's right side.
         WhatsApp uses a small <span> with green background, ~10-12px, border-radius 50%. */
      const spans = item.querySelectorAll('span');
      let foundGreenDot = false;
      for (const span of spans) {
        if (span.children.length > 0) continue;
        if (span.textContent.trim()) continue;
        const rect = span.getBoundingClientRect();
        if (rect.width >= 6 && rect.width <= 18 && rect.height >= 6 && rect.height <= 18) {
          const style = window.getComputedStyle(span);
          const bg = style.backgroundColor || '';
          const br = parseFloat(style.borderRadius) || 0;
          /* Green-ish background and round shape */
          if (br >= 4 && bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const rgb = bg.match(/\\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = Number(rgb[0]), g = Number(rgb[1]), b = Number(rgb[2]);
              /* Green dot: g > r and g > b */
              if (g > 80 && g > r && g > b) {
                foundGreenDot = true;
                break;
              }
            }
          }
        }
      }
      if (foundGreenDot) { total += 1; continue; }
    }

    /* Fallback A: WhatsApp filter button "Непрочитанное N" / "Unread N" */
    if (!total) {
      const buttons = document.querySelectorAll('button, [role="button"], [role="tab"]');
      for (const btn of buttons) {
        const text = String(btn.textContent || '').trim();
        const m = text.match(/(?:Непрочитанное|Unread|Non lus?|Nicht gelesen|Ongelezen)\\s+(\\d+)/i);
        if (m) { total = Number(m[1]) || 0; break; }
      }
    }

    /* Fallback B: page title contains (N) */
    if (!total) {
      const title = String(document.title || '');
      const t = title.match(/\\((\\d+)\\)/);
      if (t) total = Number(t[1] || 0) || 0;
    }

    return total;
  })();`;
}
