(function setupScheduleModule() {
  let state, els, setStatus, trimMapSize, runWithBusyButton;
  let accountById, ensureWebview, isWebviewReady, sendWebviewInput, delay;
  let formatDateTime, nextSendAtLocal, showConfirm;

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
    showConfirm = ctx.showConfirm;
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

    // Single-entry cache — picker is always scoped to the active account now,
    // so keeping a per-account Map was dead weight. 30s TTL kept for the
    // "pick chat → apply → reopen picker" fast path.
    const cached = state.chatPickerCache;
    if (!force && cached
        && cached.accountId === safeAccountId
        && Date.now() - cached.at < 30000) {
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

    state.chatPickerCache = { accountId: safeAccountId, at: Date.now(), chats: normalized };
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
    /* Show loading state while fetching */
    els.pickerChat.innerHTML = '';
    const loadingOpt = document.createElement('option');
    loadingOpt.value = '';
    loadingOpt.textContent = 'Загрузка чатов...';
    els.pickerChat.appendChild(loadingOpt);

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
    // Chat picker is always scoped to the currently active account — the user
    // picks only from *that* account's chats, never across accounts.
    const activeId = String(state.activeAccountId || '').trim();
    const active = accountById(activeId);
    const display = document.getElementById('picker-account-display');

    // Sync the hidden select to the active account for legacy consumers.
    els.pickerAccount.innerHTML = '';
    if (active) {
      const opt = document.createElement('option');
      opt.value = active.id;
      opt.textContent = active.name;
      els.pickerAccount.appendChild(opt);
      els.pickerAccount.value = active.id;
    } else {
      els.pickerAccount.value = '';
    }

    if (display) {
      if (!active) {
        display.textContent = 'Нет активного аккаунта — откройте WhatsApp-аккаунт';
        display.classList.add('is-empty');
      } else if (active.frozen) {
        display.textContent = `${active.name} · заморожен — сначала разморозьте`;
        display.classList.add('is-empty');
      } else {
        display.textContent = `Аккаунт: ${active.name}`;
        display.classList.remove('is-empty');
      }
    }

    els.pickerChat.innerHTML = '';
    if (!active || active.frozen) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = active?.frozen ? 'Аккаунт заморожен' : 'Откройте аккаунт для выбора чата';
      els.pickerChat.appendChild(opt);
      els.chatPickerModal.classList.remove('hidden');
      return;
    }

    await refreshPickerChats(true);
    // Preselect last-used chat if it was for this same account
    if (state.scheduleTarget.accountId === active.id && state.scheduleTarget.chatName) {
      els.pickerChat.value = state.scheduleTarget.chatName;
    }

    els.chatPickerModal.classList.remove('hidden');
  }

  function closeChatPicker() {
    if (typeof closeModalAnimated === 'function') {
      closeModalAnimated(els.chatPickerModal);
    } else {
      els.chatPickerModal.classList.add('hidden');
    }
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

  // Pagination state — kept module-level so "Показать ещё" preserves across re-renders
  const SCHEDULED_PAGE_SIZE = 30;
  let _scheduledVisibleLimit = SCHEDULED_PAGE_SIZE;

  async function renderScheduled() {
    els.scheduledList.innerHTML = '';
    const response = await window.waDeck.listScheduled({ limit: 2000 });
    const items = Array.isArray(response?.items) ? response.items : [];

    /* Update toolbar schedule button indicator */
    const schedBtn = document.getElementById('open-schedule-toolbar');
    if (schedBtn) {
      schedBtn.classList.toggle('has-pending', items.length > 0);
      schedBtn.title = items.length > 0 ? `Отложенная отправка (${items.length})` : 'Отложенная отправка';
    }

    /* Update popover list if open */
    const spListSummary = document.getElementById('sp-list-summary');
    if (spListSummary) {
      spListSummary.textContent = `Запланированные (${items.length})`;
    }
    const spList = document.getElementById('sp-list');
    if (spList && !document.getElementById('schedule-popover')?.classList.contains('hidden')) {
      /* Trigger popover list re-render via custom event */
      document.dispatchEvent(new CustomEvent('schedule-list-updated'));
    }

    /* Update scheduled-list-card summary with count */
    const listCard = document.getElementById('scheduled-list-card');
    if (listCard) {
      const summary = listCard.querySelector('summary');
      if (summary) summary.textContent = items.length > 0
        ? `Запланированные сообщения (${items.length})`
        : 'Запланированные сообщения';
    }

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'scheduled-item scheduled-meta';
      empty.textContent = 'Активных отложенных сообщений нет';
      els.scheduledList.appendChild(empty);
      _scheduledVisibleLimit = SCHEDULED_PAGE_SIZE;
      return;
    }

    // Show only first _scheduledVisibleLimit items — renders of 500+ scheduled
    // messages become expensive otherwise. User clicks "Показать ещё" to grow.
    const visibleItems = items.slice(0, _scheduledVisibleLimit);
    const remaining = items.length - visibleItems.length;

    for (const item of visibleItems) {
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
        const btnRow = document.createElement('div');
        btnRow.className = 'row';
        btnRow.style.gap = '6px';

        if (item.status === 'pending' || item.status === 'failed') {
          const edit = document.createElement('button');
          edit.className = 'btn';
          edit.textContent = 'Изменить';
          edit.addEventListener('click', () => editScheduledItem(item));
          btnRow.appendChild(edit);
        }

        const cancel = document.createElement('button');
        cancel.className = 'btn';
        cancel.textContent = 'Отменить';
        cancel.addEventListener('click', async () => {
          const confirmed = typeof showConfirm === 'function'
            ? await showConfirm('Отмена сообщения', `Отменить отправку для «${item.chatName}»?`, 'Отменить')
            : true;
          if (!confirmed) return;
          const res = await window.waDeck.cancelScheduled(item.id);
          if (!res?.ok) {
            setStatus(`Не удалось отменить: ${res?.error || 'error'}`);
            return;
          }
          await renderScheduled();
          setStatus('Отложенная отправка отменена');
        });
        btnRow.appendChild(cancel);
        card.appendChild(btnRow);
      }

      if (item.errorText) {
        const err = document.createElement('div');
        err.className = 'scheduled-meta';
        err.textContent = `Ошибка: ${item.errorText}`;
        card.appendChild(err);
      }

      els.scheduledList.appendChild(card);
    }

    if (remaining > 0) {
      const showMore = document.createElement('button');
      showMore.type = 'button';
      showMore.className = 'btn scheduled-show-more';
      showMore.textContent = `Показать ещё (${remaining})`;
      showMore.addEventListener('click', () => {
        _scheduledVisibleLimit += SCHEDULED_PAGE_SIZE;
        renderScheduled().catch(console.error);
      });
      els.scheduledList.appendChild(showMore);
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

  function localDateTimeFromISO(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  async function editScheduledItem(item) {
    const account = accountById(item.accountId);
    state.scheduleTarget.accountId = item.accountId;
    state.scheduleTarget.accountName = account?.name || item.accountId;
    state.scheduleTarget.chatName = item.chatName;
    renderScheduleTarget();

    els.scheduleText.value = item.text || '';
    els.scheduleAt.value = localDateTimeFromISO(item.sendAt);
    state.attachmentsDraft = Array.isArray(item.attachments) ? item.attachments.map((a) => ({ ...a })) : [];
    renderAttachmentsDraft();

    /* Store old item id — will be cancelled ONLY after new one is saved */
    state._editingScheduleId = item.id;

    const detailsCard = document.getElementById('schedule-settings-card');
    if (detailsCard && !detailsCard.open) {
      detailsCard.open = true;
    }
    els.scheduleText.focus();
    setStatus('Редактирование: измените и нажмите «Запланировать» (старое сохранится до сохранения нового)');
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

    /* If editing — cancel old item now that new one is saved */
    if (state._editingScheduleId) {
      await window.waDeck.cancelScheduled(state._editingScheduleId).catch(() => {});
      state._editingScheduleId = null;
    }

    els.scheduleText.value = '';
    els.scheduleAt.value = nextSendAtLocal(0);
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

    /* STEP 1: Find search input and click it (with wake-up retry) */
    const findSearchInput = () => query(`(() => {
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

    let searchRect = await findSearchInput();

    /* If not found, webview may be suspended (Windows Efficiency Mode).
       Reload to wake it up and retry. */
    if (!searchRect?.found) {
      console.warn('[scheduled] search input not found, attempting webview wake-up reload...');
      try { webview.reload(); } catch (_e) { /* ignore */ }
      await delay(3000);
      const reloaded = await waitForWebviewReady(webview, 20000);
      if (reloaded) {
        await delay(2000);
        searchRect = await findSearchInput();
      }
    }

    if (!searchRect?.found) return { ok: false, error: 'search_input_not_found' };

    await nativeClick(searchRect.x, searchRect.y);
    await delay(200);

    /* STEP 2: Clear search and type chat name */
    const selectAllMod = navigator.platform?.includes('Mac') ? 'meta' : 'control';
    await sendWebviewInput(webview, { type: 'keyDown', keyCode: 'a', modifiers: [selectAllMod] });
    await sendWebviewInput(webview, { type: 'keyUp', keyCode: 'a', modifiers: [selectAllMod] });
    await delay(50);
    await nativeKey('Backspace');
    await delay(100);

    await nativeType(chatName);
    await delay(600);

    /* STEP 3: Find matching search result */
    const chatNameLower = chatName.toLowerCase();
    const matchResult = await query(`(() => {
      const normalize = (v) => String(v || '').replace(/\\u200e|\\u200f/g, '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
      const query = normalize(${JSON.stringify(chatName)}).toLowerCase();
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

    /* STEP 6: Attachments-first flow.
       If the message has attachments, we deliver them via WhatsApp Web's own
       attach flow: click the "+" clip button → wait for hidden <input type="file">
       to materialize → push file paths into it via CDP (DOM.setFileInputFiles) →
       wait for the preview modal → type caption (on the last group only) → click
       the Send button inside the preview.
       Mixed media + documents cannot share one preview — we send them as two
       consecutive messages, with the caption attached to whichever group is sent
       last. */
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    const attachmentErrors = Array.isArray(item.attachmentErrors) ? item.attachmentErrors : [];

    if (attachmentErrors.length) {
      return { ok: false, error: 'attachment_load_failed: ' + attachmentErrors.join('; ') };
    }

    if (attachments.length) {
      const isMedia = (mime) => /^(image|video)\//i.test(String(mime || ''));
      const mediaPaths = attachments.filter((a) => isMedia(a.mime)).map((a) => a.path);
      const docPaths = attachments.filter((a) => !isMedia(a.mime)).map((a) => a.path);

      const groups = [];
      if (mediaPaths.length) groups.push({ kind: 'media', paths: mediaPaths });
      if (docPaths.length) groups.push({ kind: 'document', paths: docPaths });

      const webContentsId = typeof webview.getWebContentsId === 'function'
        ? webview.getWebContentsId()
        : null;
      if (!webContentsId) {
        return { ok: false, error: 'no_web_contents_id' };
      }

      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const isLast = gi === groups.length - 1;
        const captionForThisGroup = isLast ? text : '';
        const groupResult = await sendAttachmentGroup({
          webview,
          webContentsId,
          kind: group.kind,
          paths: group.paths,
          caption: captionForThisGroup,
          query,
          nativeClick,
          nativeType,
          nativeKey,
          delay,
        });
        if (!groupResult.ok) {
          return { ok: false, error: `attach_${group.kind}_${groupResult.error}`, debug: groupResult };
        }
        // Small settle between groups so the UI recovers before next attach
        if (!isLast) await delay(700);
      }

      return { ok: true, method: 'cdp_attachments', groups: groups.length };
    }

    /* STEP 7: Text-only path (no attachments). */
    if (!text.trim()) {
      // Neither attachments nor text — backend should have rejected with
      // `text_or_attachment_required`, but guard anyway so we don't silently
      // mark empty jobs as "sent".
      return { ok: false, error: 'empty_message' };
    }

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
      const btn = document.querySelector('footer button[data-testid="send"]') ||
                  document.querySelector('footer [data-testid="send"]') ||
                  document.querySelector('footer span[data-icon="send"]');
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

  /**
   * Attach a group of files of the same kind (media or document) to the current
   * WhatsApp Web chat and send them (with optional caption on the last group).
   *
   * Why this is non-trivial: WhatsApp Web's <input type="file"> is hidden and
   * lazy-rendered only after the user expands the attach ("+") menu. We open
   * the menu with a native click, poll until the hidden input appears, then
   * deliver paths via CDP's DOM.setFileInputFiles (which JS alone cannot do).
   * Setting files fires the input's change event — WhatsApp then opens the
   * preview modal, where we type the caption and click send.
   */
  async function sendAttachmentGroup({ webview, webContentsId, kind, paths, caption, query, nativeClick, nativeType, nativeKey, delay }) {
    // Group → file-input accept selector.
    // WhatsApp Web has THREE file inputs that all carry "image" in accept:
    //   • Photos & Videos — accept includes "video/…" (images + videos together)
    //   • Stickers        — accept is image-only (webp/png), NO video
    //   • Document        — accept is "*" / missing
    // Previously we used `accept*="image"` which matched the sticker input first
    // in DOM order — photos were uploaded as stickers. We now key off the
    // image+video combination, which is unique to the media picker.
    const inputSelector = kind === 'media'
      ? 'input[type="file"][accept*="video"]'
      : 'input[type="file"][accept="*"], input[type="file"]:not([accept*="image"]):not([accept*="video"])';

    /* A. Expand the attach menu.
       Covers a few years' worth of WhatsApp Web class renames: plus icon,
       clip testid, aria-label fallbacks (EN/RU). We only need the menu open
       long enough for the lazy inputs to mount; WhatsApp closes it itself
       once files are selected. */
    const clipRect = await query(`(() => {
      const candidates = [
        'footer [data-icon="plus"]',
        'footer [data-icon="clip"]',
        'footer [data-icon="plus-rounded"]',
        'footer [data-testid="clip"]',
        'footer [data-testid="conversation-clip"]',
        'footer button[aria-label*="Attach" i]',
        'footer button[aria-label*="Прикреп" i]',
        'footer button[title*="Attach" i]',
        'footer button[title*="Прикреп" i]',
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const host = el.closest('button') || el.closest('[role="button"]') || el;
        const r = host.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
        }
      }
      return { found: false };
    })()`);

    if (!clipRect?.found) return { ok: false, error: 'clip_button_not_found' };

    await nativeClick(clipRect.x, clipRect.y);
    await delay(350);

    /* B. Wait for the hidden <input type="file"> for this kind to appear. */
    let inputReady = false;
    for (let i = 0; i < 30; i++) {
      const present = await query(
        `(() => Boolean(document.querySelector(${JSON.stringify(inputSelector)})))()`,
      );
      if (present === true) { inputReady = true; break; }
      await delay(150);
    }

    if (!inputReady) {
      await nativeKey('Escape');
      return { ok: false, error: 'file_input_not_found' };
    }

    /* C. Hand paths to the input via CDP. This bypasses the OS file dialog
       and fires the 'change' event WhatsApp listens for. */
    const cdp = await window.waDeck.sendAttachmentsViaCDP({
      webContentsId,
      selector: inputSelector,
      files: paths,
    });
    if (!cdp?.ok) {
      await nativeKey('Escape');
      return { ok: false, error: `cdp_${cdp?.error || 'failed'}` };
    }

    /* D. Wait for the preview modal. WhatsApp shows a lightbox with a
       Send button; we detect it by a data-icon="send" that lives OUTSIDE
       the footer (the composer's send button is always in footer). */
    let previewReady = false;
    for (let i = 0; i < 60; i++) { // up to ~12s — media can take a moment to thumbnail
      const detected = await query(`(() => {
        const icons = Array.from(document.querySelectorAll(
          '[data-icon="send"], [data-icon="wds-ic-send-filled"], [aria-label="Send"], [aria-label*="Отправ" i]'
        ));
        for (const ic of icons) {
          if (ic.closest('footer')) continue;
          const host = ic.closest('button') || ic.closest('[role="button"]') || ic;
          const r = host.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return true;
        }
        return false;
      })()`);
      if (detected === true) { previewReady = true; break; }
      await delay(200);
    }

    if (!previewReady) {
      await nativeKey('Escape');
      return { ok: false, error: 'preview_modal_not_opened' };
    }

    /* E. Type caption (only relevant on the last group of a message). */
    if (caption && caption.trim()) {
      const captionRect = await query(`(() => {
        // Find a visible contenteditable that's NOT the main composer (which is in footer).
        const nodes = Array.from(document.querySelectorAll('div[contenteditable="true"], [contenteditable="true"][role="textbox"]'));
        for (let i = nodes.length - 1; i >= 0; i--) {
          const el = nodes[i];
          if (el.closest('footer')) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
          }
        }
        return { found: false };
      })()`);

      if (captionRect?.found) {
        await nativeClick(captionRect.x, captionRect.y);
        await delay(150);
        await nativeType(caption);
        await delay(250);
      }
      // If caption input isn't found we still send — WhatsApp allows captionless attachments.
    }

    /* F. Click the preview's Send button. Same "outside footer" rule. */
    const sendRect = await query(`(() => {
      const icons = Array.from(document.querySelectorAll(
        '[data-icon="send"], [data-icon="wds-ic-send-filled"], [aria-label="Send"], [aria-label*="Отправ" i]'
      ));
      for (const ic of icons) {
        if (ic.closest('footer')) continue;
        const host = ic.closest('button') || ic.closest('[role="button"]') || ic;
        const r = host.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
        }
      }
      return { found: false };
    })()`);

    if (!sendRect?.found) {
      await nativeKey('Escape');
      return { ok: false, error: 'preview_send_not_found' };
    }

    await nativeClick(sendRect.x, sendRect.y);
    await delay(700);

    /* G. Wait for the preview modal to close — confirms the message uploaded
       and left the lightbox. Times out at ~15s for very slow uploads. */
    for (let i = 0; i < 75; i++) {
      const stillOpen = await query(`(() => {
        const icons = Array.from(document.querySelectorAll(
          '[data-icon="send"], [data-icon="wds-ic-send-filled"], [aria-label="Send"], [aria-label*="Отправ" i]'
        ));
        for (const ic of icons) {
          if (ic.closest('footer')) continue;
          const host = ic.closest('button') || ic.closest('[role="button"]') || ic;
          const r = host.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return true;
        }
        return false;
      })()`);
      if (stillOpen !== true) return { ok: true };
      await delay(200);
    }

    return { ok: false, error: 'preview_did_not_close' };
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

  function getScheduleTarget() {
    return { ...state.scheduleTarget };
  }

  window.WaDeckScheduleModule = {
    init,
    renderScheduleTarget,
    refreshPickerChats,
    fetchChatsForAccount,
    openChatPicker,
    closeChatPicker,
    getScheduleTarget,
    renderAttachmentsDraft,
    renderScheduled,
    pickAttachments,
    clearAttachments,
    createScheduledMessage,
    startScheduleRunner,
  };
})();
