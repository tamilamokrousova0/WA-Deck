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
      // Language-independent heuristic: short lines containing a time pattern
      // are presence/status lines ("last seen ... 12:34") in any locale.
      if (/\\d{1,2}:\\d{2}/.test(text) && text.length <= 60) return true;
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

    // 1. Primary source of truth: header of the currently open chat.
    //    This is what the user sees at the top of the chat, so it is the
    //    contact they mean when they press "CRM". WhatsApp Web does not
    //    always set aria-selected on the sidebar item, so trusting sidebar
    //    state here could open CRM for the wrong contact (e.g. a contact
    //    with a new incoming message, whose row highlights brighter).
    // WA Web has renamed #main / data-testid attrs several times; try many
    // selectors and keep the first visible match so a layout refresh doesn't
    // silently fall back to sidebar heuristics.
    const pickVisible = (selector) => {
      for (const el of document.querySelectorAll(selector)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
      return null;
    };
    const header =
      pickVisible('#main header') ||
      pickVisible('div[data-testid="conversation-header"]') ||
      pickVisible('[data-testid="conversation-info-header"]') ||
      pickVisible('main header') ||
      pickVisible('div[role="main"] header') ||
      pickVisible('header._amid, header[class*="header"]') ||
      null;
    if (header) {
      // Strict: testid-based selectors WA Web uses for the chat title.
      const strictTitle = pickFromNodes(
        Array.from(
          header.querySelectorAll(
            '[data-testid="conversation-info-header-chat-title"], [data-testid="conversation-title"], [data-testid="conversation-header-name"]'
          )
        )
      );
      if (strictTitle) return strictTitle;

      // Language-independent heuristic: when the header holds several
      // [dir="auto"] lines, WA renders the contact NAME first and status
      // line(s) after it. Trust the order instead of locale word lists, so a
      // status in an unknown language can never be mistaken for the name.
      const dirAutoEls = Array.from(header.querySelectorAll('span[dir="auto"], div[dir="auto"]')).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (dirAutoEls.length >= 2) {
        const first = normalize(dirAutoEls[0].getAttribute('title') || dirAutoEls[0].textContent || '');
        if (
          first &&
          first.length < 80 &&
          !blockedTitles.has(first.toLowerCase()) &&
          !/(сведени.*профил|информац.*профил|profile\\s*info|contact\\s*info|информац.*контакт|данные\\s*контакта)/i.test(first) &&
          !/^\\d{1,2}:\\d{2}$/.test(first)
        ) return first;
      }

      // Try obvious name-bearing nodes inside the header.
      const headerTitle = pickFromNodes(
        Array.from(
          header.querySelectorAll(
            '[data-testid="conversation-info-header-chat-title"] span[title], [data-testid="conversation-info-header-chat-title"] span[dir="auto"], h1, h2, span[title], div[title], span[dir="auto"]'
          )
        )
      );
      if (headerTitle) return headerTitle;

      // Last-resort within the header: walk the visible innerText and take
      // the first non-status line. This handles DOM reshuffles where WA Web
      // renames / drops data-testid attributes we used to rely on.
      const headerText = String(header.innerText || header.textContent || '');
      for (const rawLine of headerText.split('\\n')) {
        const line = normalize(rawLine);
        if (!line || isStatusText(line)) continue;
        if (line.length >= 80) continue;
        return line;
      }
    }

    // 2. Fallback: selected sidebar item. Only trust strong WA Web
    //    attributes (aria-selected / aria-current) — the alpha heuristic is
    //    unreliable when multiple rows are highlighted (hover / unread /
    //    selected all share similar backgrounds).
    const sidebarItems = Array.from(
      document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]')
    );
    const isTrueAttr = (el, attr) =>
      String(el?.getAttribute?.(attr) || '').toLowerCase() === 'true' ||
      String(el?.getAttribute?.(attr) || '').toLowerCase() === 'page';
    const selectedSidebarItem =
      sidebarItems.find((item) =>
        isTrueAttr(item, 'aria-selected') ||
        isTrueAttr(item, 'aria-current') ||
        isTrueAttr(item.querySelector('[aria-selected]'), 'aria-selected') ||
        isTrueAttr(item.querySelector('[aria-current]'), 'aria-current')
      ) ||
      (() => {
        // As a last resort look for WA's internal "selected row" marker:
        // active chat has an outlined tab-indicator pseudo-child — we can
        // only probe that by checking whether the row contains a
        // :focus-visible descendant, OR whether its first button has
        // tabindex=-1 (inactive) vs 0 (active). Not reliable across builds,
        // so keep it disabled unless we discover a stable hook.
        return null;
      })();

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

    return '';
  })();`;
}

export { activeChatContactScript };
