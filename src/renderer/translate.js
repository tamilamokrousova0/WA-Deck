(function setupTranslateModule() {
  let state, els, setStatus, runWithBusyButton, safeExecuteInWebview;
  let getSelectedTextFromActiveWebview;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
    runWithBusyButton = ctx.runWithBusyButton;
    safeExecuteInWebview = ctx.safeExecuteInWebview;
    getSelectedTextFromActiveWebview = ctx.getSelectedTextFromActiveWebview;
  }

  function normalizeTranslateTargetLang(value) {
    const HOVER_TRANSLATE_LANG_OPTIONS = window._waDeckLangOptions;
    const raw = String(value || '').trim().toUpperCase();
    const matched = HOVER_TRANSLATE_LANG_OPTIONS.find((option) => option.value.toUpperCase() === raw);
    return matched?.value || 'RU';
  }

  function getSelectedTranslateProvider() {
    return els.translateProviderLibre?.checked ? 'libre' : 'deepl';
  }

  function setSelectedTranslateProvider(provider) {
    const safe = String(provider || '').toLowerCase() === 'libre' ? 'libre' : 'deepl';
    if (els.translateProviderDeepl) {
      els.translateProviderDeepl.checked = safe === 'deepl';
    }
    if (els.translateProviderLibre) {
      els.translateProviderLibre.checked = safe === 'libre';
    }
  }

  function mapTranslateError(response) {
    const code = String(response?.errorCode || response?.error || '').trim();
    const raw = String(response?.error || '').trim();

    if (code === 'deepl_api_key_required') return 'Укажите DeepL API Key в настройках';
    if (code === 'deepl_api_key_invalid') return 'Неверный DeepL API Key';
    if (code === 'deepl_quota_exceeded') return 'Превышена квота DeepL API';
    if (code === 'deepl_rate_limited') return 'Слишком много запросов к DeepL API';
    if (code === 'deepl_server_error') return 'Сервер DeepL временно недоступен';
    if (code === 'deepl_api_timeout') return 'DeepL API не ответил вовремя (timeout)';
    if (code === 'deepl_api_network_error') return `Сетевая ошибка: ${raw || 'нет соединения'}`;
    if (code === 'deepl_api_request_failed') return `Ошибка DeepL API: ${raw || 'request failed'}`;
    if (code === 'libre_api_key_invalid') return 'Неверный LibreTranslate API Key';
    if (code === 'libre_rate_limited') return 'Слишком много запросов к LibreTranslate';
    if (code === 'libre_bad_request') return `Некорректный запрос к LibreTranslate: ${raw || 'проверьте параметры'}`;
    if (code === 'libre_server_error') return 'Сервер LibreTranslate временно недоступен';
    if (code === 'libre_api_timeout') return 'LibreTranslate API не ответил вовремя (timeout)';
    if (code === 'libre_api_network_error') return `Сетевая ошибка LibreTranslate: ${raw || 'нет соединения'}`;
    if (code === 'libre_api_request_failed') return `Ошибка LibreTranslate API: ${raw || 'request failed'}`;
    if (code === 'empty_translation') return 'API вернул пустой перевод';
    if (code === 'text_required') return 'Нет текста для перевода';

    if (raw) return raw;
    return 'Ошибка перевода';
  }

  function openTranslateModal() {
    els.translateModal.classList.remove('hidden');
  }

  function closeTranslateModal() {
    els.translateModal.classList.add('hidden');
  }

  function syncHoverTranslateTargetLang() {
    const targetLang = normalizeTranslateTargetLang(state.translateTargetLang || 'RU');
    for (const webview of state.webviews.values()) {
      safeExecuteInWebview(webview, setHoverTranslateTargetLangScript(targetLang), true).catch(() => {});
    }
  }

  async function translateTextAndRender(text, mode, sourceLang = 'AUTO', targetLang = 'RU') {
    if (!text || !text.trim()) {
      setStatus('Нет текста для перевода');
      return { ok: false };
    }

    const provider = String(state.settings?.translateProvider || 'deepl').toLowerCase();
    const response = await window.waDeck.translateText({
      text: text.trim(),
      provider,
      sourceLang,
      targetLang,
    });
    if (!response?.ok) {
      setStatus(`Перевод: ${mapTranslateError(response)}`);
      return { ok: false, response };
    }
    const targetLabel = String(response.targetLanguage || targetLang || 'ru').toLowerCase();
    const providerLabel = provider === 'libre' ? 'LibreTranslate' : 'DeepL';
    setStatus(`Перевод готов (${providerLabel}: ${response.detectedSourceLanguage || 'auto'} -> ${targetLabel})`);
    return { ok: true, response };
  }

  async function handleHoverTranslateMessage(accountId, message) {
    if (!message.startsWith('__WADECK_HOVER_TRANSLATE__')) return false;
    const webview = state.webviews.get(accountId);
    if (!webview) return true;

    let payload = null;
    try {
      payload = JSON.parse(message.slice('__WADECK_HOVER_TRANSLATE__'.length));
    } catch {
      return true;
    }
    const requestId = String(payload?.requestId || '').trim();
    const type = String(payload?.type || 'translate').trim().toLowerCase();
    if (type === 'copy') {
      const translatedText = String(payload?.text || '').trim();
      if (!translatedText) return true;
      await window.waDeck.setClipboardText(translatedText);
      setStatus('Перевод скопирован');
      return true;
    }
    const rowId = String(payload?.rowId || '').trim();
    const text = String(payload?.text || '').trim();
    const targetLang = normalizeTranslateTargetLang(payload?.targetLang || state.translateTargetLang || 'RU');
    if (!requestId || !rowId || !text) return true;
    if (state.hoverTranslatePending.has(requestId)) return true;
    state.hoverTranslatePending.add(requestId);

    try {
      state.translateTargetLang = targetLang;
      if (els.translateTargetLang) {
        els.translateTargetLang.value = targetLang;
      }
      const result = await translateTextAndRender(text, 'hover', 'AUTO', targetLang);
      const provider = String(state.settings?.translateProvider || 'deepl').toLowerCase();
      const providerLabel = provider === 'libre' ? 'LibreTranslate' : 'DeepL';
      const responsePayload = result?.ok
        ? {
            rowId,
            text: String(result.response?.translatedText || ''),
            meta: `${providerLabel} • ${String(result.response?.detectedSourceLanguage || 'auto').toUpperCase()} → ${String(
              result.response?.targetLanguage || targetLang,
            ).toUpperCase()}`,
            targetLang,
            isError: false,
          }
        : {
            rowId,
            text: mapTranslateError(result?.response || {}),
            meta: 'Ошибка перевода',
            targetLang,
            isError: true,
          };
      await webview.executeJavaScript(applyHoverTranslationResultScript(responsePayload), true).catch(() => {});
    } finally {
      state.hoverTranslatePending.delete(requestId);
    }
    return true;
  }

  async function fillTranslateInputFromSelection() {
    const text = await getSelectedTextFromActiveWebview();
    if (!text) {
      setStatus('Сначала выделите текст в чате');
      return;
    }
    els.translateInput.value = text;
  }

  async function testTranslateApi(provider = 'deepl') {
    const safeProvider = String(provider || 'deepl').toLowerCase() === 'libre' ? 'libre' : 'deepl';
    const result = await window.waDeck.testTranslateApi({ provider: safeProvider });
    if (!result?.ok) {
      setStatus(`Проверка API: ${mapTranslateError(result)}`);
      return;
    }
    const providerLabel = safeProvider === 'libre' ? 'LibreTranslate' : 'DeepL';
    setStatus(
      `Проверка ${providerLabel}: OK (${result.detectedSourceLanguage || 'auto'} -> ru): ${String(result.translatedText || '').slice(0, 80)}`,
    );
  }

  async function doModalTranslate() {
    const sourceLang = String(els.translateSourceLang.value || 'AUTO').toUpperCase();
    const targetLang = String(els.translateTargetLang.value || 'RU').toUpperCase();
    let text = String(els.translateInput.value || '').trim();
    if (!text) {
      text = await getSelectedTextFromActiveWebview();
      if (text) {
        els.translateInput.value = text;
      }
    }
    if (!text) {
      setStatus('Введите текст или возьмите выделенный из чата');
      return;
    }

    state.translateSourceLang = sourceLang;
    state.translateTargetLang = targetLang;

    const result = await runWithBusyButton(
      els.doTranslate,
      () => translateTextAndRender(text, 'ручной', sourceLang, targetLang),
      { text: 'Перевожу...', title: 'Перевод выполняется' },
    );
    if (!result?.ok) {
      return;
    }

    els.translateOutput.value = String(result.response.translatedText || '');
  }

  async function copyTranslateOutput() {
    const text = String(els.translateOutput.value || '').trim();
    if (!text) {
      setStatus('Сначала сделайте перевод');
      return;
    }
    await window.waDeck.setClipboardText(text);
    setStatus('Перевод скопирован');
  }

  window.WaDeckTranslateModule = {
    init,
    normalizeTranslateTargetLang,
    getSelectedTranslateProvider,
    setSelectedTranslateProvider,
    syncHoverTranslateTargetLang,
    handleHoverTranslateMessage,
    openTranslateModal,
    closeTranslateModal,
    fillTranslateInputFromSelection,
    testTranslateApi,
    doModalTranslate,
    copyTranslateOutput,
  };
})();
