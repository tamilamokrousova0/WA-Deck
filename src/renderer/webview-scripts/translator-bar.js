function translatorBarScript() {
  return `(() => {
    if (window.__waDeckTranslatorBound) return true;
    window.__waDeckTranslatorBound = true;

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

    let bar = null;
    let fromLang = 'auto';
    let toLang = 'en';
    let dropdownOpen = null;

    function createBar() {
      bar = document.createElement('div');
      bar.id = '__wadeck-translator-bar';
      bar.style.cssText = [
        'display:none',
        'align-items:center',
        'gap:10px',
        'padding:5px 14px',
        'background:#181e2b',
        'border-bottom:1px solid #2b313b',
        'font-family:Avenir Next,Segoe UI,system-ui,sans-serif',
        'font-size:12px',
        'color:#e5eaf0',
        'position:relative',
        'z-index:50',
        'min-height:34px',
        'box-sizing:border-box',
        'transition:opacity 0.2s ease',
      ].join(';');

      // Globe icon
      const globe = document.createElement('span');
      globe.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7e8ea0" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>';
      globe.style.cssText = 'display:flex;align-items:center;flex-shrink:0;';
      bar.appendChild(globe);

      // From dropdown
      const fromBtn = createDropdownBtn('from');
      bar.appendChild(fromBtn);

      // Arrow
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.style.cssText = 'color:#7e8ea0;flex-shrink:0;';
      bar.appendChild(arrow);

      // To dropdown
      const toBtn = createDropdownBtn('to');
      bar.appendChild(toBtn);

      // Spacer
      const spacer = document.createElement('span');
      spacer.style.flex = '1';
      bar.appendChild(spacer);

      // Translate button
      const translateBtn = document.createElement('button');
      translateBtn.textContent = 'Перевести';
      translateBtn.style.cssText = [
        'background:#2d8cf0',
        'color:#fff',
        'border:none',
        'border-radius:6px',
        'padding:4px 14px',
        'font-size:11px',
        'font-weight:600',
        'cursor:pointer',
        'flex-shrink:0',
        'transition:background 0.2s ease',
        'letter-spacing:0.02em',
      ].join(';');
      translateBtn.addEventListener('mouseenter', () => { translateBtn.style.background = '#2478d0'; });
      translateBtn.addEventListener('mouseleave', () => { translateBtn.style.background = '#2d8cf0'; });
      translateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        doTranslate();
      });
      bar.appendChild(translateBtn);

      return bar;
    }

    function createDropdownBtn(type) {
      const isFrom = type === 'from';
      const btn = document.createElement('div');
      btn.dataset.translatorDropdown = type;
      btn.style.cssText = [
        'background:#151a24',
        'border:1px solid #2b313b',
        'border-radius:6px',
        'padding:4px 10px',
        'color:#e5eaf0',
        'font-size:11px',
        'min-width:74px',
        'text-align:center',
        'cursor:pointer',
        'position:relative',
        'user-select:none',
      ].join(';');
      btn.textContent = isFrom ? getLangLabel(fromLang) : getLangLabel(toLang);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(type);
      });
      return btn;
    }

    function getLangLabel(code) {
      const lang = LANGS.find((l) => l.code === code);
      return lang ? lang.label : code;
    }

    function toggleDropdown(type) {
      closeDropdowns();
      const isFrom = type === 'from';
      const list = isFrom ? LANGS : TARGET_LANGS;
      const current = isFrom ? fromLang : toLang;
      const btn = bar.querySelector('[data-translator-dropdown="' + type + '"]');
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
        'min-width:130px',
        'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
      ].join(';');

      list.forEach((lang) => {
        const item = document.createElement('div');
        item.textContent = lang.label;
        item.style.cssText = [
          'padding:5px 10px',
          'border-radius:4px',
          'cursor:pointer',
          'font-size:12px',
          'color:' + (lang.code === current ? '#3dd68c' : '#e5eaf0'),
          'font-weight:' + (lang.code === current ? '600' : '400'),
        ].join(';');
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.06)'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isFrom) { fromLang = lang.code; } else { toLang = lang.code; }
          btn.textContent = lang.label;
          closeDropdowns();
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

    function getComposerText() {
      const composer = getComposer();
      if (!composer) return '';
      return (composer.innerText || composer.textContent || '').trim();
    }

    function doTranslate() {
      // Only translate selected text — user must select text first
      const text = getSelectedText();
      if (!text) return;
      const payload = JSON.stringify({ text: text, from: fromLang, to: toLang });
      console.log('__WADECK_TRANSLATE__' + payload);
    }

    // Insert translated text — replaces current selection via execCommand
    window.__waDeckInsertTranslation = function (translated) {
      if (!translated) return;
      const composer = getComposer();
      if (!composer) return;
      composer.focus();

      // Restore selection if it was lost when clicking translate button
      // execCommand insertText replaces the current selection
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

    function injectBar() {
      const footer = document.querySelector('footer');
      if (!footer || document.getElementById('__wadeck-translator-bar')) return;

      createBar();
      footer.parentElement.insertBefore(bar, footer);
    }

    function showBar() {
      if (!bar) injectBar();
      if (bar && bar.style.display === 'none') {
        bar.style.display = 'flex';
        bar.style.opacity = '0';
        requestAnimationFrame(() => { bar.style.opacity = '1'; });
      }
    }

    function hideBar() {
      if (bar && bar.style.display !== 'none') {
        bar.style.opacity = '0';
        setTimeout(() => { if (bar) bar.style.display = 'none'; }, 150);
      }
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      if (dropdownOpen) closeDropdowns();
    });

    // Watch composer for text changes
    let composerObserver = null;
    let lastComposerEmpty = true;

    function watchComposer() {
      const composer = getComposer();
      if (!composer) {
        setTimeout(watchComposer, 1000);
        return;
      }

      const checkText = () => {
        const text = getComposerText();
        const empty = text.length === 0;
        if (empty && !lastComposerEmpty) {
          hideBar();
          lastComposerEmpty = true;
        } else if (!empty && lastComposerEmpty) {
          showBar();
          lastComposerEmpty = false;
        }
      };

      if (composerObserver) composerObserver.disconnect();
      composerObserver = new MutationObserver(checkText);
      composerObserver.observe(composer, { childList: true, subtree: true, characterData: true });
      composer.addEventListener('input', checkText);
      checkText();
    }

    // Watch for footer appearing (WhatsApp SPA loads lazily)
    const bodyObserver = new MutationObserver(() => {
      const footer = document.querySelector('footer');
      if (footer && !document.getElementById('__wadeck-translator-bar')) {
        watchComposer();
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    watchComposer();

    return true;
  })();`;
}
