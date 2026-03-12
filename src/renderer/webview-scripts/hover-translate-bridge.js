function hoverTranslateBridgeScript(defaultTargetLang = 'RU') {
  const safeDefaultTarget = WaDeckTranslateModule.normalizeTranslateTargetLang(defaultTargetLang);
  return `(() => {
    if (window.__waDeckHoverTranslateBound) return true;
    window.__waDeckHoverTranslateBound = true;
    window.__waDeckHoverTranslateTargetLang = '${safeDefaultTarget}';

    const normalize = typeof window.__waDeckNormalizeText === 'function'
      ? window.__waDeckNormalizeText
      : ((value) => String(value || '').replace(/\\u200e|\\u200f/g, '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim());
    const extractMessage = typeof window.__waDeckExtractMessageFromRow === 'function'
      ? window.__waDeckExtractMessageFromRow
      : ((row) => normalize(row?.innerText || ''));

    if (!document.getElementById('waDeckHoverTranslateStyle')) {
      const style = document.createElement('style');
      style.id = 'waDeckHoverTranslateStyle';
      style.textContent = \`
        .waDeck-hover-translate-btn {
          position: fixed;
          z-index: 2147483643;
          border: 1px solid rgba(70, 120, 180, 0.6);
          border-radius: 8px;
          background: rgba(14, 33, 57, 0.92);
          color: #c8ddff;
          font: 600 11px/1 "Segoe UI", sans-serif;
          padding: 5px 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .waDeck-hover-translate-btn:hover { opacity: 1; }
        .waDeck-hover-translate-btn.is-loading { opacity: 0.5; cursor: progress; }
        .waDeck-hover-translate-popover {
          position: fixed;
          z-index: 2147483642;
          width: min(332px, calc(100vw - 28px));
          max-height: calc(100vh - 36px);
          overflow: auto;
          border: 1px solid rgba(70, 120, 180, 0.72);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(8, 22, 39, 0.82), rgba(6, 18, 31, 0.88));
          color: #eff6ff;
          box-shadow: 0 18px 32px rgba(0,0,0,0.42);
          padding: 10px 12px 12px;
          backdrop-filter: blur(18px) saturate(120%);
          -webkit-backdrop-filter: blur(18px) saturate(120%);
        }
        .waDeck-hover-translate-popover.hidden { display: none; }
        .waDeck-hover-translate-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }
        .waDeck-hover-translate-meta {
          font: 600 11px/1.25 "Segoe UI", sans-serif;
          color: #94b7dd;
        }
        .waDeck-hover-translate-actions {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }
        .waDeck-hover-translate-close {
          border: 1px solid rgba(79, 121, 172, 0.82);
          background: rgba(10, 23, 40, 0.9);
          color: #dfeeff;
          border-radius: 999px;
          width: 22px;
          height: 22px;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
          font: 700 12px/1 "Segoe UI", sans-serif;
        }
        .waDeck-hover-translate-text {
          font: 500 13px/1.45 "Segoe UI", sans-serif;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .waDeck-hover-translate-error .waDeck-hover-translate-text { color: #ffb8c7; }
      \`;
      document.head.appendChild(style);
    }

    let button = document.querySelector('.waDeck-hover-translate-btn');
    if (!button) {
      button = document.createElement('button');
      button.className = 'waDeck-hover-translate-btn';
      button.textContent = '\u{1F310}';
      button.style.display = 'none';
      document.body.appendChild(button);
    }

    let popover = document.querySelector('.waDeck-hover-translate-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'waDeck-hover-translate-popover hidden';
      popover.innerHTML = '<div class="waDeck-hover-translate-head"><div class="waDeck-hover-translate-meta"></div><div class="waDeck-hover-translate-actions"><button class="waDeck-hover-translate-close" type="button">\u2715</button></div></div><div class="waDeck-hover-translate-text"></div>';
      document.body.appendChild(popover);
    }

    const metaNode = popover.querySelector('.waDeck-hover-translate-meta');
    const textNode = popover.querySelector('.waDeck-hover-translate-text');
    const closeNode = popover.querySelector('.waDeck-hover-translate-close');
    let activeRow = null;
    let hoverHideTimer = null;

    const ensureRowId = (row) => {
      if (!row) return '';
      if (!row.dataset.waDeckRowId) {
        row.dataset.waDeckRowId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      }
      return row.dataset.waDeckRowId;
    };

    const showPopover = (row, text, meta, isError = false) => {
      if (!row) return;
      const rect = row.getBoundingClientRect();
      metaNode.textContent = meta || '\u041f\u0435\u0440\u0435\u0432\u043e\u0434';
      textNode.textContent = text || '';
      popover.classList.toggle('waDeck-hover-translate-error', Boolean(isError));
      popover.classList.remove('hidden');
      const popoverWidth = Math.min(360, Math.max(260, Math.round(rect.width * 0.9)));
      popover.style.width = popoverWidth + 'px';
      const popoverHeight = Math.max(60, popover.offsetHeight || 100);
      // Под сообщением, выровнено по горизонтали
      let left = rect.left + (rect.width - popoverWidth) / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
      let top = rect.bottom + 6;
      // Если не влезает снизу — показать сверху
      if (top + popoverHeight > window.innerHeight - 10) {
        top = Math.max(8, rect.top - popoverHeight - 6);
      }
      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    };

    const hidePopover = () => {
      popover.classList.add('hidden');
      button.classList.remove('is-loading');
    };

    const setButtonPosition = (row) => {
      const rect = row.getBoundingClientRect();
      button.style.display = 'block';
      const top = Math.max(4, rect.top - 2);
      const left = Math.min(window.innerWidth - 36, rect.right + 4);
      button.style.top = top + 'px';
      button.style.left = left + 'px';
    };

    const activateRow = (row) => {
      activeRow = row;
      if (!row) {
        button.style.display = 'none';
        button.classList.remove('is-loading');
        popover.classList.add('hidden');
        return;
      }
      ensureRowId(row);
      setButtonPosition(row);
    };

    const findMessageRow = (target) => {
      const row = target && target.closest ? target.closest('[data-pre-plain-text]') : null;
      return row && row.closest('#main') ? row : null;
    };

    document.addEventListener('mousemove', (event) => {
      if (hoverHideTimer) {
        clearTimeout(hoverHideTimer);
        hoverHideTimer = null;
      }
      const row = findMessageRow(event.target);
      if (row) {
        activateRow(row);
        return;
      }
      if (button.contains(event.target) || popover.contains(event.target)) return;
      hoverHideTimer = setTimeout(() => {
        if (!button.matches(':hover') && !popover.matches(':hover')) {
          activateRow(null);
        }
      }, 120);
    }, true);

    document.addEventListener('scroll', () => {
      if (activeRow) setButtonPosition(activeRow);
    }, true);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!activeRow) return;
      const rowId = ensureRowId(activeRow);
      const text = normalize(extractMessage(activeRow) || '');
      if (!text) return;
      const requestId = rowId + '_' + Date.now().toString(36);
      const targetLang = window.__waDeckHoverTranslateTargetLang || '${safeDefaultTarget}';
      button.classList.add('is-loading');
      showPopover(activeRow, '\u041f\u0435\u0440\u0435\u0432\u043e\u0434...', '\u0417\u0430\u043f\u0440\u043e\u0441 \u043a API', false);
      console.log('__WADECK_HOVER_TRANSLATE__' + JSON.stringify({ type: 'translate', requestId, rowId, text, targetLang }));
    }, true);

    closeNode?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      hidePopover();
    });

    window.__waDeckApplyHoverTranslation = (payload) => {
      const rowId = String(payload?.rowId || '');
      const row = rowId ? document.querySelector('[data-wa-deck-row-id="' + CSS.escape(rowId) + '"]') : null;
      if (!row) {
        button.classList.remove('is-loading');
        return false;
      }
      const targetLang = String(payload?.targetLang || '').trim();
      if (targetLang) {
        window.__waDeckHoverTranslateTargetLang = targetLang;
      }
      showPopover(row, String(payload?.text || ''), String(payload?.meta || '\u041f\u0435\u0440\u0435\u0432\u043e\u0434'), Boolean(payload?.isError));
      button.classList.remove('is-loading');
      if (activeRow === row) setButtonPosition(row);
      return true;
    };

    return true;
  })();`;
}
