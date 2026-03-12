function activeChatContactScript() {
  return `(() => {
    const normalize = (value) =>
      String(value || '')
        .replace(/\\u200e|\\u200f/g, '')
        .replace(/\\u00a0/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();

    const blockedTitles = new Set([
      'сведения профиля',
      'информация профиля',
      'профиль',
      'profile info',
      'profile',
      'contact info',
      'информация о контакте',
      'сведения о контакте',
      'данные контакта',
    ]);

    const isStatusText = (value) => {
      const text = normalize(value).toLowerCase();
      if (!text) return true;
      if (blockedTitles.has(text)) return true;
      if (/(сведени.*профил|информац.*профил|profile\\s*info|contact\\s*info|информац.*контакт|данные\\s*контакта)/i.test(text)) return true;
      if (/^(online|в сети|typing|печатает|recording audio|записывает аудио|tap here|нажмите сюда)/i.test(text)) return true;
      if (/^(last seen|seen |был|была|был\\(-а\\)|был\\(а\\)|сегодня в|вчера в)/i.test(text)) return true;
      if (/^\\d{1,2}:\\d{2}$/.test(text)) return true;
      return false;
    };

    const pickFromNodes = (nodes) => {
      for (const node of nodes) {
        const text = normalize(node?.getAttribute?.('title') || node?.textContent || '');
        if (!text || isStatusText(text)) continue;
        return text;
      }
      return '';
    };

    const sidebarItems = Array.from(
      document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]')
    );

    const alphaFromBg = (bg) => {
      const value = String(bg || '').trim().toLowerCase();
      if (!value || value === 'transparent') return 0;
      const rgba = value.match(/^rgba\\(([^)]+)\\)$/i);
      if (rgba) {
        const parts = rgba[1].split(',').map((part) => Number(String(part).trim()));
        return Number.isFinite(parts[3]) ? parts[3] : 1;
      }
      const rgb = value.match(/^rgb\\(([^)]+)\\)$/i);
      if (rgb) return 1;
      if (value.startsWith('#')) return 1;
      return 0;
    };

    const selectedSidebarItem =
      sidebarItems.find((item) => String(item.getAttribute('aria-selected') || '').toLowerCase() === 'true') ||
      sidebarItems
        .map((item) => ({
          item,
          alpha: alphaFromBg(window.getComputedStyle(item).backgroundColor),
        }))
        .filter((row) => row.alpha > 0.01)
        .sort((a, b) => b.alpha - a.alpha)
        .map((row) => row.item)[0] ||
      null;

    if (selectedSidebarItem) {
      const selectedSidebarTitle = pickFromNodes(
        Array.from(
          selectedSidebarItem.querySelectorAll(
            'span[title], div[title], [dir="auto"], [data-testid="cell-frame-title"]'
          )
        )
      );
      if (selectedSidebarTitle) return selectedSidebarTitle;

      const firstLine = String(selectedSidebarItem.innerText || '')
        .split('\\n')
        .map((line) => normalize(line))
        .find((line) => line && !isStatusText(line));
      if (firstLine) return firstLine;
    }

    const header = document.querySelector('#main header');
    if (header) {
      const strictTitle = pickFromNodes(
        Array.from(
          header.querySelectorAll(
            '[data-testid="conversation-info-header-chat-title"], [data-testid="conversation-title"], [data-testid="conversation-header-name"]'
          )
        )
      );
      if (strictTitle) return strictTitle;

      const headerTitle = pickFromNodes(
        Array.from(
          header.querySelectorAll(
            '[data-testid="conversation-info-header-chat-title"] span[title], [data-testid="conversation-info-header-chat-title"] span[dir="auto"], h1, h2, span[title], div[title], span[dir="auto"]'
          )
        )
      );
      if (headerTitle) return headerTitle;
    }

    return '';
  })();`;
}
