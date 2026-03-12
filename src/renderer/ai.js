(function setupAiModule() {
  let state, els, setStatus, runWithBusyButton, selectedWebview, insertTextIntoActiveChat;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
    runWithBusyButton = ctx.runWithBusyButton;
    selectedWebview = ctx.selectedWebview;
    insertTextIntoActiveChat = ctx.insertTextIntoActiveChat;
  }

  function mapAiError(response) {
    const code = String(response?.errorCode || response?.error || '').trim();
    const raw = String(response?.error || '').trim();

    if (code === 'ai_api_key_required') return 'Укажите API key для AI в настройках';
    if (code === 'ai_api_key_invalid') return 'Неверный API key для AI';
    if (code === 'ai_message_required') return 'Нет текста сообщения для генерации';
    if (code === 'ai_model_required') return 'Укажите модель AI в настройках';
    if (code === 'ai_bad_request') return `Некорректный запрос к AI API: ${raw || 'проверьте модель и параметры'}`;
    if (code === 'ai_rate_limited') return 'Лимит запросов AI превышен';
    if (code === 'ai_server_error') return 'Сервер AI временно недоступен';
    if (code === 'ai_timeout') return 'AI не ответил вовремя';
    if (code === 'ai_network_error') return `Сетевая ошибка AI: ${raw || 'нет соединения'}`;
    if (code === 'ai_empty_response') return 'AI вернул пустой ответ';

    if (raw) return raw;
    return 'Ошибка AI';
  }

  function mapAiModelsError(response) {
    const code = String(response?.errorCode || response?.error || '').trim();
    const raw = String(response?.error || '').trim();

    if (code === 'aiml_models_timeout') return 'Не удалось загрузить список моделей: таймаут';
    if (code === 'aiml_models_empty') return 'AIMLAPI не вернул доступные chat-модели';
    if (code === 'aiml_models_http_error') return `Ошибка AIMLAPI при загрузке моделей: ${raw || 'HTTP error'}`;
    if (code === 'aiml_models_fetch_failed') return `Сетевая ошибка загрузки моделей: ${raw || 'нет соединения'}`;

    if (raw) return raw;
    return 'Не удалось загрузить список моделей';
  }

  function renderAiModels(models = []) {
    const current = String(state.settings?.aiModel || state.aiModel || 'google/gemma-3-4b-it').trim();
    const uniq = Array.from(
      new Set(['google/gemma-3-4b-it', ...models.map((row) => String(row || '').trim()).filter(Boolean)]),
    );

    els.aiModel.innerHTML = '';
    for (const model of uniq) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      els.aiModel.appendChild(option);
    }

    if (uniq.includes(current)) {
      els.aiModel.value = current;
    } else {
      els.aiModel.value = uniq[0] || 'google/gemma-3-4b-it';
    }

    state.aiModel = els.aiModel.value;
  }

  async function refreshAiModels(force = false) {
    const keyExists = Boolean(String(els.aiApiKey.value || state.settings?.aiApiKey || '').trim());
    if (!keyExists && !force) {
      renderAiModels([]);
      return;
    }

    const response = await window.waDeck.listAiModels({ force: Boolean(force) });
    if (!response?.ok) {
      renderAiModels([]);
      if (force || keyExists) {
        setStatus(mapAiModelsError(response));
      }
      return;
    }

    const models = Array.isArray(response.models) ? response.models : [];
    renderAiModels(models);
    setStatus(`Моделей AI загружено: ${models.length}`);
  }

  function openAiModal() {
    renderAiModeButtons();
    els.aiContextCount.value = String(state.aiContextCount);
    els.aiReplySourceLang.checked = Boolean(state.aiReplySourceLang);
    els.aiModal.classList.remove('hidden');
  }

  function closeAiModal() {
    els.aiModal.classList.add('hidden');
  }

  function normalizeAiContextCount(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(10, Math.trunc(num)));
  }

  function renderAiModeButtons() {
    const mode = String(state.aiMode || 'warm');
    const map = {
      short: els.aiModeShort,
      warm: els.aiModeWarm,
      business: els.aiModeBusiness,
      flirt: els.aiModeFlirt,
    };

    for (const [key, button] of Object.entries(map)) {
      if (!button) continue;
      button.classList.toggle('is-active', key === mode);
    }
  }

  function setAiMode(mode) {
    const safe = ['short', 'warm', 'business', 'flirt'].includes(String(mode)) ? String(mode) : 'warm';
    state.aiMode = safe;
    renderAiModeButtons();
  }

  async function getRecentIncomingContext(limit = 3) {
    const webview = selectedWebview();
    if (!webview) return [];

    try {
      const result = await webview.executeJavaScript(collectRecentIncomingMessagesScript(limit), true);
      if (!Array.isArray(result)) return [];
      return result.map((line) => String(line || '').trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  async function getSelectedTextFromActiveWebview() {
    const webview = selectedWebview();
    if (!webview) return '';
    try {
      return String(await webview.executeJavaScript(selectedTextScript(), true) || '').trim();
    } catch {
      return '';
    }
  }

  async function fillAiInputFromSelection() {
    const text = await getSelectedTextFromActiveWebview();
    if (!text) {
      setStatus('Сначала выделите текст в чате');
      return;
    }
    els.aiInput.value = text;
  }

  async function doAiReply() {
    let text = String(els.aiInput.value || '').trim();
    if (!text) {
      text = await getSelectedTextFromActiveWebview();
      if (text) {
        els.aiInput.value = text;
      }
    }
    if (!text) {
      setStatus('Введите текст или выделите сообщение в чате');
      return;
    }

    const contextCount = normalizeAiContextCount(els.aiContextCount.value);
    state.aiContextCount = contextCount;
    els.aiContextCount.value = String(contextCount);
    state.aiReplySourceLang = Boolean(els.aiReplySourceLang.checked);

    const contextMessages = await getRecentIncomingContext(contextCount);

    const payload = {
      messageText: text,
      model: String(els.aiModel.value || state.aiModel || '').trim(),
      mode: state.aiMode,
      contextMessages,
      replyInSourceLang: state.aiReplySourceLang,
      rolePrompt: String(els.aiRolePrompt.value || state.aiRolePrompt || '').trim(),
    };
    const response = await runWithBusyButton(
      els.doAiReply,
      () => window.waDeck.generateAiReply(payload),
      { text: 'Генерация...', title: 'AI готовит ответ' },
    );
    if (!response?.ok) {
      setStatus(`AI: ${mapAiError(response)}`);
      return;
    }

    els.aiOutput.value = String(response.replyText || '');
    const contextInfo = contextMessages.length ? `, контекст: ${contextMessages.length}` : '';
    setStatus(`AI ответ готов (${response.model || 'model'}${contextInfo})`);
  }

  async function copyAiReply() {
    const text = String(els.aiOutput.value || '').trim();
    if (!text) {
      setStatus('Сначала сгенерируйте ответ');
      return;
    }
    await window.waDeck.setClipboardText(text);
    setStatus('AI ответ скопирован');
  }

  async function insertAiReplyIntoActiveChat() {
    const text = String(els.aiOutput.value || '').trim();
    if (!text) {
      setStatus('Сначала сгенерируйте ответ');
      return;
    }

    const result = await insertTextIntoActiveChat(text);
    if (!result?.ok) {
      const map = {
        text_required: 'Нет текста для вставки',
        no_active_account: 'Нет активного аккаунта',
        account_frozen: 'Аккаунт заморожен',
        no_active_chat: 'Нет активного чата для вставки',
      };
      setStatus(`Не удалось вставить в чат: ${map[result?.error] || result?.error || 'clipboard_insert_failed'}`);
      return;
    }
    setStatus('AI ответ вставлен в текущий чат');
  }

  window.WaDeckAiModule = {
    init,
    renderAiModels,
    refreshAiModels,
    openAiModal,
    closeAiModal,
    normalizeAiContextCount,
    renderAiModeButtons,
    setAiMode,
    getSelectedTextFromActiveWebview,
    fillAiInputFromSelection,
    doAiReply,
    copyAiReply,
    insertAiReplyIntoActiveChat,
  };
})();
