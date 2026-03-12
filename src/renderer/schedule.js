(function setupScheduleModule() {
  const CHAT_PICKER_CACHE_LIMIT = 24;

  let state, els, setStatus, trimMapSize, runWithBusyButton;
  let accountById, ensureWebview, isWebviewReady, sendWebviewInput, delay;
  let formatDateTime, nextSendAtLocal;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
    trimMapSize = ctx.trimMapSize;
    runWithBusyButton = ctx.runWithBusyButton;
    accountById = ctx.accountById;
    ensureWebview = ctx.ensureWebview;
    isWebviewReady = ctx.isWebviewReady;
    sendWebviewInput = ctx.sendWebviewInput;
    delay = ctx.delay;
    formatDateTime = ctx.formatDateTime;
    nextSendAtLocal = ctx.nextSendAtLocal;
  }

  function renderScheduleTarget() {
    if (!state.scheduleTarget.accountId || !state.scheduleTarget.chatName) {
      els.scheduleTarget.value = '';
      return;
    }
    els.scheduleTarget.value = `${state.scheduleTarget.accountName} / ${state.scheduleTarget.chatName}`;
  }

  async function fetchChatsForAccount(accountId, force = false) {
    const safeAccountId = String(accountId || '').trim();
    if (!safeAccountId) return [];

    const cached = state.chatPickerCache.get(safeAccountId);
    if (!force && cached && Date.now() - cached.at < 30000) {
      return cached.chats;
    }

    const webview = state.webviews.get(safeAccountId);
    if (!webview) return [];

    let chats = [];
    try {
      chats = await webview.executeJavaScript(collectChatsFromSidebarScript(), true);
    } catch {
      chats = [];
    }

    const normalized = Array.isArray(chats)
      ? chats.map((chat) => String(chat || '').trim()).filter(Boolean)
      : [];

    state.chatPickerCache.set(safeAccountId, { at: Date.now(), chats: normalized });
    trimMapSize(state.chatPickerCache, CHAT_PICKER_CACHE_LIMIT);
    return normalized;
  }

  async function refreshPickerChats(force = false) {
    const accountId = String(els.pickerAccount.value || '').trim();
    const account = accountById(accountId);
    if (account?.frozen) {
      els.pickerChat.innerHTML = '';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Аккаунт заморожен — сначала разморозьте его';
      els.pickerChat.appendChild(option);
      return;
    }
    const chats = await fetchChatsForAccount(accountId, force);

    els.pickerChat.innerHTML = '';
    if (!chats.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Чаты не найдены (откройте WhatsApp и дождитесь загрузки)';
      els.pickerChat.appendChild(option);
      return;
    }

    for (const chat of chats) {
      const option = document.createElement('option');
      option.value = chat;
      option.textContent = chat;
      els.pickerChat.appendChild(option);
    }
  }

  async function openChatPicker() {
    els.pickerAccount.innerHTML = '';
    for (const account of state.accounts) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.frozen ? `${account.name} (заморожен)` : account.name;
      els.pickerAccount.appendChild(option);
    }

    const preferred = state.scheduleTarget.accountId || state.activeAccountId || state.accounts[0]?.id || '';
    els.pickerAccount.value = preferred;

    await refreshPickerChats(true);
    if (state.scheduleTarget.accountId === preferred && state.scheduleTarget.chatName) {
      els.pickerChat.value = state.scheduleTarget.chatName;
    }

    els.chatPickerModal.classList.remove('hidden');
  }

  function closeChatPicker() {
    els.chatPickerModal.classList.add('hidden');
  }

  function renderAttachmentsDraft() {
    els.attachmentsList.innerHTML = '';

    if (!state.attachmentsDraft.length) {
      const empty = document.createElement('div');
      empty.className = 'attachment-item attachment-meta';
      empty.textContent = 'Вложений нет';
      els.attachmentsList.appendChild(empty);
      return;
    }

    for (const att of state.attachmentsDraft) {
      const row = document.createElement('div');
      row.className = 'attachment-item';

      const name = document.createElement('div');
      name.textContent = att.name;

      const meta = document.createElement('div');
      meta.className = 'attachment-meta';
      meta.textContent = att.path;

      row.append(name, meta);
      els.attachmentsList.appendChild(row);
    }
  }

  async function renderScheduled() {
    els.scheduledList.innerHTML = '';
    const response = await window.waDeck.listScheduled({ limit: 120 });
    const items = Array.isArray(response?.items) ? response.items : [];

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'scheduled-item scheduled-meta';
      empty.textContent = 'Активных отложенных сообщений нет';
      els.scheduledList.appendChild(empty);
      return;
    }

    for (const item of items) {
      const account = state.accounts.find((row) => row.id === item.accountId);
      const card = document.createElement('div');
      card.className = 'scheduled-item';

      const top = document.createElement('div');
      top.className = 'scheduled-item-top';

      const left = document.createElement('div');
      left.textContent = `${account?.name || item.accountId} / ${item.chatName}`;

      const badge = document.createElement('span');
      badge.className = `badge ${item.status}`;
      badge.textContent = item.status;

      top.append(left, badge);

      const meta = document.createElement('div');
      meta.className = 'scheduled-meta';
      meta.textContent = `Отправка: ${formatDateTime(item.sendAt)} | файлов: ${item.attachments?.length || 0}`;

      const text = document.createElement('div');
      text.textContent = item.text || '(без текста)';

      card.append(top, meta, text);

      if (item.status === 'pending' || item.status === 'failed' || item.status === 'processing') {
        const cancel = document.createElement('button');
        cancel.className = 'btn';
        cancel.textContent = 'Отменить';
        cancel.addEventListener('click', async () => {
          const res = await window.waDeck.cancelScheduled(item.id);
          if (!res?.ok) {
            setStatus(`Не удалось отменить: ${res?.error || 'error'}`);
            return;
          }
          await renderScheduled();
          setStatus('Отложенная отправка отменена');
        });
        card.appendChild(cancel);
      }

      if (item.errorText) {
        const err = document.createElement('div');
        err.className = 'scheduled-meta';
        err.textContent = `Ошибка: ${item.errorText}`;
        card.appendChild(err);
      }

      els.scheduledList.appendChild(card);
    }
  }

  async function pickAttachments() {
    const response = await window.waDeck.pickAttachments();
    if (!response || response.canceled || !Array.isArray(response.files)) return;

    const existing = new Set(state.attachmentsDraft.map((item) => item.path));
    for (const file of response.files) {
      if (existing.has(file.path)) continue;
      state.attachmentsDraft.push({ path: file.path, name: file.name });
    }

    renderAttachmentsDraft();
    setStatus(`Вложений в черновике: ${state.attachmentsDraft.length}`);
  }

  function clearAttachments() {
    state.attachmentsDraft = [];
    renderAttachmentsDraft();
  }

  async function createScheduledMessage() {
    if (!state.scheduleTarget.accountId || !state.scheduleTarget.chatName) {
      setStatus('Выберите WhatsApp и чат для отправки');
      return;
    }

    const sendAtRaw = String(els.scheduleAt.value || '');
    const parsedSendAt = sendAtRaw ? new Date(sendAtRaw) : null;
    if (!parsedSendAt || Number.isNaN(parsedSendAt.getTime())) {
      setStatus('Отложенная отправка: неверная дата/время');
      return;
    }
    const sendAtIso = parsedSendAt.toISOString();

    const payload = {
      accountId: state.scheduleTarget.accountId,
      chatName: state.scheduleTarget.chatName,
      text: String(els.scheduleText.value || ''),
      sendAt: sendAtIso,
      attachments: state.attachmentsDraft,
    };

    const response = await window.waDeck.scheduleMessage(payload);
    if (!response?.ok) {
      const map = {
        account_not_found: 'Аккаунт не найден',
        chat_required: 'Укажите чат',
        text_or_attachment_required: 'Добавьте текст или вложение',
        invalid_sendAt: 'Неверная дата/время',
        sendAt_in_past: 'Время отправки должно быть в будущем',
      };
      setStatus(`Отложенная отправка: ${map[response?.error] || response?.error || 'ошибка'}`);
      return;
    }

    els.scheduleText.value = '';
    els.scheduleAt.value = nextSendAtLocal(5);
    clearAttachments();
    await renderScheduled();
    setStatus('Сообщение запланировано');
  }

  async function waitForWebviewReady(webview, timeoutMs = 12000) {
    if (!webview) return false;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (isWebviewReady(webview) && (!webview.isLoading || !webview.isLoading())) {
        return true;
      }
      await delay(120);
    }
    return Boolean(isWebviewReady(webview));
  }

  async function runScheduledSend(webview, item) {
    const chatName = String(item.chatName || '').trim();
    const text = String(item.text || '');

    if (!chatName) return { ok: false, error: 'no_chat_name' };

    const ready = await waitForWebviewReady(webview, 15000);
    if (!ready) return { ok: false, error: 'webview_not_ready' };

    const query = async (script) => {
      try {
        return await webview.executeJavaScript(script, true);
      } catch (err) {
        return { _error: String(err?.message || err) };
      }
    };

    const nativeClick = async (x, y) => {
      await sendWebviewInput(webview, { type: 'mouseDown', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
      await delay(30);
      await sendWebviewInput(webview, { type: 'mouseUp', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
      await delay(50);
    };

    const nativeType = async (str) => {
      for (const ch of str) {
        await sendWebviewInput(webview, { type: 'char', keyCode: ch });
        await delay(15);
      }
    };

    const nativeKey = async (keyCode) => {
      await sendWebviewInput(webview, { type: 'keyDown', keyCode });
      await delay(30);
      await sendWebviewInput(webview, { type: 'keyUp', keyCode });
      await delay(50);
    };

    /* STEP 1: Find search input and click it */
    const searchRect = await query(`(() => {
      const selectors = ['#side input[role="textbox"][data-tab="3"]', '#side input[role="textbox"]', '#side input[placeholder]'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
        }
      }
      return { found: false };
    })()`);

    if (!searchRect?.found) return { ok: false, error: 'search_input_not_found' };

    await nativeClick(searchRect.x, searchRect.y);
    await delay(200);

    /* STEP 2: Clear search and type chat name */
    await sendWebviewInput(webview, { type: 'keyDown', keyCode: 'a', modifiers: ['meta'] });
    await sendWebviewInput(webview, { type: 'keyUp', keyCode: 'a', modifiers: ['meta'] });
    await delay(50);
    await nativeKey('Backspace');
    await delay(100);

    await nativeType(chatName);
    await delay(600);

    /* STEP 3: Find matching search result */
    const chatNameLower = chatName.toLowerCase();
    const matchResult = await query(`(() => {
      const normalize = (v) => String(v || '').replace(/\\u200e|\\u200f/g, '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
      const query = normalize('${chatName.replace(/'/g, "\\'")}').toLowerCase();
      const items = Array.from(document.querySelectorAll('#pane-side [role="row"], #side [role="row"]'));
      let exact = null;
      let partial = null;
      for (const item of items) {
        const titleEl = item.querySelector('span[title], div[title], [data-testid="cell-frame-title"]');
        const title = normalize(titleEl?.getAttribute('title') || titleEl?.textContent || '');
        if (!title) continue;
        const lower = title.toLowerCase();
        if (lower === query && !exact) {
          const r = item.getBoundingClientRect();
          exact = { x: r.left + r.width/2, y: r.top + r.height/2, title, w: r.width, h: r.height };
        } else if (lower.includes(query) && !partial) {
          const r = item.getBoundingClientRect();
          partial = { x: r.left + r.width/2, y: r.top + r.height/2, title, w: r.width, h: r.height };
        }
        if (exact) break;
      }
      return exact || partial || { found: false, itemCount: items.length };
    })()`);

    if (!matchResult?.x) {
      await nativeKey('Escape');
      return { ok: false, error: 'chat_not_found', debug: matchResult };
    }

    /* STEP 4: Click the search result */
    await nativeClick(matchResult.x, matchResult.y);
    await delay(500);

    /* STEP 5: Verify chat opened */
    let composerReady = false;
    for (let i = 0; i < 25; i++) {
      const check = await query(`(() => {
        const c = document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
                  document.querySelector('footer div[contenteditable="true"]');
        return { hasComposer: Boolean(c) };
      })()`);
      if (check?.hasComposer) { composerReady = true; break; }
      await delay(150);
    }

    if (!composerReady) {
      await nativeKey('Escape');
      await delay(100);
      return { ok: false, error: 'chat_not_confirmed_after_click', clickTarget: matchResult };
    }

    /* STEP 6: Send text message */
    if (!text.trim()) return { ok: true, method: 'native_input' };

    const composerRect = await query(`(() => {
      const c = document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('footer div[contenteditable="true"]');
      if (!c) return { found: false };
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, found: r.width > 0 && r.height > 0 };
    })()`);

    if (!composerRect?.found) return { ok: false, error: 'composer_rect_not_found' };

    await nativeClick(composerRect.x, composerRect.y);
    await delay(150);

    await nativeType(text);
    await delay(300);

    await nativeKey('Enter');
    await delay(500);

    const afterSend = await query(`(() => {
      const c = document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('footer div[contenteditable="true"]');
      const text = (c?.innerText || c?.textContent || '').trim();
      return { composerEmpty: text.length === 0, remaining: text.slice(0, 50) };
    })()`);

    if (afterSend?.composerEmpty) {
      return { ok: true, method: 'native_input' };
    }

    const sendBtnRect = await query(`(() => {
      const btn = document.querySelector('button[data-testid="send"]') ||
                  document.querySelector('[data-testid="send"]') ||
                  document.querySelector('span[data-icon="send"]');
      if (!btn) return { found: false };
      const el = btn.closest('button') || btn;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, found: true };
    })()`);

    if (sendBtnRect?.found) {
      await nativeClick(sendBtnRect.x, sendBtnRect.y);
      await delay(500);
    }

    const finalCheck = await query(`(() => {
      const c = document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('footer div[contenteditable="true"]');
      const text = (c?.innerText || c?.textContent || '').trim();
      return { composerEmpty: text.length === 0 };
    })()`);

    if (finalCheck?.composerEmpty) {
      return { ok: true, method: 'native_input_with_btn' };
    }

    return { ok: false, error: 'text_send_failed', method: 'native_input', debug: afterSend };
  }

  async function processDueSchedules() {
    if (state.scheduleRunnerBusy) return;
    state.scheduleRunnerBusy = true;

    try {
      const due = await window.waDeck.claimDueScheduled({ limit: 4 });
      const items = Array.isArray(due?.items) ? due.items : [];
      if (items.length) console.log('[scheduled] due:', items.length);
      if (!items.length) return;

      for (const item of items) {
        const account = accountById(item.accountId);
        if (!account || account.frozen) {
          const errorText = account?.frozen ? 'account_frozen' : 'account_not_found';
          console.warn('[scheduled]', item.chatName, errorText);
          await window.waDeck.completeScheduled({ id: item.id, ok: false, errorText });
          continue;
        }

        let webview = state.webviews.get(item.accountId);
        if (!webview) {
          ensureWebview(account);
          webview = state.webviews.get(item.accountId) || null;
        }
        if (!webview) {
          console.warn('[scheduled]', item.chatName, 'webview_not_found');
          await window.waDeck.completeScheduled({ id: item.id, ok: false, errorText: 'webview_not_found' });
          continue;
        }

        const result = await runScheduledSend(webview, item);
        console.log('[scheduled] result:', item.chatName, JSON.stringify(result));

        await window.waDeck.completeScheduled({
          id: item.id,
          ok: Boolean(result?.ok),
          errorText: result?.ok ? '' : String(result?.error || 'send_failed'),
        });

        if (result?.ok) {
          setStatus(`Отправлено: ${item.chatName}`);
        } else {
          setStatus(`Ошибка отправки: ${item.chatName} (${result?.error || 'send_failed'})`);
        }
      }

      await renderScheduled();
    } finally {
      state.scheduleRunnerBusy = false;
    }
  }

  function startScheduleRunner() {
    if (state.scheduleRunnerTimer) {
      clearInterval(state.scheduleRunnerTimer);
      state.scheduleRunnerTimer = null;
    }

    state.scheduleRunnerTimer = setInterval(() => {
      processDueSchedules().catch((e) => console.warn('[schedule]', e));
    }, 15000);

    setTimeout(() => processDueSchedules().catch((e) => console.warn('[schedule]', e)), 5000);
  }

  window.WaDeckScheduleModule = {
    init,
    renderScheduleTarget,
    refreshPickerChats,
    openChatPicker,
    closeChatPicker,
    renderAttachmentsDraft,
    renderScheduled,
    pickAttachments,
    clearAttachments,
    createScheduledMessage,
    startScheduleRunner,
  };
})();
