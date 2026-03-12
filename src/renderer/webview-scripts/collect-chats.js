function collectChatsFromSidebarScript() {
  return `(async () => {
    const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
    const looksLikeTime = (value) => /^\\d{1,2}:\\d{2}$/.test(value) || /^\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}$/.test(value);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];

      const takeTitles = () => {
        const set = new Set();
        const items = Array.from(
          document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"], #pane-side [aria-selected]')
        );
        for (const item of items) {
          const byTitle = Array.from(
            item.querySelectorAll(
              '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] div[title], [data-testid="conversation-list-item-title"] span[title]',
            ),
          )
            .map((node) => normalize(node.getAttribute('title') || ''))
            .find((text) => text && !looksLikeTime(text));
          if (byTitle) {
            set.add(byTitle);
            continue;
          }
          const byGenericTitle = Array.from(item.querySelectorAll('span[title], div[title]'))
            .map((node) => normalize(node.getAttribute('title') || ''))
            .find((text) => text && !looksLikeTime(text));
          if (byGenericTitle) {
            set.add(byGenericTitle);
            continue;
          }
          const lines = String(item.innerText || '')
            .split('\\n')
            .map((line) => normalize(line))
            .filter((line) => line && !looksLikeTime(line));
        if (lines[0]) set.add(lines[0]);
      }
      return set;
    };

    const out = new Set();
    pane.scrollTop = 0;
    await sleep(120);

    let idle = 0;
    for (let round = 0; round < 40 && idle < 3; round += 1) {
      for (const title of takeTitles()) out.add(title);
      const prev = pane.scrollTop;
      pane.scrollTop += Math.max(120, Math.floor(pane.clientHeight * 0.82));
      await sleep(110);
      if (pane.scrollTop === prev) idle += 1;
      else idle = 0;
    }

    pane.scrollTop = 0;
    await sleep(60);
    for (const title of takeTitles()) out.add(title);

    return Array.from(out).sort((a, b) => a.localeCompare(b));
  })();`;
}
