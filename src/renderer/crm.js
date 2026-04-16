(function setupCrmModule() {
  let state, els, setStatus, activeAccount, selectedWebview;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
    activeAccount = ctx.activeAccount;
    selectedWebview = ctx.selectedWebview;
  }

  function setCrmEditable(editable) {
    const on = Boolean(editable);
    state.crmEditable = on;
    if (els.crmAbout) els.crmAbout.readOnly = !on;
    if (els.crmMyInfo) els.crmMyInfo.readOnly = !on;
    if (els.crmSave) els.crmSave.disabled = !on;
    if (els.crmEdit) els.crmEdit.textContent = on ? 'Отмена' : 'Изменить';
  }

  function crmFormPayload() {
    const hoverCheckbox = document.getElementById('crm-hover-enabled');
    return {
      about: String(els.crmAbout.value || '').trim(),
      myInfo: String(els.crmMyInfo.value || '').trim(),
      hoverEnabled: hoverCheckbox ? hoverCheckbox.checked : true,
    };
  }

  function buildCrmTextForCopy() {
    const target = state.crmTarget || {};
    const payload = crmFormPayload();
    return [
      `Контакт: ${target.contactName || ''}`,
      `WhatsApp: ${target.accountName || ''}`,
      '',
      'О нём:',
      payload.about,
      '',
      'Моя информация:',
      payload.myInfo,
      '',
    ].join('\n');
  }

  async function updateCrmModalPosition() {
    const webview = selectedWebview();
    if (!webview || !els.crmModal || !els.appRoot) return;

    let chatLeftInside = 0;
    try {
      chatLeftInside = Number(await webview.executeJavaScript(crmChatBoundaryScript(), true) || 0) || 0;
    } catch {
      chatLeftInside = 0;
    }

    const appRect = els.appRoot.getBoundingClientRect();
    const webviewRect = webview.getBoundingClientRect();
    const left = Math.max(12, Math.round(webviewRect.left - appRect.left + chatLeftInside + 10));
    els.crmModal.style.setProperty('--crm-modal-left', `${left}px`);
  }

  async function getActiveChatContactName() {
    const account = activeAccount();
    const webview = selectedWebview();
    if (!account || !webview || account.frozen) return '';
    try {
      return String(await webview.executeJavaScript(activeChatContactScript(), true) || '').trim();
    } catch {
      return '';
    }
  }

  async function openCrmModal() {
    const account = activeAccount();
    if (!account) {
      setStatus('Нет активного аккаунта');
      return;
    }
    if (account.frozen) {
      setStatus(`${account.name}: аккаунт заморожен`);
      return;
    }

    const contactName = await getActiveChatContactName();
    if (!contactName) {
      setStatus('Откройте нужный чат, затем CRM');
      return;
    }

    const response = await window.waDeck.crmLoadContact({
      accountId: account.id,
      accountName: account.name,
      contactName,
    }).catch(() => null);
    if (!response?.ok) {
      setStatus(`CRM: ${response?.error || 'load_failed'}`);
      return;
    }

    const loaded = response.record || {};
    const nextRecord = {
      about: String(loaded.about || ''),
      myInfo: String(loaded.myInfo || ''),
      hoverEnabled: loaded.hoverEnabled !== false, // default true
    };

    const contactMismatch = String(loaded.contactName || '').trim() !== contactName;
    const accountMismatch = String(loaded.accountName || '').trim() !== account.name;
    const shouldAutoSave = !response.exists || contactMismatch || accountMismatch;

    let filePath = String(response.filePath || '');
    let autoSaveError = '';
    if (shouldAutoSave) {
      const autoSaved = await window.waDeck.crmSaveContact({
        accountId: account.id,
        accountName: account.name,
        contactName,
        ...nextRecord,
      });
      if (autoSaved?.ok) {
        filePath = String(autoSaved.filePath || filePath);
      } else {
        autoSaveError = String(autoSaved?.error || 'auto_save_failed');
      }
    }

    state.crmTarget = {
      accountId: account.id,
      accountName: account.name,
      contactName,
      filePath,
    };

    els.crmContactName.value = contactName;
    els.crmAbout.value = nextRecord.about;
    els.crmMyInfo.value = nextRecord.myInfo;
    els.crmMeta.textContent = `Файл: ${filePath || '—'}`;
    const hoverCheckbox = document.getElementById('crm-hover-enabled');
    if (hoverCheckbox) hoverCheckbox.checked = nextRecord.hoverEnabled;
    setCrmEditable(true);
    await updateCrmModalPosition();
    els.crmModal.classList.remove('hidden');
    requestAnimationFrame(() => {
      autoResizeCrmTextarea(els.crmAbout);
      autoResizeCrmTextarea(els.crmMyInfo);
      updateCrmModalPosition().catch(() => {});
    });
    if (response?.migrated) {
      setStatus('CRM: старый файл перенесён на правильный контакт');
    } else if (autoSaveError) {
      setStatus(`CRM: не удалось авто-сохранить (${autoSaveError})`);
    } else if (!response.exists) {
      setStatus('CRM: контакт создан и сохранён');
    } else if (shouldAutoSave) {
      setStatus('CRM: контакт обновлён');
    } else {
      setStatus('CRM: данные загружены');
    }
  }

  function closeCrmModal() {
    setCrmEditable(false);
    if (typeof closeModalAnimated === 'function') {
      closeModalAnimated(els.crmModal);
    } else {
      els.crmModal.classList.add('hidden');
    }
    els.crmModal.style.removeProperty('--crm-modal-left');
  }

  function toggleCrmEdit() {
    if (state.crmEditable) {
      setCrmEditable(false);
    } else {
      setCrmEditable(true);
    }
  }

  async function saveCrmCard() {
    const target = state.crmTarget || {};
    if (!target.accountId || !target.contactName) {
      setStatus('CRM: контакт не выбран');
      return;
    }

    const payload = {
      accountId: target.accountId,
      accountName: target.accountName,
      contactName: target.contactName,
      ...crmFormPayload(),
    };
    const response = await window.waDeck.crmSaveContact(payload);
    if (!response?.ok) {
      setStatus(`CRM: ${response?.error || 'save_failed'}`);
      return;
    }

    state.crmTarget.filePath = String(response.filePath || target.filePath || '');
    els.crmMeta.textContent = `Файл: ${state.crmTarget.filePath || '—'}`;
    // Invalidate hover cache so new hoverEnabled takes effect
    if (typeof window._invalidateCrmHoverCache === 'function') {
      window._invalidateCrmHoverCache(target.accountId, target.contactName);
    }
    setStatus('CRM: сохранено');
  }

  async function copyCrmCard() {
    const text = buildCrmTextForCopy();
    await window.waDeck.setClipboardText(text);
    setStatus('CRM: карточка скопирована');
  }

  function addCrmNote() {
    const el = els.crmMyInfo;
    if (!el || el.readOnly) {
      setCrmEditable(true);
    }
    const MONTHS_RU = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const now = new Date();
    const stamp = now.getDate() + ' ' + MONTHS_RU[now.getMonth()] + ' - ';
    const prev = el.value ? '\n' + el.value : '';
    el.value = stamp + prev;
    el.focus();
    el.setSelectionRange(stamp.length, stamp.length);
    autoResizeCrmTextarea(el);
  }

  function autoResizeCrmTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(Math.max(textarea.scrollHeight, 80), 300) + 'px';
  }

  function bindCrmAutoResize() {
    if (els.crmAbout) els.crmAbout.addEventListener('input', () => autoResizeCrmTextarea(els.crmAbout));
    if (els.crmMyInfo) els.crmMyInfo.addEventListener('input', () => autoResizeCrmTextarea(els.crmMyInfo));
  }

  window.WaDeckCrmModule = {
    init,
    setCrmEditable,
    openCrmModal,
    closeCrmModal,
    toggleCrmEdit,
    saveCrmCard,
    copyCrmCard,
    addCrmNote,
    bindCrmAutoResize,
    updateCrmModalPosition,
  };
})();
