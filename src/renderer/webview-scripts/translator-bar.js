function translatorBarScript() {
  return `(() => {
    if (window.__waDeckTranslatorBound) return true;
    window.__waDeckTranslatorBound = true;

    // Clean up any stale bar/overlays from a prior init
    try {
      const staleBar = document.getElementById('__wadeck-translator-bar');
      if (staleBar) staleBar.remove();
      document.querySelectorAll('.__wadeck-tr-overlay').forEach((o) => o.remove());
    } catch {}

    const LANGS = [
      { code: 'auto', label: '🔍 Авто' },
      { code: 'ru', label: 'Русский' },
      { code: 'en', label: 'English' },
      { code: 'de', label: 'Deutsch' },
      { code: 'fr', label: 'Français' },
      { code: 'nl', label: 'Nederlands' },
      { code: 'it', label: 'Italiano' },
      { code: 'no', label: 'Norsk' },
      { code: 'sv', label: 'Svenska' },
    ];
    const TARGET_LANGS = LANGS.filter((l) => l.code !== 'auto');
    const INCOMING_TARGET = 'ru'; // fixed: incoming always auto → ru

    // In-moment state (global, session-only, not persisted, not per-contact)
    let bar = null;
    let autoTranslate = false;
    let outgoingFrom = 'auto';
    let outgoingTo = 'en';
    let dropdownOpen = null;
    let currentChatId = '';
    let barHiddenByUser = false;
    // Map with bounded size (500 entries) — prevents runaway memory on long
    // sessions while still de-duping translations for active scroll view.
    const TRANSLATED_CACHE_MAX = 500;
    let translatedCache = new Map();
    function rememberTranslated(node, value) {
      if (translatedCache.size >= TRANSLATED_CACHE_MAX) {
        const firstKey = translatedCache.keys().next().value;
        if (firstKey) translatedCache.delete(firstKey);
      }
      translatedCache.set(node, value);
    }

    function getChatId() {
      // Primary: standard WhatsApp chat header
      const selectors = [
        '#main header span[title]',
        '#main header [data-testid="conversation-header"] span[title]',
        '#main header [role="button"] span[title]',
        '#main header span[dir="auto"]',
        '#main header ._amig span',
        '#main header [data-testid="conversation-info-header"] span',
      ];
      for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (!el) continue;
        const val = String(el.getAttribute('title') || el.textContent || '').trim();
        if (val && val.length > 1 && !/^(online|last seen|typing|в сети|печатает|был)/i.test(val)) return val;
      }
      // Fallback: if #main exists, chat is open even if we can't read the name
      if (document.querySelector('#main footer')) return '__unknown_chat__';
      return '';
    }

    function getLangLabel(code) {
      const lang = LANGS.find((l) => l.code === code);
      return lang ? lang.label : code;
    }

    // ========== Bar ==========

    function createBar() {
      bar = document.createElement('div');
      bar.id = '__wadeck-translator-bar';
      bar.style.cssText = [
        'display:none',
        'align-items:center',
        'gap:10px',
        'padding:7px 14px',
        'background:#eff6e4',
        'border-bottom:1px solid #d8e4c6',
        'font-family:Avenir Next,Segoe UI,system-ui,sans-serif',
        'font-size:12.5px',
        'color:#1a2030',
        'position:relative',
        'z-index:50',
        'min-height:40px',
        'box-sizing:border-box',
        'transition:opacity 0.2s ease',
      ].join(';');

      const globe = document.createElement('span');
      globe.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>';
      globe.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-shrink:0;width:26px;height:26px;border-radius:50%;background:rgba(34,197,94,0.12);box-shadow:inset 0 0 0 1px rgba(34,197,94,0.25);';
      bar.appendChild(globe);

      // ── Incoming section ──
      bar.appendChild(createAutoToggle());

      // ── Separator ──
      const sep = document.createElement('span');
      sep.textContent = '·';
      sep.style.cssText = 'color:#9ca3af;flex-shrink:0;padding:0 2px;font-size:14px;';
      bar.appendChild(sep);

      // ── Outgoing section ──
      const fromBtn = createDropdownBtn('from');
      fromBtn.title = 'Язык исходного текста';
      bar.appendChild(fromBtn);

      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.style.cssText = 'color:#9ca3af;flex-shrink:0;font-size:13px;';
      bar.appendChild(arrow);

      const toBtn = createDropdownBtn('to');
      toBtn.title = 'Язык, на который переводить';
      bar.appendChild(toBtn);

      const spacer = document.createElement('span');
      spacer.style.flex = '1';
      bar.appendChild(spacer);

      const translateBtn = document.createElement('button');
      translateBtn.textContent = 'Перевести';
      translateBtn.title = 'Перевести выделенный текст в поле ввода';
      translateBtn.style.cssText = [
        'background:#22c55e',
        'color:#fff',
        'border:none',
        'border-radius:999px',
        'padding:6px 14px',
        'font-size:11.5px',
        'font-weight:600',
        'cursor:pointer',
        'flex-shrink:0',
        'transition:background 0.2s ease, transform 0.1s ease',
        'letter-spacing:0.01em',
        'box-shadow:0 2px 6px -2px rgba(34,197,94,0.4)',
      ].join(';');
      translateBtn.addEventListener('mouseenter', () => { translateBtn.style.background = '#16a34a'; });
      translateBtn.addEventListener('mouseleave', () => { translateBtn.style.background = '#22c55e'; });
      translateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        doTranslate();
      });
      bar.appendChild(translateBtn);

      const closeBtn = document.createElement('span');
      closeBtn.textContent = '✕';
      closeBtn.title = 'Скрыть панель переводчика';
      closeBtn.style.cssText = [
        'cursor:pointer',
        'padding:3px 7px',
        'margin-left:2px',
        'color:#6b7280',
        'font-size:13px',
        'line-height:1',
        'flex-shrink:0',
        'user-select:none',
        'border-radius:6px',
        'transition:all 0.15s',
      ].join(';');
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.color = '#1a2030';
        closeBtn.style.background = 'rgba(0,0,0,0.05)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.color = '#6b7280';
        closeBtn.style.background = 'transparent';
      });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        barHiddenByUser = true;
        hideBar();
      });
      bar.appendChild(closeBtn);

      return bar;
    }

    function createAutoToggle() {
      const wrap = document.createElement('div');
      wrap.className = '__wadeck-auto-toggle';
      wrap.title = 'Автоперевод входящих сообщений на русский';
      wrap.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:7px',
        'padding:5px 11px',
        'border-radius:999px',
        'border:1px solid rgba(0,0,0,0.08)',
        'background:rgba(255,255,255,0.5)',
        'cursor:pointer',
        'user-select:none',
        'font-size:11.5px',
        'font-weight:500',
        'color:#1a2030',
        'flex-shrink:0',
        'transition:all 0.15s',
      ].join(';');

      const track = document.createElement('span');
      track.style.cssText = [
        'width:24px',
        'height:13px',
        'background:#d1d5db',
        'border-radius:999px',
        'position:relative',
        'flex-shrink:0',
        'transition:background 0.15s',
      ].join(';');

      const knob = document.createElement('span');
      knob.style.cssText = [
        'width:11px',
        'height:11px',
        'border-radius:50%',
        'background:#ffffff',
        'position:absolute',
        'top:1px',
        'left:1px',
        'box-shadow:0 1px 2px rgba(0,0,0,0.2)',
        'transition:left 0.15s, background 0.15s',
      ].join(';');
      track.appendChild(knob);

      const labelEl = document.createElement('span');
      labelEl.textContent = 'Авто вх. → Русский';

      wrap.appendChild(track);
      wrap.appendChild(labelEl);

      function paint() {
        if (autoTranslate) {
          wrap.style.background = '#22c55e';
          wrap.style.borderColor = '#22c55e';
          wrap.style.color = '#ffffff';
          track.style.background = 'rgba(255,255,255,0.35)';
          knob.style.left = '12px';
          knob.style.background = '#ffffff';
          labelEl.textContent = 'Перевод активен';
        } else {
          wrap.style.background = 'rgba(255,255,255,0.5)';
          wrap.style.borderColor = 'rgba(0,0,0,0.08)';
          wrap.style.color = '#1a2030';
          track.style.background = '#d1d5db';
          knob.style.left = '1px';
          knob.style.background = '#ffffff';
          labelEl.textContent = 'Авто вх. → Русский';
        }
      }
      wrap.__paint = paint;
      paint();

      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        autoTranslate = !autoTranslate;
        paint();
        if (autoTranslate) {
          translatedCache = new Map();
          processAllVisibleIncoming();
        } else {
          clearAllOverlays();
          translatedCache = new Map();
        }
      });

      return wrap;
    }

    function createDropdownBtn(type) {
      const btn = document.createElement('div');
      btn.dataset.translatorDropdown = type;
      btn.style.cssText = [
        'background:rgba(255,255,255,0.6)',
        'border:1px solid rgba(0,0,0,0.08)',
        'border-radius:999px',
        'padding:5px 12px',
        'color:#1a2030',
        'font-size:11.5px',
        'font-weight:500',
        'min-width:64px',
        'text-align:center',
        'cursor:pointer',
        'position:relative',
        'user-select:none',
        'flex-shrink:0',
        'transition:background 0.15s ease, border-color 0.15s ease',
      ].join(';');
      btn.textContent = getLangLabel(type === 'from' ? outgoingFrom : outgoingTo);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(type);
      });
      return btn;
    }

    function toggleDropdown(type) {
      closeDropdowns();
      const isFrom = type === 'from';
      const list = isFrom ? LANGS : TARGET_LANGS;
      const current = isFrom ? outgoingFrom : outgoingTo;
      const btn = bar && bar.querySelector('[data-translator-dropdown="' + type + '"]');
      if (!btn) return;

      dropdownOpen = type;

      const dd = document.createElement('div');
      dd.className = '__wadeck-translator-dd';
      dd.style.cssText = [
        'position:absolute',
        'top:calc(100% + 4px)',
        'left:0',
        'background:#1a2030',
        'border:1px solid #2b313b',
        'border-radius:8px',
        'padding:4px',
        'z-index:100',
        'min-width:145px',
        'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
      ].join(';');

      list.forEach((lang) => {
        const item = document.createElement('div');
        item.textContent = lang.label;
        item.style.cssText = [
          'padding:7px 12px',
          'border-radius:5px',
          'cursor:pointer',
          'font-size:12.5px',
          'color:' + (lang.code === current ? '#3dd68c' : '#e5eaf0'),
          'font-weight:' + (lang.code === current ? '600' : '400'),
        ].join(';');
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.06)'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isFrom) outgoingFrom = lang.code;
          else outgoingTo = lang.code;
          btn.textContent = lang.label;
          closeDropdowns();
          // Outgoing dropdowns do NOT affect incoming overlays — they are
          // completely independent by design.
        });
        dd.appendChild(item);
      });

      btn.appendChild(dd);
    }

    function closeDropdowns() {
      dropdownOpen = null;
      const dds = bar ? bar.querySelectorAll('.__wadeck-translator-dd') : [];
      dds.forEach((d) => d.remove());
    }

    // ========== Composer helpers (for outgoing button) ==========

    function getComposer() {
      return (
        document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('footer div[contenteditable="true"][data-tab]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]')
      );
    }

    function getSelectedText() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return '';
      return sel.toString().trim();
    }

    function doTranslate() {
      const text = getSelectedText();
      if (!text) return;
      const payload = JSON.stringify({ text: text, from: outgoingFrom, to: outgoingTo });
      console.log('__WADECK_TRANSLATE__' + payload);
    }

    window.__waDeckInsertTranslation = function (translated) {
      if (!translated) return;
      const composer = getComposer();
      if (!composer) return;
      composer.focus();

      let inserted = false;
      try { inserted = document.execCommand('insertText', false, translated); } catch { inserted = false; }
      if (!inserted) {
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', translated);
          composer.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
        } catch {}
      }
    };

    // ========== Bar visibility ==========

    function showBar() {
      if (!bar || !bar.isConnected) return;
      if (bar.style.display === 'none') {
        bar.style.display = 'flex';
        bar.style.opacity = '0';
        requestAnimationFrame(() => { bar.style.opacity = '1'; });
      } else {
        bar.style.opacity = '1';
      }
    }

    function hideBar() {
      if (!bar || !bar.isConnected) return;
      if (bar.style.display !== 'none') {
        bar.style.opacity = '0';
        setTimeout(() => { if (bar && bar.isConnected) bar.style.display = 'none'; }, 150);
      }
    }

    document.addEventListener('click', () => {
      if (dropdownOpen) closeDropdowns();
    });

    // ========== Incoming auto-translate ==========

    function getIncomingBubbles(node) {
      const bubbles = [];
      if (!node || node.nodeType !== 1) return bubbles;
      if (node.matches && node.matches('.message-in')) bubbles.push(node);
      if (node.querySelectorAll) {
        const inner = node.querySelectorAll('.message-in');
        for (let i = 0; i < inner.length; i++) {
          if (bubbles.indexOf(inner[i]) === -1) bubbles.push(inner[i]);
        }
      }
      return bubbles;
    }

    function getBubbleContainer(row) {
      if (!row) return null;
      return row.querySelector('.copyable-text') || row;
    }

    function getMessageText(bubble) {
      if (!bubble) return '';
      const span = bubble.querySelector('span.selectable-text');
      const text = (span && span.innerText) ? span.innerText : (bubble.innerText || bubble.textContent || '');
      return String(text || '').trim();
    }

    function renderOverlay(row, translated) {
      if (!row || !row.isConnected || !translated) return;
      const target = getBubbleContainer(row);
      if (!target) return;

      const existing = target.querySelector(':scope > .__wadeck-tr-overlay');
      if (existing) existing.remove();

      const ov = document.createElement('div');
      ov.className = '__wadeck-tr-overlay';
      ov.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        'right:0',
        'min-height:100%',
        'background:rgba(24,30,43,0.96)',
        'border:1px solid rgba(45,140,240,0.55)',
        'border-radius:8px',
        'padding:24px 12px 10px 12px',
        'color:#e5eaf0',
        'font-size:13px',
        'line-height:1.4',
        'z-index:9999',
        'box-sizing:border-box',
        'pointer-events:auto',
        'box-shadow:0 2px 10px rgba(0,0,0,0.4)',
      ].join(';');

      const closeBtn = document.createElement('span');
      closeBtn.textContent = '✕';
      closeBtn.title = 'Скрыть перевод';
      closeBtn.style.cssText = [
        'position:absolute',
        'top:4px',
        'left:6px',
        'width:20px',
        'height:20px',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'border-radius:4px',
        'cursor:pointer',
        'color:#e5eaf0',
        'background:rgba(255,255,255,0.1)',
        'font-size:11px',
        'line-height:1',
        'user-select:none',
        'transition:background 0.15s',
      ].join(';');
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ov.remove();
        try { target.style.minHeight = ''; } catch {}
        const prev = translatedCache.get(row) || {};
        translatedCache.set(row, { state: 'dismissed', translated: prev.translated });
      });
      ov.appendChild(closeBtn);

      const metaEl = document.createElement('span');
      metaEl.textContent = 'auto → ru';
      metaEl.style.cssText = [
        'position:absolute',
        'top:7px',
        'right:10px',
        'font-size:10px',
        'color:#7e8ea0',
        'letter-spacing:0.02em',
      ].join(';');
      ov.appendChild(metaEl);

      const body = document.createElement('div');
      body.textContent = translated;
      body.style.cssText = 'white-space:pre-wrap;word-wrap:break-word;';
      ov.appendChild(body);

      const cs = getComputedStyle(target);
      if (cs.position === 'static') target.style.position = 'relative';
      target.style.isolation = 'isolate';

      target.appendChild(ov);

      // Растягиваем родительский пузырь под высоту перевода, чтобы он не
      // вылезал на следующее сообщение и не уходил под исходящие.
      try {
        target.style.minHeight = '';
        const h = ov.scrollHeight;
        if (h > 0) target.style.minHeight = h + 'px';
      } catch {}
    }

    function clearAllOverlays() {
      const overlays = document.querySelectorAll('.__wadeck-tr-overlay');
      for (let i = 0; i < overlays.length; i++) {
        const parent = overlays[i].parentElement;
        overlays[i].remove();
        try { if (parent) parent.style.minHeight = ''; } catch {}
      }
    }

    function requestMessageTranslate(text, from, to, onResult) {
      const reqId = Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
      window['__waDeckTrCb_' + reqId] = function (result) {
        try { onResult(result); } catch {}
        try { delete window['__waDeckTrCb_' + reqId]; } catch {}
      };
      const payload = JSON.stringify({ reqId: reqId, text: text, from: from, to: to });
      console.log('__WADECK_TRANSLATE_MSG__' + payload);
    }

    function hasOverlay(row) {
      const target = getBubbleContainer(row);
      return Boolean(target && target.querySelector(':scope > .__wadeck-tr-overlay'));
    }

    function processIncomingBubble(row) {
      if (!row || !row.isConnected) return;
      if (!autoTranslate) return;
      const entry = translatedCache.get(row);
      if (entry && entry.state === 'pending') return;
      if (entry && entry.state === 'failed') return;
      if (entry && entry.state === 'dismissed') return;
      // Already translated — restore overlay if WhatsApp re-rendered the bubble
      if (entry && entry.state === 'done' && entry.translated) {
        if (!hasOverlay(row)) renderOverlay(row, entry.translated);
        return;
      }
      const text = getMessageText(row);
      if (!text) return;
      translatedCache.set(row, { state: 'pending' });
      requestMessageTranslate(text, 'auto', INCOMING_TARGET, (result) => {
        if (!row.isConnected) return;
        if (!result || !result.ok || !result.translated) {
          translatedCache.set(row, { state: 'failed' });
          return;
        }
        translatedCache.set(row, { state: 'done', translated: result.translated });
        renderOverlay(row, result.translated);
      });
    }

    function processAllVisibleIncoming() {
      const rows = document.querySelectorAll('.message-in');
      for (let i = 0; i < rows.length; i++) processIncomingBubble(rows[i]);
    }

    // ========== Observer for chat messages ==========

    let chatObserver = null;
    let chatObserverRoot = null;
    let chatObserverPending = false;
    function bindChatObserver() {
      if (chatObserverPending) return;
      const root = document.querySelector('#main');
      if (!root) {
        chatObserverPending = true;
        setTimeout(() => {
          chatObserverPending = false;
          bindChatObserver();
        }, 2000);
        return;
      }
      if (chatObserverRoot === root && chatObserver) return;
      if (chatObserver) { try { chatObserver.disconnect(); } catch {} }
      chatObserverRoot = root;
      // Batch mutations: on heavy scroll / fast-typing WA fires hundreds of
      // mutations per second. Collect them and flush at most every 120ms.
      let pendingBubbles = new Set();
      let flushTimer = null;
      const flush = () => {
        flushTimer = null;
        if (!autoTranslate || pendingBubbles.size === 0) { pendingBubbles.clear(); return; }
        const batch = Array.from(pendingBubbles);
        pendingBubbles.clear();
        for (let i = 0; i < batch.length; i++) processIncomingBubble(batch[i]);
      };
      chatObserver = new MutationObserver((mutations) => {
        if (!autoTranslate) return;
        for (let i = 0; i < mutations.length; i++) {
          const added = mutations[i].addedNodes;
          for (let j = 0; j < added.length; j++) {
            const bubbles = getIncomingBubbles(added[j]);
            for (let k = 0; k < bubbles.length; k++) pendingBubbles.add(bubbles[k]);
          }
        }
        if (!flushTimer) flushTimer = setTimeout(flush, 120);
      });
      chatObserver.observe(root, { childList: true, subtree: true });
    }

    // ========== Bar lifecycle ==========

    function ensureBarInjected() {
      if (bar && bar.isConnected) return true;
      const existing = document.getElementById('__wadeck-translator-bar');
      if (existing) existing.remove();
      bar = null;
      const footer = document.querySelector('footer');
      if (!footer || !footer.parentElement) return false;
      createBar();
      footer.parentElement.insertBefore(bar, footer);
      return true;
    }

    let chatEmptyTicks = 0;
    let sweepCounter = 0;

    function tick() {
      const next = getChatId();
      const chatChanged = next && next !== currentChatId;

      if (next) chatEmptyTicks = 0;
      else chatEmptyTicks++;

      if (chatChanged) {
        currentChatId = next;
        barHiddenByUser = false;
        // Clear translation cache and overlays when switching chats
        translatedCache = new Map();
        clearAllOverlays();
      }

      if (!next) {
        if (chatEmptyTicks >= 5) {
          currentChatId = '';
          if (bar && bar.isConnected && bar.style.display !== 'none') hideBar();
        }
        return;
      }

      const injected = ensureBarInjected();
      if (injected) {
        if (!barHiddenByUser) showBar();
        if (chatChanged && autoTranslate) processAllVisibleIncoming();
      }

      // Sweep for detached overlays every 3 ticks (3s) instead of every tick
      sweepCounter++;
      if (autoTranslate && sweepCounter >= 3) {
        sweepCounter = 0;
        processAllVisibleIncoming();
      }

      if (chatObserverRoot && !chatObserverRoot.isConnected) {
        chatObserverRoot = null;
        if (chatObserver) { try { chatObserver.disconnect(); } catch {} chatObserver = null; }
      }
      if (!chatObserverRoot && !chatObserverPending) {
        bindChatObserver();
      }
    }

    function loopTick() {
      // Global kill-switch set by renderer: tear down bar + overlays and stay dormant.
      // Keep the loop alive so re-enabling (flag cleared + script reinject) takes effect.
      if (window.__waDeckTranslatorDisabled === true) {
        try {
          const staleBar = document.getElementById('__wadeck-translator-bar');
          if (staleBar) staleBar.remove();
          document.querySelectorAll('.__wadeck-tr-overlay').forEach((o) => o.remove());
          bar = null;
          currentChatId = '';
        } catch {}
        setTimeout(loopTick, 1000);
        return;
      }
      try { tick(); } catch (e) { console.warn('[WA-Deck translator] tick error:', e); }
      setTimeout(loopTick, 1000);
    }

    // Init
    loopTick();

    return true;
  })();`;
}
