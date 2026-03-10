const state = {
  accounts: [],
  activeAccountId: null,
  settings: null,
  runtime: null,
  webviews: new Map(),
  panelHidden: true,
  templates: [],
  scheduleRunnerTimer: null,
  attachmentsDraft: [],
  scheduleRunnerBusy: false,
  scheduleTarget: {
    accountId: '',
    accountName: '',
    chatName: '',
  },
  chatPickerCache: new Map(),
  unreadByAccount: new Map(),
  unreadPollTimer: null,
  dockBadgeTimer: null,
  autoUpdateUnsubscribe: null,
  translateTargetLang: 'RU',
  translateSourceLang: 'AUTO',
  aiModel: 'google/gemma-3-4b-it',
  aiMode: 'warm',
  aiContextCount: 3,
  aiReplySourceLang: true,
  aiRolePrompt: '',
  accountMenuAccountId: '',
  crmEditable: false,
  crmTarget: {
    accountId: '',
    accountName: '',
    contactName: '',
    filePath: '',
  },
};

const els = {
  appRoot: document.getElementById('app-root'),
  brandFrog: document.getElementById('brand-frog'),
  brandMoneyBurst: document.getElementById('brand-money-burst'),
  accountsList: document.getElementById('accounts-list'),
  addAccount: document.getElementById('add-account'),
  webviews: document.getElementById('webviews'),
  status: document.getElementById('status'),
  refreshActive: document.getElementById('refresh-active'),
  freezeActive: document.getElementById('freeze-active'),
  openTranslateModal: document.getElementById('open-translate-modal'),
  openAiModal: document.getElementById('open-ai-modal'),
  openCrmModal: document.getElementById('open-crm-modal'),
  activeUnread: document.getElementById('active-unread'),
  activeUnreadCount: document.getElementById('active-unread-count'),
  togglePanel: document.getElementById('toggle-panel'),
  panel: document.getElementById('panel'),
  closePanel: document.getElementById('close-panel'),
  manualUpdate: document.getElementById('manual-update'),
  themeToggle: document.getElementById('theme-toggle'),
  panelStatus: document.getElementById('panel-status'),

  translateProviderDeepl: document.getElementById('translate-provider-deepl'),
  translateProviderLibre: document.getElementById('translate-provider-libre'),
  deeplApiKey: document.getElementById('deepl-api-key'),
  toggleDeeplApiKey: document.getElementById('toggle-deepl-api-key'),
  libreTranslateUrl: document.getElementById('libretranslate-url'),
  libreTranslateApiKey: document.getElementById('libretranslate-api-key'),
  toggleLibreTranslateApiKey: document.getElementById('toggle-libretranslate-api-key'),
  saveSettings: document.getElementById('save-settings'),
  testTranslateApiDeepl: document.getElementById('test-translate-api-deepl'),
  testTranslateApiLibre: document.getElementById('test-translate-api-libre'),
  aiApiKey: document.getElementById('ai-api-key'),
  toggleAiApiKey: document.getElementById('toggle-ai-api-key'),
  aiModel: document.getElementById('ai-model'),
  refreshAiModels: document.getElementById('refresh-ai-models'),
  aiRolePrompt: document.getElementById('ai-role-prompt'),
  templateSelect: document.getElementById('template-select'),
  templateTitle: document.getElementById('template-title'),
  templateText: document.getElementById('template-text'),
  templateSave: document.getElementById('template-save'),
  templateNew: document.getElementById('template-new'),
  templateDelete: document.getElementById('template-delete'),
  templateToChat: document.getElementById('template-to-chat'),

  scheduleTarget: document.getElementById('schedule-target'),
  openChatPicker: document.getElementById('open-chat-picker'),
  scheduleText: document.getElementById('schedule-text'),
  scheduleAt: document.getElementById('schedule-at'),
  pickAttachments: document.getElementById('pick-attachments'),
  clearAttachments: document.getElementById('clear-attachments'),
  attachmentsList: document.getElementById('attachments-list'),
  createSchedule: document.getElementById('create-schedule'),
  scheduledList: document.getElementById('scheduled-list'),
  chatPickerModal: document.getElementById('chat-picker-modal'),
  pickerAccount: document.getElementById('picker-account'),
  pickerChat: document.getElementById('picker-chat'),
  pickerRefresh: document.getElementById('picker-refresh'),
  pickerCancel: document.getElementById('picker-cancel'),
  pickerApply: document.getElementById('picker-apply'),
  accountMenuModal: document.getElementById('account-menu-modal'),
  accountMenuTitle: document.getElementById('account-menu-title'),
  accountMenuName: document.getElementById('account-menu-name'),
  accountMenuSave: document.getElementById('account-menu-save'),
  accountMenuFreeze: document.getElementById('account-menu-freeze'),
  accountMenuCancel: document.getElementById('account-menu-cancel'),

  translateModal: document.getElementById('translate-modal'),
  translateSourceLang: document.getElementById('translate-source-lang'),
  translateTargetLang: document.getElementById('translate-target-lang'),
  translateInput: document.getElementById('translate-input'),
  translateOutput: document.getElementById('translate-output'),
  fillSelectedText: document.getElementById('fill-selected-text'),
  doTranslate: document.getElementById('do-translate'),
  copyTranslate: document.getElementById('copy-translate'),
  clearTranslate: document.getElementById('clear-translate'),
  closeTranslateModal: document.getElementById('close-translate-modal'),

  aiModal: document.getElementById('ai-modal'),
  aiInput: document.getElementById('ai-input'),
  aiOutput: document.getElementById('ai-output'),
  aiModeShort: document.getElementById('ai-mode-short'),
  aiModeWarm: document.getElementById('ai-mode-warm'),
  aiModeBusiness: document.getElementById('ai-mode-business'),
  aiModeFlirt: document.getElementById('ai-mode-flirt'),
  aiContextCount: document.getElementById('ai-context-count'),
  aiReplySourceLang: document.getElementById('ai-reply-source-lang'),
  fillAiSelectedText: document.getElementById('fill-ai-selected-text'),
  doAiReply: document.getElementById('do-ai-reply'),
  copyAiReply: document.getElementById('copy-ai-reply'),
  insertAiReply: document.getElementById('insert-ai-reply'),
  clearAi: document.getElementById('clear-ai'),
  closeAiModal: document.getElementById('close-ai-modal'),

  crmModal: document.getElementById('crm-modal'),
  crmContactName: document.getElementById('crm-contact-name'),
  crmFullName: document.getElementById('crm-full-name'),
  crmCountryCity: document.getElementById('crm-country-city'),
  crmAbout: document.getElementById('crm-about'),
  crmMyInfo: document.getElementById('crm-my-info'),
  crmEdit: document.getElementById('crm-edit'),
  crmSave: document.getElementById('crm-save'),
  crmCopy: document.getElementById('crm-copy'),
  crmClose: document.getElementById('crm-close'),
  crmMeta: document.getElementById('crm-meta'),
};

let templateController = null;

function normalizeTheme(value) {
  return String(value || '').toLowerCase() === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  const safeTheme = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', safeTheme);
  if (els.themeToggle) {
    els.themeToggle.title = safeTheme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему';
  }
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

function bindPasswordToggle(inputEl, toggleBtn, visibleTitle = 'Скрыть ключ', hiddenTitle = 'Показать ключ') {
  if (!inputEl || !toggleBtn) return;
  toggleBtn.addEventListener('click', () => {
    const nextIsPassword = inputEl.type !== 'password';
    inputEl.type = nextIsPassword ? 'password' : 'text';
    toggleBtn.classList.toggle('is-revealed', !nextIsPassword);
    toggleBtn.title = nextIsPassword ? hiddenTitle : visibleTitle;
  });
}

function resetPasswordFieldVisibility(inputEl, toggleBtn) {
  if (!inputEl || !toggleBtn) return;
  inputEl.type = 'password';
  toggleBtn.classList.remove('is-revealed');
  toggleBtn.title = 'Показать ключ';
}

function setStatus(text) {
  els.status.textContent = text;
  els.status.title = text;
  if (els.panelStatus) {
    els.panelStatus.textContent = text;
    els.panelStatus.title = text;
  }
}

function handleAutoUpdateStatus(payload = {}) {
  const status = String(payload?.status || '').trim();
  const message = String(payload?.message || '').trim() || 'временно недоступно';
  const version = String(payload?.version || '').trim();
  const percent = Number(payload?.percent || 0);

  if (status === 'disabled') {
    setStatus('Обновление доступно только в собранной версии');
    return;
  }
  if (status === 'checking') {
    setStatus('Обновление: проверка...');
    return;
  }
  if (status === 'available') {
    setStatus(`Обновление: доступна версия ${version || 'новая'}`);
    return;
  }
  if (status === 'downloading') {
    setStatus(`Обновление: загрузка ${Math.max(0, Math.min(100, percent))}%`);
    return;
  }
  if (status === 'downloaded') {
    setStatus(`Обновление ${version || ''} загружено`);
    return;
  }
  if (status === 'not-available') {
    setStatus(`Обновление: ${message}`);
    return;
  }
  if (status === 'error') {
    setStatus(`Обновление: ${message}`);
  }
}

function playFrogMoneyBurst() {
  if (!els.brandFrog || !els.brandMoneyBurst) return;
  els.brandFrog.classList.remove('is-burst');
  // force reflow to re-run animation on repeated clicks
  void els.brandFrog.offsetWidth;
  els.brandFrog.classList.add('is-burst');
  els.brandMoneyBurst.innerHTML = '';

  const particleCount = 9;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'money-particle';
    particle.textContent = '€';
    const dx = 18 + Math.random() * 46;
    const dy = -28 - Math.random() * 34;
    const rot = -26 + Math.random() * 52;
    const delay = Math.random() * 0.12;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.setProperty('--rot', `${rot}deg`);
    particle.style.setProperty('--delay', `${delay.toFixed(2)}s`);
    particle.style.left = `${56 + Math.random() * 12}%`;
    particle.style.top = `${52 + Math.random() * 14}%`;
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
    els.brandMoneyBurst.appendChild(particle);
  }

  setTimeout(() => {
    els.brandFrog?.classList.remove('is-burst');
  }, 720);
}

async function requestManualUpdate() {
  if (!window.waDeck?.checkForUpdates) {
    setStatus('Обновление недоступно');
    return;
  }
  els.manualUpdate?.classList.add('is-loading');
  const response = await window.waDeck.checkForUpdates({ source: 'manual_button' });
  if (response?.ok) {
    setStatus('Обновление: запрос отправлен');
  } else if (response?.error === 'not_packaged') {
    setStatus('Обновление доступно только в .dmg/.exe сборке');
  } else if (response?.error === 'mac_signature_required') {
    setStatus('Для macOS: обновление вручную через GitHub Releases');
  } else if (response?.error) {
    setStatus(`Обновление: ${response.error}`);
  }
  setTimeout(() => {
    els.manualUpdate?.classList.remove('is-loading');
  }, 520);
}

function scheduleDockBadgeSync() {
  if (state.dockBadgeTimer) {
    return;
  }

  state.dockBadgeTimer = setTimeout(async () => {
    state.dockBadgeTimer = null;
    const total = state.accounts.reduce((acc, account) => {
      const count = Number(state.unreadByAccount.get(account.id) || 0);
      return acc + Math.max(0, count);
    }, 0);

    const result = await window.waDeck.setDockBadge({ count: total }).catch(() => null);
    if (!result?.ok) {
      // keep silent in UI, but allow next attempts
      return;
    }
  }, 250);
}

function parseUnreadFromTitle(title) {
  const match = String(title || '').match(/\((\d+)\)/);
  if (!match) return 0;
  return Number(match[1] || 0) || 0;
}

function updateActiveUnreadIndicator() {
  const activeId = state.activeAccountId;
  const count = activeId ? Number(state.unreadByAccount.get(activeId) || 0) : 0;
  if (count > 0) {
    els.activeUnread.classList.remove('hidden');
    els.activeUnreadCount.textContent = count > 99 ? '99+' : String(count);
  } else {
    els.activeUnread.classList.add('hidden');
    els.activeUnreadCount.textContent = '0';
  }
}

function setUnreadCount(accountId, count) {
  const safeId = String(accountId || '');
  if (!safeId) return;
  const safeCount = Math.max(0, Number(count) || 0);
  const prev = Number(state.unreadByAccount.get(safeId) || 0);
  if (prev === safeCount) {
    updateActiveUnreadIndicator();
    scheduleDockBadgeSync();
    return;
  }
  state.unreadByAccount.set(safeId, safeCount);
  renderAccounts();
  updateActiveUnreadIndicator();
  scheduleDockBadgeSync();
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

function formatDateTime(iso) {
  const dt = new Date(iso || '');
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('ru-RU');
}

function toLocalDateTimeInput(iso) {
  const dt = new Date(iso || '');
  if (Number.isNaN(dt.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

function nextSendAtLocal(minutes = 5) {
  const dt = new Date(Date.now() + minutes * 60 * 1000);
  dt.setMilliseconds(0);
  return toLocalDateTimeInput(dt.toISOString());
}

function activeAccount() {
  return state.accounts.find((acc) => acc.id === state.activeAccountId) || null;
}

function updateFreezeButtonState() {
  const account = activeAccount();
  if (!els.freezeActive) return;
  const frozen = Boolean(account?.frozen);
  els.freezeActive.classList.toggle('is-active', frozen);
  els.freezeActive.title = frozen
    ? 'Разморозить активный WhatsApp'
    : 'Заморозить/разморозить активный WhatsApp';
}

function selectedWebview() {
  if (!state.activeAccountId) return null;
  return state.webviews.get(state.activeAccountId) || null;
}

function accountById(accountId) {
  return state.accounts.find((account) => account.id === String(accountId || '')) || null;
}

function patchLocalAccount(updated) {
  if (!updated || !updated.id) return;
  state.accounts = state.accounts.map((account) => {
    if (account.id !== updated.id) return account;
    return {
      ...account,
      ...updated,
    };
  });
}

function renderAccounts() {
  els.accountsList.innerHTML = '';

  for (const account of state.accounts) {
    const card = document.createElement('div');
    card.className = `account-item ${state.activeAccountId === account.id ? 'active' : ''} ${account.frozen ? 'frozen' : ''}`;
    card.addEventListener('click', () => setActiveAccount(account.id));

    const chip = document.createElement('div');
    chip.className = 'account-chip';
    chip.style.background = account.color;
    chip.textContent = account.name.slice(0, 2).toUpperCase();
    chip.title = `${account.name}: управление`;
    chip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAccountMenu(account.id);
    });

    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = account.name;

    const remove = document.createElement('button');
    remove.className = 'account-remove';
    remove.title = `Удалить ${account.name}`;
    remove.textContent = '×';
    remove.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeAccount(account.id).catch(console.error);
    });

    const unread = Number(state.unreadByAccount.get(account.id) || 0);
    if (unread > 0) {
      const badge = document.createElement('div');
      badge.className = 'account-unread';
      badge.textContent = unread > 99 ? '99+' : String(unread);
      card.appendChild(badge);
    }

    if (account.frozen) {
      const frozenTag = document.createElement('div');
      frozenTag.className = 'account-frozen-tag';
      frozenTag.title = 'Аккаунт заморожен';
      frozenTag.textContent = '❄';
      card.appendChild(frozenTag);
    }

    card.append(remove, chip, name);
    els.accountsList.appendChild(card);
  }
}

function ensureWebview(account) {
  if (account?.frozen) return;
  if (state.webviews.has(account.id)) return;

  const webview = document.createElement('webview');
  webview.partition = account.partition;
  webview.src = account.url;
  if (state.runtime?.waUserAgent) {
    webview.setAttribute('useragent', state.runtime.waUserAgent);
  }
  webview.setAttribute('allowpopups', 'false');
  webview.setAttribute('webpreferences', 'contextIsolation=yes');

  webview.addEventListener('did-start-loading', () => {
    if (account.id === state.activeAccountId) {
      setStatus(`${account.name}: загрузка...`);
    }
  });

  webview.addEventListener('did-finish-load', () => {
    if (account.id === state.activeAccountId) {
      setStatus(`${account.name}: готово`);
    }
  });

  webview.addEventListener('page-title-updated', (event) => {
    const title = String(event?.title || '');
    const count = parseUnreadFromTitle(title);
    setUnreadCount(account.id, count);
  });

  const bindDomHelpers = () => {
    if (typeof webview.setUserAgent === 'function' && state.runtime?.waUserAgent) {
      webview.setUserAgent(state.runtime.waUserAgent);
    }

    webview
      .executeJavaScript(
        `(() => {
          if (window.__waDeckBridgeBound) return true;
          window.__waDeckBridgeBound = true;
          window.__waDeckLastClickedText = '';

          const normalize = (value) =>
            String(value || '')
              .replace(/\\u200e|\\u200f/g, '')
              .replace(/\\u00a0/g, ' ')
              .replace(/\\r/g, '')
              .replace(/[ \\t]+\\n/g, '\\n')
              .replace(/\\n[ \\t]+/g, '\\n')
              .replace(/[ \\t]{2,}/g, ' ')
              .trim();

          const extractTextFromNode = (node) => {
            if (!node) return '';
            if (node.nodeType === Node.TEXT_NODE) {
              return node.nodeValue || '';
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return '';
            }

            const element = node;
            const tag = String(element.tagName || '').toUpperCase();

            if (tag === 'BR') return '\\n';
            if (tag === 'IMG') {
              return element.getAttribute('alt') || '';
            }
            if (tag === 'SPAN' && element.getAttribute('data-icon') === 'reaction') {
              return '';
            }

            let out = '';
            for (const child of Array.from(element.childNodes || [])) {
              out += extractTextFromNode(child);
            }
            return out;
          };

          const extractMessageFromRow = (row) => {
            if (!row) return '';
            const stripWhatsappPrefix = (line) =>
              String(line || '')
                .replace(/^\\[\\d{1,2}:\\d{2}(?:,\\s*[^\\]]+)?\\]\\s*[^:]{1,80}:\\s*/u, '')
                .replace(/^\\d{1,2}:\\d{2}\\s*[-–—]\\s*[^:]{1,80}:\\s*/u, '');
            const cleanupMeta = (value) => {
              if (!value) return '';
              const lines = String(value)
                .split('\\n')
                .map((line) => normalize(stripWhatsappPrefix(line)))
                .filter(Boolean)
                .filter((line) => !/^\\d{1,2}:\\d{2}$/.test(line))
                .filter((line) => !/^\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}$/.test(line));
              return normalize(lines.join('\\n'));
            };

            const candidates = Array.from(
              row.querySelectorAll(
                '[data-testid=\"msg-text\"], span.selectable-text.copyable-text, span.selectable-text, div.selectable-text.copyable-text'
              )
            );

            let best = '';
            for (const candidate of candidates) {
              const text = cleanupMeta(extractTextFromNode(candidate));
              if (text.length > best.length) {
                best = text;
              }
            }

            if (!best) {
              const clone = row.cloneNode(true);
              const metaNodes = clone.querySelectorAll(
                '[data-testid=\"msg-meta\"], [data-testid=\"msg-time\"], time, [aria-label*=\"Delivered\"], [aria-label*=\"Read\"], [aria-label*=\"Отправ\"], [aria-label*=\"Прочит\"]'
              );
              metaNodes.forEach((node) => node.remove());
              best = cleanupMeta(extractTextFromNode(clone));
            }

            return best;
          };

          window.__waDeckNormalizeText = normalize;
          window.__waDeckExtractMessageFromRow = extractMessageFromRow;

          document.addEventListener('click', (event) => {
            const row = event.target && event.target.closest ? event.target.closest('[data-pre-plain-text]') : null;
            if (!row) return;
            const text = extractMessageFromRow(row);
            if (text) window.__waDeckLastClickedText = text;
          }, true);

          return true;
        })();`,
        true,
      )
      .catch(() => {});
  };

  webview.addEventListener('dom-ready', bindDomHelpers);
  webview.addEventListener('did-navigate-in-page', bindDomHelpers);

  state.webviews.set(account.id, webview);
  els.webviews.appendChild(webview);
}

function refreshWebviewVisibility() {
  for (const [accountId, webview] of state.webviews.entries()) {
    if (accountId === state.activeAccountId) {
      webview.classList.add('active');
    } else {
      webview.classList.remove('active');
    }
  }
}

function setActiveAccount(accountId) {
  state.activeAccountId = accountId;
  renderAccounts();
  updateFreezeButtonState();
  updateActiveUnreadIndicator();
  refreshWebviewVisibility();
  const account = activeAccount();
  if (account) {
    if (account.frozen) {
      setStatus(`Аккаунт: ${account.name} (заморожен)`);
    } else {
      setStatus(`Аккаунт: ${account.name}`);
    }
    if (!state.scheduleTarget.accountId) {
      state.scheduleTarget.accountId = account.id;
      state.scheduleTarget.accountName = account.name;
      renderScheduleTarget();
    }
  } else {
    setStatus('Нет активного аккаунта');
  }
  scheduleDockBadgeSync();
  renderScheduled().catch(console.error);
}

function applySettingsToForm() {
  state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
  applyTheme(state.settings.uiTheme);
  setSelectedTranslateProvider(state.settings.translateProvider || 'deepl');
  els.deeplApiKey.value = state.settings.deeplApiKey || '';
  els.libreTranslateUrl.value = state.settings.libreTranslateUrl || 'https://libretranslate.com/translate';
  els.libreTranslateApiKey.value = state.settings.libreTranslateApiKey || '';
  els.aiApiKey.value = state.settings.aiApiKey || '';
  els.aiRolePrompt.value = state.settings.aiRolePrompt || '';
  resetPasswordFieldVisibility(els.deeplApiKey, els.toggleDeeplApiKey);
  resetPasswordFieldVisibility(els.libreTranslateApiKey, els.toggleLibreTranslateApiKey);
  resetPasswordFieldVisibility(els.aiApiKey, els.toggleAiApiKey);
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

function updatePanelVisibility() {
  els.panel.classList.toggle('hidden', state.panelHidden);
  els.appRoot.classList.toggle('panel-hidden', state.panelHidden);
}

function openSettingsPanel() {
  state.panelHidden = false;
  updatePanelVisibility();
  if (!els.crmModal.classList.contains('hidden')) {
    setTimeout(() => {
      updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

function closeSettingsPanel() {
  state.panelHidden = true;
  updatePanelVisibility();
  if (!els.crmModal.classList.contains('hidden')) {
    setTimeout(() => {
      updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

function renderScheduleTarget() {
  if (!state.scheduleTarget.accountId || !state.scheduleTarget.chatName) {
    els.scheduleTarget.value = '';
    return;
  }
  els.scheduleTarget.value = `${state.scheduleTarget.accountName} / ${state.scheduleTarget.chatName}`;
}

function collectChatsFromSidebarScript() {
  return `(async () => {
    const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
    const looksLikeTime = (value) => /^\\d{1,2}:\\d{2}$/.test(value) || /^\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}$/.test(value);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];

    const takeTitles = () => {
      const set = new Set();
      const items = Array.from(
        document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"], #pane-side [aria-selected]')
      );
      for (const item of items) {
        const byTitle = Array.from(item.querySelectorAll('span[title], div[title]'))
          .map((node) => normalize(node.getAttribute('title') || ''))
          .find((text) => text && !looksLikeTime(text));
        if (byTitle) {
          set.add(byTitle);
          continue;
        }
        const lines = String(item.innerText || '')
          .split('\\n')
          .map((line) => normalize(line))
          .filter((line) => line && !looksLikeTime(line));
        if (lines[0]) set.add(lines[0]);
      }
      return set;
    };

    const out = new Set();
    pane.scrollTop = 0;
    await sleep(120);

    let idle = 0;
    for (let round = 0; round < 40 && idle < 3; round += 1) {
      for (const title of takeTitles()) out.add(title);
      const prev = pane.scrollTop;
      pane.scrollTop += Math.max(120, Math.floor(pane.clientHeight * 0.82));
      await sleep(110);
      if (pane.scrollTop === prev) idle += 1;
      else idle = 0;
    }

    pane.scrollTop = 0;
    await sleep(60);
    for (const title of takeTitles()) out.add(title);

    return Array.from(out).sort((a, b) => a.localeCompare(b));
  })();`;
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

function openAccountMenu(accountId) {
  const account = accountById(accountId);
  if (!account) return;

  state.accountMenuAccountId = account.id;
  els.accountMenuTitle.textContent = `Управление: ${account.name}`;
  els.accountMenuName.value = account.name;
  els.accountMenuFreeze.textContent = account.frozen ? 'Разморозить' : 'Заморозить';
  els.accountMenuModal.classList.remove('hidden');
}

function closeAccountMenu() {
  state.accountMenuAccountId = '';
  els.accountMenuModal.classList.add('hidden');
}

async function saveAccountNameFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const nextName = String(els.accountMenuName.value || '').trim();
  if (!nextName) {
    setStatus('Введите название аккаунта');
    return;
  }

  const response = await window.waDeck.renameAccount({ accountId, name: nextName });
  if (!response?.ok || !response.account) {
    setStatus(`Не удалось изменить имя: ${response?.error || 'error'}`);
    return;
  }

  patchLocalAccount(response.account);
  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget.accountName = response.account.name;
    renderScheduleTarget();
  }
  renderAccounts();
  openAccountMenu(accountId);
  setStatus(`Имя обновлено: ${response.account.name}`);
}

async function toggleFreezeFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const nextFrozen = !Boolean(account.frozen);
  await setAccountFrozenState(accountId, nextFrozen, { reopenMenu: true });
}

async function setAccountFrozenState(accountId, nextFrozen, options = {}) {
  const account = accountById(accountId);
  if (!account) return { ok: false };

  const response = await window.waDeck.setAccountFrozen({ accountId, frozen: nextFrozen });
  if (!response?.ok || !response.account) {
    setStatus(`Не удалось изменить режим: ${response?.error || 'error'}`);
    return { ok: false, response };
  }

  patchLocalAccount(response.account);

  if (response.account.frozen) {
    const webview = state.webviews.get(accountId);
    if (webview && webview.parentNode) {
      webview.parentNode.removeChild(webview);
    }
    state.webviews.delete(accountId);
    state.chatPickerCache.delete(accountId);
    setUnreadCount(accountId, 0);
    if (state.activeAccountId === accountId) {
      refreshWebviewVisibility();
    }
    setStatus(`Аккаунт ${response.account.name} заморожен`);
  } else {
    const fullAccount = accountById(accountId);
    if (fullAccount) {
      ensureWebview(fullAccount);
    }
    refreshWebviewVisibility();
    setStatus(`Аккаунт ${response.account.name} разморожен`);
  }

  renderAccounts();
  updateFreezeButtonState();
  if (options.reopenMenu) {
    openAccountMenu(accountId);
  }
  return { ok: true, account: response.account };
}

async function toggleActiveFreeze() {
  const account = activeAccount();
  if (!account) {
    setStatus('Нет активного аккаунта');
    return;
  }
  await setAccountFrozenState(account.id, !Boolean(account.frozen), { reopenMenu: false });
}

function selectedTextScript() {
  return `(() => {
    const normalize = typeof window.__waDeckNormalizeText === 'function'
      ? window.__waDeckNormalizeText
      : ((value) => String(value || '')
          .replace(/\\u200e|\\u200f/g, '')
          .replace(/\\u00a0/g, ' ')
          .replace(/\\r/g, '')
          .replace(/[ \\t]+\\n/g, '\\n')
          .replace(/\\n[ \\t]+/g, '\\n')
          .replace(/[ \\t]{2,}/g, ' ')
          .trim());
    const stripWhatsappPrefix = (line) =>
      String(line || '')
        .replace(/^\\[\\d{1,2}:\\d{2}(?:,\\s*[^\\]]+)?\\]\\s*[^:]{1,80}:\\s*/u, '')
        .replace(/^\\d{1,2}:\\d{2}\\s*[-–—]\\s*[^:]{1,80}:\\s*/u, '');
    const cleanupMeta = (value) => {
      if (!value) return '';
      const lines = String(value)
        .split('\\n')
        .map((line) => normalize(stripWhatsappPrefix(line)))
        .filter(Boolean)
        .filter((line) => !/^\\d{1,2}:\\d{2}$/.test(line))
        .filter((line) => !/^\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}$/.test(line));
      return normalize(lines.join('\\n'));
    };

    const selection = window.getSelection();
    const selected = cleanupMeta(selection?.toString() || '');
    const findRow = (node) => (node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest?.('[data-pre-plain-text]') || null;

    if (selection && selected) {
      const anchorRow = findRow(selection.anchorNode);
      const focusRow = findRow(selection.focusNode);
      if (anchorRow && anchorRow === focusRow && typeof window.__waDeckExtractMessageFromRow === 'function') {
        const full = cleanupMeta(window.__waDeckExtractMessageFromRow(anchorRow) || '');
        if (full) return full;
      }
      return selected;
    }

    const lastClicked = cleanupMeta(window.__waDeckLastClickedText || '');
    return lastClicked || '';
  })();`;
}

function collectUnreadCountScript() {
  return `(() => {
    const badges = Array.from(document.querySelectorAll('#pane-side [aria-label*="непрочит"], #pane-side [aria-label*="unread"], #pane-side [data-testid="icon-unread-count"]'));
    let total = 0;
    for (const badge of badges) {
      const text = String(badge.textContent || badge.getAttribute('aria-label') || '').trim();
      const match = text.match(/(\d+)/);
      if (match) total += Number(match[1] || 0) || 0;
    }

    if (!total) {
      const title = String(document.title || '');
      const t = title.match(/\\((\\d+)\\)/);
      if (t) total = Number(t[1] || 0) || 0;
    }

    return total;
  })();`;
}

async function pollUnreadCounts() {
  for (const account of state.accounts) {
    if (account.frozen) {
      setUnreadCount(account.id, 0);
      continue;
    }
    const webview = state.webviews.get(account.id);
    if (!webview) continue;
    let count = 0;
    try {
      count = Number(await webview.executeJavaScript(collectUnreadCountScript(), true) || 0) || 0;
    } catch {
      count = Number(state.unreadByAccount.get(account.id) || 0);
    }
    setUnreadCount(account.id, count);
  }
}

function startUnreadPolling() {
  if (state.unreadPollTimer) {
    clearInterval(state.unreadPollTimer);
    state.unreadPollTimer = null;
  }
  state.unreadPollTimer = setInterval(() => {
    pollUnreadCounts().catch(() => {});
  }, 5000);
  setTimeout(() => pollUnreadCounts().catch(() => {}), 1200);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
}

function sendScheduledScript(payload) {
  const json = JSON.stringify(payload || {});
  const payloadB64 = encodeBase64Utf8(json);

  return `(async () => {
    try {
      const decodeBase64Utf8 = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      };
      const payload = JSON.parse(decodeBase64Utf8('${payloadB64}'));
      const chatQuery = String(payload.chatName || '').trim().toLowerCase();
      const text = String(payload.text || '');
      const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

      const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const pane = document.querySelector('#pane-side');
      if (!pane) return { ok: false, error: 'sidebar_not_found' };

      const sidebarItems = () =>
        Array.from(
          document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"], #pane-side [aria-selected]')
        );

      const itemTitle = (item) => {
        const t = item.querySelector('span[title], div[title]')?.getAttribute('title');
        if (normalize(t)) return normalize(t);
        const lines = String(item.innerText || '').split('\\n').map((line) => normalize(line)).filter(Boolean);
        return lines[0] || '';
      };

      const clickLikeUser = (node) => {
        if (!node) return;
        if (typeof node.click === 'function') {
          node.click();
          return;
        }
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      };

      const openChatByName = async () => {
        pane.scrollTop = 0;
        await sleep(120);

        let idle = 0;
        for (let round = 0; round < 50 && idle < 3; round += 1) {
          const items = sidebarItems();

          for (const item of items) {
            const title = itemTitle(item).toLowerCase();
            if (!title) continue;
            if (title === chatQuery || title.includes(chatQuery) || chatQuery.includes(title)) {
              clickLikeUser(item);
              await sleep(260);
              return true;
            }
          }

          const prev = pane.scrollTop;
          pane.scrollTop += Math.max(120, Math.floor(pane.clientHeight * 0.8));
          await sleep(150);
          if (pane.scrollTop === prev) idle += 1;
          else idle = 0;
        }
        return false;
      };

      const openResult = await openChatByName();
      if (!openResult) return { ok: false, error: 'chat_not_found' };

      const findComposer = () =>
        document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('footer div[contenteditable="true"][data-tab]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]');

      const clearComposer = (composer) => {
        if (!composer) return;
        try {
          composer.focus();
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(composer);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          document.execCommand('delete');
        } catch {
          // ignore
        }
        composer.textContent = '';
        composer.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const tryPasteText = (composer, message) => {
        try {
          if (typeof DataTransfer === 'undefined' || typeof ClipboardEvent === 'undefined') return false;
          const dt = new DataTransfer();
          dt.setData('text/plain', message);
          const pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
          composer.dispatchEvent(pasteEvent);
          return true;
        } catch {
          return false;
        }
      };

      const setComposerText = async (message) => {
        const composer = findComposer();
        if (!composer) return false;

        const target = normalize(message);
        if (!target) return true;

        clearComposer(composer);
        composer.focus();

        let inserted = false;
        try {
          inserted = document.execCommand('insertText', false, message);
        } catch {
          inserted = false;
        }

        if (!inserted) {
          tryPasteText(composer, message);
        }

        await sleep(70);
        let current = normalize(composer.innerText || composer.textContent || '');
        const token = target.slice(0, Math.min(target.length, 24));

        if (!current || (token && !current.includes(token))) {
          composer.textContent = message;
          try {
            composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
          } catch {
            // ignore
          }
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(70);
          current = normalize(composer.innerText || composer.textContent || '');
        }

        return current.length > 0;
      };

      const findSendButton = () =>
        document.querySelector('button[data-testid="send"]') ||
        document.querySelector('[data-testid="send"]') ||
        document.querySelector('button[aria-label="Send"]') ||
        document.querySelector('button[aria-label*="Отправ"]') ||
        document.querySelector('button[title*="Send"]') ||
        document.querySelector('[data-icon="send"]') ||
        document.querySelector('span[data-icon="send"]');

      const countOutgoing = () =>
        document.querySelectorAll('.message-out [data-pre-plain-text], .message-out [data-testid="msg-text"]').length;

      const waitForTextSent = async (beforeOutgoingCount) => {
        for (let i = 0; i < 18; i += 1) {
          await sleep(170);
          const nowOutgoing = countOutgoing();
          const composer = findComposer();
          const composerText = normalize(composer?.innerText || composer?.textContent || '');
          if (nowOutgoing > beforeOutgoingCount) return true;
          if (!composerText) return true;
        }
        return false;
      };

      const base64ToUint8 = (base64) => {
        const bin = atob(base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) {
          arr[i] = bin.charCodeAt(i);
        }
        return arr;
      };

      const isMediaMime = (mime) => /^(image|video|audio)\\//i.test(String(mime || ''));

      const openAttachMenu = async () => {
        const attachBtn =
          document.querySelector('[data-testid="attach-menu-plus"]') ||
          document.querySelector('button[title*="Attach"]') ||
          document.querySelector('button[title*="Прикреп"]') ||
          document.querySelector('button[aria-label*="Attach"]') ||
          document.querySelector('button[aria-label*="Прикреп"]') ||
          document.querySelector('footer button [data-icon="plus"]')?.closest('button') ||
          document.querySelector('footer span[data-icon="plus"]')?.closest('button');

        if (!attachBtn) return false;
        clickLikeUser(attachBtn);
        await sleep(180);
        return true;
      };

      const pickFileInputs = (kind = 'media') => {
        const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
        const score = (input) => {
          const accept = String(input.getAttribute('accept') || '').toLowerCase();
          let points = 0;
          if (input.closest('footer')) points += 8;
          if (input.multiple) points += 2;
          if (!accept) points += 2;
          if (kind === 'media') {
            if (accept.includes('image') || accept.includes('video') || accept.includes('audio')) points += 6;
            if (accept.includes('*/*')) points += 3;
          } else {
            if (accept.includes('*/*')) points += 8;
            if (accept.includes('application') || accept.includes('text') || accept.includes('pdf') || accept.includes('document')) points += 6;
          }
          return points;
        };

        return inputs.sort((a, b) => score(b) - score(a));
      };

      const findAttachmentSendButton = () =>
        document.querySelector('div[role="dialog"] button[data-testid="send"]') ||
        document.querySelector('div[role="dialog"] [data-testid="send"]') ||
        document.querySelector('div[role="dialog"] button[aria-label="Send"]') ||
        document.querySelector('div[role="dialog"] button[aria-label*="Отправ"]') ||
        document.querySelector('div[role="dialog"] span[data-icon="send"]') ||
        document.querySelector('[data-testid="media-preview"] button[data-testid="send"]');

      const waitForAttachmentSendButton = async () => {
        for (let i = 0; i < 30; i += 1) {
          const btn = findAttachmentSendButton();
          if (btn) return btn;
          await sleep(120);
        }
        return findSendButton();
      };

      const waitForOutgoingIncrease = async (beforeCount) => {
        for (let i = 0; i < 40; i += 1) {
          await sleep(150);
          const nowOutgoing = countOutgoing();
          if (nowOutgoing > beforeCount) return true;
        }
        return false;
      };

      const attachFiles = async () => {
        if (!attachments.length) return true;
        if (typeof DataTransfer === 'undefined') return false;
        const dt = new DataTransfer();
        for (const item of attachments) {
          try {
            const bytes = base64ToUint8(String(item.dataBase64 || ''));
            const mime = String(item.mime || 'application/octet-stream');
            const name = String(item.name || 'file.bin');
            const file = new File([bytes], name, { type: mime });
            dt.items.add(file);
          } catch {
            // ignore broken attachment
          }
        }
        if (!dt.files.length) return true;

        const needsDocumentInput = attachments.some((item) => !isMediaMime(item?.mime));
        const orderedInputs = [
          ...pickFileInputs(needsDocumentInput ? 'document' : 'media'),
          ...pickFileInputs('document'),
          ...pickFileInputs('media'),
        ].filter((input, index, list) => list.indexOf(input) === index);

        if (!orderedInputs.length) return false;

        const beforeOutgoingCount = countOutgoing();
        for (const fileInput of orderedInputs) {
          await openAttachMenu();

          try {
            fileInput.files = dt.files;
          } catch {
            continue;
          }

          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));

          const attachmentSendBtn = await waitForAttachmentSendButton();
          if (!attachmentSendBtn) continue;

          clickLikeUser(attachmentSendBtn.closest('button') || attachmentSendBtn);
          const sent = await waitForOutgoingIncrease(beforeOutgoingCount);
          if (sent) return true;
        }

        return false;
      };

      const sendText = async () => {
        if (!text.trim()) return true;
        const prepared = await setComposerText(text);
        if (!prepared) return false;

        const composer = findComposer();
        if (!composer) return false;
        const beforeOutgoingCount = countOutgoing();

        const sendBtn = findSendButton();
        if (sendBtn) {
          clickLikeUser(sendBtn.closest('button') || sendBtn);
        } else {
          const down = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true });
          const up = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true });
          composer.dispatchEvent(down);
          composer.dispatchEvent(up);
        }

        const confirmed = await waitForTextSent(beforeOutgoingCount);
        return confirmed;
      };

      const attached = await attachFiles();
      const textSent = await sendText();

      if (!attached && attachments.length) {
        return { ok: false, error: 'attachment_send_failed' };
      }
      if (!textSent && text.trim()) {
        return { ok: false, error: 'text_send_failed' };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error || 'send_script_failed') };
    }
  })();`;
}

function openChatForScheduledSendScript(chatName) {
  const chatB64 = encodeBase64Utf8(String(chatName || ''));
  return `(async () => {
    try {
      const decodeBase64Utf8 = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      };

      const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const query = normalize(decodeBase64Utf8('${chatB64}')).toLowerCase();

      const pane = document.querySelector('#pane-side');
      if (!pane) return { ok: false, error: 'sidebar_not_found' };

      const sidebarItems = () =>
        Array.from(
          document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"], #pane-side [aria-selected]')
        );

      const itemTitle = (item) => {
        const byTitle = item.querySelector('span[title], div[title]')?.getAttribute('title');
        if (normalize(byTitle)) return normalize(byTitle);
        const lines = String(item.innerText || '')
          .split('\\n')
          .map((line) => normalize(line))
          .filter(Boolean);
        return lines[0] || '';
      };

      const clickLikeUser = (node) => {
        if (!node) return;
        if (typeof node.click === 'function') {
          node.click();
          return;
        }
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      };

      const scanList = async (direction) => {
        let idle = 0;
        for (let round = 0; round < 55 && idle < 3; round += 1) {
          for (const item of sidebarItems()) {
            const title = itemTitle(item).toLowerCase();
            if (!title) continue;
            if (title === query || title.includes(query) || query.includes(title)) {
              clickLikeUser(item);
              await sleep(260);
              return true;
            }
          }

          const prev = pane.scrollTop;
          if (direction > 0) {
            pane.scrollTop += Math.max(120, Math.floor(pane.clientHeight * 0.84));
          } else {
            pane.scrollTop -= Math.max(120, Math.floor(pane.clientHeight * 0.84));
          }
          await sleep(140);
          if (pane.scrollTop === prev) idle += 1;
          else idle = 0;
        }
        return false;
      };

      pane.scrollTop = 0;
      await sleep(100);
      let opened = await scanList(1);
      if (!opened) {
        pane.scrollTop = pane.scrollHeight;
        await sleep(90);
        opened = await scanList(-1);
      }
      if (!opened) return { ok: false, error: 'chat_not_found' };

      const findComposer = () =>
        document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('footer div[contenteditable="true"][data-tab]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]');

      let composer = null;
      for (let i = 0; i < 18; i += 1) {
        composer = findComposer();
        if (composer) break;
        await sleep(120);
      }

      if (!composer) return { ok: false, error: 'composer_not_found' };

      composer.focus();
      try {
        composer.click();
      } catch {
        // ignore
      }

      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(composer);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand('delete');
      } catch {
        // ignore
      }
      composer.textContent = '';
      composer.dispatchEvent(new Event('input', { bubbles: true }));

      const beforeOutgoingCount = document.querySelectorAll(
        '.message-out [data-pre-plain-text], .message-out [data-testid="msg-text"]'
      ).length;

      return { ok: true, beforeOutgoingCount };
    } catch (error) {
      return { ok: false, error: String(error?.message || error || 'open_chat_failed') };
    }
  })();`;
}

function composerHasTextScript() {
  return `(() => {
    const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
    const composer =
      document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('footer div[contenteditable="true"][data-tab]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]');
    if (!composer) return { ok: false, error: 'composer_not_found', hasText: false };
    const text = normalize(composer.innerText || composer.textContent || '');
    return { ok: true, hasText: Boolean(text) };
  })();`;
}

function setComposerTextFallbackScript(text) {
  const textB64 = encodeBase64Utf8(String(text || ''));
  return `(() => {
    try {
      const decodeBase64Utf8 = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      };
      const message = decodeBase64Utf8('${textB64}');
      const composer =
        document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('footer div[contenteditable="true"][data-tab]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]');
      if (!composer) return { ok: false, error: 'composer_not_found' };
      composer.focus();
      composer.textContent = message;
      try {
        composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
      } catch {
        // ignore
      }
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error || 'set_composer_failed') };
    }
  })();`;
}

function clickSendButtonScript() {
  return `(() => {
    const clickLikeUser = (node) => {
      if (!node) return;
      if (typeof node.click === 'function') {
        node.click();
        return;
      }
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    };

    const sendBtn =
      document.querySelector('button[data-testid="send"]') ||
      document.querySelector('[data-testid="send"]') ||
      document.querySelector('button[aria-label="Send"]') ||
      document.querySelector('button[aria-label*="Отправ"]') ||
      document.querySelector('button[title*="Send"]') ||
      document.querySelector('[data-icon="send"]') ||
      document.querySelector('span[data-icon="send"]');

    if (!sendBtn) return { ok: false, error: 'send_button_not_found' };
    clickLikeUser(sendBtn.closest('button') || sendBtn);
    return { ok: true };
  })();`;
}

function confirmScheduledSentScript(beforeOutgoingCount, expectedText) {
  const safeBefore = Number(beforeOutgoingCount) || 0;
  const expectedB64 = encodeBase64Utf8(String(expectedText || ''));
  return `(async () => {
    try {
      const decodeBase64Utf8 = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      };

      const normalize = (value) => String(value || '').replace(/\\u200e/g, '').replace(/\\s+/g, ' ').trim();
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const expected = normalize(decodeBase64Utf8('${expectedB64}'));
      const token = expected.slice(0, Math.min(26, expected.length));

      const countOutgoing = () =>
        document.querySelectorAll('.message-out [data-pre-plain-text], .message-out [data-testid="msg-text"]').length;

      const readLastOutgoingText = () => {
        const rows = Array.from(document.querySelectorAll('.message-out [data-pre-plain-text]'));
        const row = rows[rows.length - 1];
        if (!row) return '';
        return normalize(
          row.querySelector('span.selectable-text')?.innerText ||
          row.querySelector('[data-testid="msg-text"]')?.innerText ||
          row.innerText ||
          ''
        );
      };

      const composerText = () => {
        const composer =
          document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
          document.querySelector('footer div[contenteditable="true"][data-tab]') ||
          document.querySelector('div[contenteditable="true"][role="textbox"]');
        return normalize(composer?.innerText || composer?.textContent || '');
      };

      for (let i = 0; i < 24; i += 1) {
        await sleep(180);
        if (countOutgoing() > ${safeBefore}) return { ok: true };
        const last = readLastOutgoingText();
        if (token && last && last.includes(token)) return { ok: true };
        if (!composerText()) return { ok: true };
      }

      return { ok: false, error: 'send_not_confirmed' };
    } catch (error) {
      return { ok: false, error: String(error?.message || error || 'send_not_confirmed') };
    }
  })();`;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWebviewInput(webview, event) {
  try {
    const out = webview.sendInputEvent(event);
    if (out && typeof out.then === 'function') {
      await out;
    }
    return true;
  } catch {
    return false;
  }
}

async function sendTextViaClipboard(webview, text) {
  const message = String(text || '');
  if (!message.trim()) return { ok: true };

  let originalClipboard = null;
  try {
    const current = await window.waDeck.getClipboardText();
    if (current?.ok) originalClipboard = String(current.text || '');
  } catch {
    originalClipboard = null;
  }

  try {
    const setRes = await window.waDeck.setClipboardText(message);
    if (!setRes?.ok) return { ok: false, error: 'clipboard_write_failed' };

    if (typeof webview.focus === 'function') {
      webview.focus();
    }

    await delay(70);
    await sendWebviewInput(webview, { type: 'keyDown', keyCode: 'V', modifiers: ['meta'] });
    await sendWebviewInput(webview, { type: 'keyUp', keyCode: 'V', modifiers: ['meta'] });
    await delay(120);

    let composerState = { ok: false, hasText: false };
    try {
      composerState = await webview.executeJavaScript(composerHasTextScript(), true);
    } catch {
      composerState = { ok: false, hasText: false };
    }

    if (!composerState?.hasText) {
      if (typeof webview.insertText === 'function') {
        const out = webview.insertText(message);
        if (out && typeof out.then === 'function') {
          await out;
        }
      } else {
        await webview.executeJavaScript(setComposerTextFallbackScript(message), true);
      }
      await delay(120);
      composerState = await webview.executeJavaScript(composerHasTextScript(), true);
    }

    if (!composerState?.hasText) {
      return { ok: false, error: 'composer_not_filled' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error || 'clipboard_send_failed') };
  } finally {
    if (originalClipboard !== null) {
      await window.waDeck.setClipboardText(originalClipboard).catch(() => {});
    }
  }
}

async function runScheduledSendViaClipboard(webview, item) {
  const text = String(item?.text || '');
  if (!text.trim()) return { ok: true };

  try {
    const opened = await webview.executeJavaScript(openChatForScheduledSendScript(item.chatName), true);
    if (!opened?.ok) {
      return { ok: false, error: String(opened?.error || 'chat_open_failed') };
    }

    const fillResult = await sendTextViaClipboard(webview, text);
    if (!fillResult?.ok) {
      return { ok: false, error: String(fillResult?.error || 'clipboard_paste_failed') };
    }

    let clickRes = { ok: false };
    try {
      clickRes = await webview.executeJavaScript(clickSendButtonScript(), true);
    } catch {
      clickRes = { ok: false, error: 'send_button_click_failed' };
    }

    if (!clickRes?.ok) {
      await sendWebviewInput(webview, { type: 'keyDown', keyCode: 'Enter' });
      await sendWebviewInput(webview, { type: 'keyUp', keyCode: 'Enter' });
    }

    const confirm = await webview.executeJavaScript(
      confirmScheduledSentScript(opened.beforeOutgoingCount || 0, text),
      true,
    );

    if (!confirm?.ok) {
      return { ok: false, error: String(confirm?.error || 'send_not_confirmed') };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error || 'scheduled_send_clipboard_failed') };
  }
}

function openTranslateModal() {
  els.translateModal.classList.remove('hidden');
}

function closeTranslateModal() {
  els.translateModal.classList.add('hidden');
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

function setCrmEditable(editable) {
  const on = Boolean(editable);
  state.crmEditable = on;
  els.crmFullName.readOnly = !on;
  els.crmCountryCity.readOnly = !on;
  els.crmAbout.readOnly = !on;
  els.crmMyInfo.readOnly = !on;
  els.crmSave.disabled = !on;
  els.crmEdit.textContent = on ? 'Отмена' : 'Изменить';
}

function crmFormPayload() {
  return {
    fullName: String(els.crmFullName.value || '').trim(),
    countryCity: String(els.crmCountryCity.value || '').trim(),
    about: String(els.crmAbout.value || '').trim(),
    myInfo: String(els.crmMyInfo.value || '').trim(),
  };
}

function buildCrmTextForCopy() {
  const target = state.crmTarget || {};
  const payload = crmFormPayload();
  return [
    `Контакт: ${target.contactName || ''}`,
    `WhatsApp: ${target.accountName || ''}`,
    '',
    `Имя фамилия: ${payload.fullName}`,
    `Страна город: ${payload.countryCity}`,
    '',
    'О нём:',
    payload.about,
    '',
    'Моя информация:',
    payload.myInfo,
    '',
  ].join('\n');
}

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
      document.querySelectorAll('#pane-side [role=\"listitem\"], #pane-side [data-testid=\"cell-frame-container\"]')
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
            'span[title], div[title], [dir=\"auto\"], [data-testid=\"cell-frame-title\"]'
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
            '[data-testid=\"conversation-info-header-chat-title\"], [data-testid=\"conversation-title\"], [data-testid=\"conversation-header-name\"]'
          )
        )
      );
      if (strictTitle) return strictTitle;

      const headerTitle = pickFromNodes(
        Array.from(
          header.querySelectorAll(
            '[data-testid=\"conversation-info-header-chat-title\"] span[title], [data-testid=\"conversation-info-header-chat-title\"] span[dir=\"auto\"], h1, h2, span[title], div[title], span[dir=\"auto\"]'
          )
        )
      );
      if (headerTitle) return headerTitle;
    }

    return '';
  })();`;
}

function crmChatBoundaryScript() {
  return `(() => {
    const main = document.querySelector('#main');
    if (!main) return 0;
    const rect = main.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.left)) return 0;
    return Math.max(0, Math.round(rect.left));
  })();`;
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
  });
  if (!response?.ok) {
    setStatus(`CRM: ${response?.error || 'load_failed'}`);
    return;
  }

  const loaded = response.record || {};
  const nextRecord = {
    fullName: String(loaded.fullName || ''),
    countryCity: String(loaded.countryCity || ''),
    about: String(loaded.about || ''),
    myInfo: String(loaded.myInfo || ''),
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
  els.crmFullName.value = nextRecord.fullName;
  els.crmCountryCity.value = nextRecord.countryCity;
  els.crmAbout.value = nextRecord.about;
  els.crmMyInfo.value = nextRecord.myInfo;
  els.crmMeta.textContent = `Файл: ${filePath || '—'}`;
  setCrmEditable(false);
  await updateCrmModalPosition();
  els.crmModal.classList.remove('hidden');
  requestAnimationFrame(() => {
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
  els.crmModal.classList.add('hidden');
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
  setCrmEditable(false);
  setStatus('CRM: сохранено');
}

async function copyCrmCard() {
  const text = buildCrmTextForCopy();
  await window.waDeck.setClipboardText(text);
  setStatus('CRM: карточка скопирована');
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

function collectRecentIncomingMessagesScript(limit = 3) {
  const safeLimit = normalizeAiContextCount(limit);
  return `(() => {
    const limit = ${safeLimit};
    if (!limit) return [];

    const normalize = typeof window.__waDeckNormalizeText === 'function'
      ? window.__waDeckNormalizeText
      : ((value) => String(value || '').replace(/\\u200e|\\u200f/g, '').replace(/\\s+/g, ' ').trim());
    const extract = typeof window.__waDeckExtractMessageFromRow === 'function'
      ? window.__waDeckExtractMessageFromRow
      : ((row) => normalize(row?.innerText || ''));

    const rows = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
    const out = [];

    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (!row || !row.closest('.message-in')) continue;
      const text = normalize(extract(row) || '');
      if (!text) continue;
      out.push(text);
      if (out.length >= limit) break;
    }

    return out.reverse();
  })();`;
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

async function fillTranslateInputFromSelection() {
  const text = await getSelectedTextFromActiveWebview();
  if (!text) {
    setStatus('Сначала выделите текст в чате');
    return;
  }
  els.translateInput.value = text;
}

async function fillAiInputFromSelection() {
  const text = await getSelectedTextFromActiveWebview();
  if (!text) {
    setStatus('Сначала выделите текст в чате');
    return;
  }
  els.aiInput.value = text;
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

async function saveSettings() {
  els.saveSettings?.classList.add('is-saving');
  const payload = {
    uiTheme: normalizeTheme(state.settings?.uiTheme || 'dark'),
    translateProvider: getSelectedTranslateProvider(),
    deeplApiKey: els.deeplApiKey.value.trim(),
    libreTranslateUrl: els.libreTranslateUrl.value.trim(),
    libreTranslateApiKey: els.libreTranslateApiKey.value.trim(),
    aiApiKey: els.aiApiKey.value.trim(),
    aiModel: String(els.aiModel.value || state.aiModel || '').trim(),
    aiRolePrompt: String(els.aiRolePrompt.value || '').trim(),
  };

  try {
    state.settings = await window.waDeck.saveSettings(payload);
    state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
    state.aiModel = state.settings.aiModel || state.aiModel || 'google/gemma-3-4b-it';
    state.aiRolePrompt = state.settings.aiRolePrompt || '';
    applySettingsToForm();
    renderAiModels([state.aiModel]);
    setStatus('Настройки сохранены');
  } finally {
    setTimeout(() => {
      els.saveSettings?.classList.remove('is-saving');
    }, 520);
  }
}

async function toggleTheme() {
  const current = normalizeTheme(state.settings?.uiTheme || 'dark');
  const nextTheme = current === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);

  const result = await window.waDeck.saveSettings({ uiTheme: nextTheme });
  state.settings = {
    ...(state.settings || {}),
    ...(result || {}),
    uiTheme: normalizeTheme(result?.uiTheme || nextTheme),
  };
  applyTheme(state.settings.uiTheme);
  setStatus(`Тема: ${state.settings.uiTheme === 'light' ? 'светлая' : 'тёмная'}`);
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

async function addAccount() {
  const created = await window.waDeck.addAccount();
  state.accounts.push(created);
  ensureWebview(created);
  renderAccounts();
  setActiveAccount(created.id);
  setStatus(`Добавлен аккаунт: ${created.name}`);
}

async function removeAccount(accountId) {
  const account = state.accounts.find((row) => row.id === accountId);
  if (!account) return;

  const accepted = window.confirm(`Удалить ${account.name}?`);
  if (!accepted) return;

  const response = await window.waDeck.removeAccount(accountId);
  if (!response?.ok) {
    setStatus(`Не удалось удалить аккаунт: ${response?.error || 'error'}`);
    return;
  }

  const webview = state.webviews.get(accountId);
  if (webview && webview.parentNode) {
    webview.parentNode.removeChild(webview);
  }
  state.webviews.delete(accountId);
  state.chatPickerCache.delete(accountId);
  state.unreadByAccount.delete(accountId);
  scheduleDockBadgeSync();

  state.accounts = state.accounts.filter((row) => row.id !== accountId);
  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget = { accountId: '', accountName: '', chatName: '' };
    renderScheduleTarget();
  }

  const nextId = String(response.nextActiveAccountId || state.accounts[0]?.id || '');
  if (nextId) {
    setActiveAccount(nextId);
  } else {
    state.activeAccountId = null;
    renderAccounts();
    updateFreezeButtonState();
    updateActiveUnreadIndicator();
    refreshWebviewVisibility();
    await renderScheduled();
    setStatus('Аккаунт удален');
  }
  closeAccountMenu();
}

function refreshActiveWebview() {
  const webview = selectedWebview();
  const account = activeAccount();
  if (!account) {
    setStatus('Нет активного аккаунта');
    return;
  }
  if (account.frozen) {
    setStatus(`${account.name}: аккаунт заморожен`);
    return;
  }
  if (!webview) {
    setStatus(`${account.name}: вебвью не готов`);
    return;
  }
  els.refreshActive?.classList.add('is-spinning');
  setTimeout(() => {
    els.refreshActive?.classList.remove('is-spinning');
  }, 680);
  webview.reload();
  setStatus(`${account.name}: обновлено`);
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

  const result = await translateTextAndRender(text, 'ручной', sourceLang, targetLang);
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
  const response = await window.waDeck.generateAiReply(payload);
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

async function insertTextIntoActiveChat(text) {
  const safeText = String(text || '').trim();
  if (!safeText) {
    return { ok: false, error: 'text_required' };
  }
  const account = activeAccount();
  if (!account) {
    return { ok: false, error: 'no_active_account' };
  }
  if (account.frozen) {
    return { ok: false, error: 'account_frozen' };
  }

  const webview = selectedWebview();
  if (!webview) {
    return { ok: false, error: 'no_active_chat' };
  }

  const result = await sendTextViaClipboard(webview, safeText);
  if (!result?.ok) return { ok: false, error: String(result?.error || 'clipboard_insert_failed') };
  return { ok: true };
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
  const sendAtIso = sendAtRaw ? new Date(sendAtRaw).toISOString() : '';

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
  if (!webview || typeof webview.isLoading !== 'function') return;
  if (!webview.isLoading()) return;

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      webview.removeEventListener('did-stop-loading', finish);
      resolve();
    };
    const timer = setTimeout(() => {
      clearTimeout(timer);
      finish();
    }, timeoutMs);
    webview.addEventListener('did-stop-loading', finish, { once: true });
  });
}

async function runScheduledSend(webview, item, options = {}) {
  const includeAttachments = options.includeAttachments !== false;
  const hasText = Boolean(String(item?.text || '').trim());
  const hasAttachments =
    includeAttachments && Array.isArray(item?.attachments) && item.attachments.length > 0;

  const payload = {
    chatName: item.chatName,
    text: item.text,
    attachments: includeAttachments ? item.attachments || [] : [],
  };

  try {
    await waitForWebviewReady(webview);

    if (hasText && !hasAttachments) {
      return runScheduledSendViaClipboard(webview, item);
    }

    const result = await webview.executeJavaScript(sendScheduledScript(payload), true);
    const normalized = result && typeof result === 'object' ? result : { ok: false, error: 'invalid_send_result' };
    return normalized;
  } catch (error) {
    const raw = String(error?.message || error || 'unknown');
    const mapped = raw.includes('Error invoking remote method') ? `webview_invoke_failed: ${raw}` : raw;
    console.error('[scheduled-send]', item.chatName, mapped);
    return { ok: false, error: mapped };
  }
}

async function processDueSchedules() {
  if (state.scheduleRunnerBusy) return;
  state.scheduleRunnerBusy = true;

  try {
    const due = await window.waDeck.claimDueScheduled({ limit: 4 });
    const items = Array.isArray(due?.items) ? due.items : [];
    if (!items.length) return;

    for (const item of items) {
      const webview = state.webviews.get(item.accountId);
      if (!webview) {
        const account = accountById(item.accountId);
        const errorText = account?.frozen ? 'account_frozen' : 'webview_not_found';
        await window.waDeck.completeScheduled({ id: item.id, ok: false, errorText });
        continue;
      }

      let result = await runScheduledSend(webview, item, { includeAttachments: true });

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
    processDueSchedules().catch(() => {});
  }, 15000);

  setTimeout(() => processDueSchedules().catch(() => {}), 5000);
}

function bindActions() {
  els.addAccount.addEventListener('click', () => addAccount().catch(console.error));
  els.refreshActive.addEventListener('click', refreshActiveWebview);
  els.freezeActive?.addEventListener('click', () => toggleActiveFreeze().catch(console.error));
  els.openTranslateModal.addEventListener('click', openTranslateModal);
  els.openAiModal?.addEventListener('click', openAiModal);
  els.openCrmModal.addEventListener('click', () => openCrmModal().catch(console.error));

  els.togglePanel.addEventListener('click', () => {
    openSettingsPanel();
  });
  els.themeToggle.addEventListener('click', () => toggleTheme().catch(console.error));
  els.closePanel.addEventListener('click', closeSettingsPanel);
  els.manualUpdate?.addEventListener('click', () => requestManualUpdate().catch(console.error));
  els.brandFrog?.addEventListener('click', playFrogMoneyBurst);

  els.saveSettings.addEventListener('click', () => saveSettings().catch(console.error));
  els.testTranslateApiDeepl.addEventListener('click', () => testTranslateApi('deepl').catch(console.error));
  els.testTranslateApiLibre.addEventListener('click', () => testTranslateApi('libre').catch(console.error));
  bindPasswordToggle(els.deeplApiKey, els.toggleDeeplApiKey);
  bindPasswordToggle(els.libreTranslateApiKey, els.toggleLibreTranslateApiKey);
  bindPasswordToggle(els.aiApiKey, els.toggleAiApiKey);
  els.refreshAiModels.addEventListener('click', () => refreshAiModels(true).catch(console.error));
  els.fillSelectedText.addEventListener('click', () => fillTranslateInputFromSelection().catch(console.error));
  els.doTranslate.addEventListener('click', () => doModalTranslate().catch(console.error));
  els.copyTranslate.addEventListener('click', () => copyTranslateOutput().catch(console.error));
  els.clearTranslate.addEventListener('click', () => {
    els.translateInput.value = '';
    els.translateOutput.value = '';
  });
  els.closeTranslateModal.addEventListener('click', closeTranslateModal);
  els.translateModal.addEventListener('click', (event) => {
    if (event.target === els.translateModal) closeTranslateModal();
  });
  els.fillAiSelectedText.addEventListener('click', () => fillAiInputFromSelection().catch(console.error));
  els.aiModeShort.addEventListener('click', () => setAiMode('short'));
  els.aiModeWarm.addEventListener('click', () => setAiMode('warm'));
  els.aiModeBusiness.addEventListener('click', () => setAiMode('business'));
  els.aiModeFlirt.addEventListener('click', () => setAiMode('flirt'));
  els.aiContextCount.addEventListener('change', () => {
    const count = normalizeAiContextCount(els.aiContextCount.value);
    state.aiContextCount = count;
    els.aiContextCount.value = String(count);
  });
  els.aiReplySourceLang.addEventListener('change', () => {
    state.aiReplySourceLang = Boolean(els.aiReplySourceLang.checked);
  });
  els.doAiReply.addEventListener('click', () => doAiReply().catch(console.error));
  els.copyAiReply.addEventListener('click', () => copyAiReply().catch(console.error));
  els.insertAiReply.addEventListener('click', () => insertAiReplyIntoActiveChat().catch(console.error));
  els.clearAi.addEventListener('click', () => {
    els.aiInput.value = '';
    els.aiOutput.value = '';
  });
  els.closeAiModal.addEventListener('click', closeAiModal);
  els.aiModal.addEventListener('click', (event) => {
    if (event.target === els.aiModal) closeAiModal();
  });
  els.crmEdit.addEventListener('click', toggleCrmEdit);
  els.crmSave.addEventListener('click', () => saveCrmCard().catch(console.error));
  els.crmCopy.addEventListener('click', () => copyCrmCard().catch(console.error));
  els.crmClose.addEventListener('click', closeCrmModal);
  els.crmModal.addEventListener('click', (event) => {
    if (event.target === els.crmModal) closeCrmModal();
  });
  window.addEventListener('resize', () => {
    if (els.crmModal.classList.contains('hidden')) return;
    updateCrmModalPosition().catch(() => {});
  });
  els.translateTargetLang.addEventListener('change', () => {
    state.translateTargetLang = String(els.translateTargetLang.value || 'RU').toUpperCase();
  });
  els.translateSourceLang.addEventListener('change', () => {
    state.translateSourceLang = String(els.translateSourceLang.value || 'AUTO').toUpperCase();
  });

  els.pickAttachments.addEventListener('click', () => pickAttachments().catch(console.error));
  els.clearAttachments.addEventListener('click', clearAttachments);
  els.openChatPicker.addEventListener('click', () => openChatPicker().catch(console.error));
  els.pickerAccount.addEventListener('change', () => refreshPickerChats(true).catch(console.error));
  els.pickerRefresh.addEventListener('click', () => refreshPickerChats(true).catch(console.error));
  els.pickerCancel.addEventListener('click', closeChatPicker);
  els.chatPickerModal.addEventListener('click', (event) => {
    if (event.target === els.chatPickerModal) closeChatPicker();
  });
  els.accountMenuSave.addEventListener('click', () => saveAccountNameFromMenu().catch(console.error));
  els.accountMenuFreeze.addEventListener('click', () => toggleFreezeFromMenu().catch(console.error));
  els.accountMenuCancel.addEventListener('click', closeAccountMenu);
  els.accountMenuModal.addEventListener('click', (event) => {
    if (event.target === els.accountMenuModal) closeAccountMenu();
  });
  els.pickerApply.addEventListener('click', () => {
    const accountId = String(els.pickerAccount.value || '').trim();
    const chatName = String(els.pickerChat.value || '').trim();
    const account = state.accounts.find((row) => row.id === accountId);
    if (!accountId || !account || !chatName) {
      setStatus('Выберите WhatsApp и чат');
      return;
    }
    state.scheduleTarget = {
      accountId,
      accountName: account.name,
      chatName,
    };
    renderScheduleTarget();
    closeChatPicker();
    setStatus(`Цель отправки: ${account.name} / ${chatName}`);
  });
  els.createSchedule.addEventListener('click', () => createScheduledMessage().catch(console.error));
  templateController?.bind();
}

async function init() {
  if (typeof window.waDeck.onAutoUpdateStatus === 'function' && !state.autoUpdateUnsubscribe) {
    state.autoUpdateUnsubscribe = window.waDeck.onAutoUpdateStatus((payload) => {
      handleAutoUpdateStatus(payload);
    });
  }

  const boot = await window.waDeck.bootstrap();
  state.accounts = Array.isArray(boot.accounts) ? boot.accounts : [];
  state.settings = {
    uiTheme: normalizeTheme(boot.settings?.uiTheme || 'dark'),
    translateProvider: String(boot.settings?.translateProvider || 'deepl').toLowerCase() === 'libre' ? 'libre' : 'deepl',
    deeplApiKey: String(boot.settings?.deeplApiKey || ''),
    libreTranslateApiKey: String(boot.settings?.libreTranslateApiKey || boot.settings?.googleTranslateApiKey || ''),
    libreTranslateUrl: String(boot.settings?.libreTranslateUrl || 'https://libretranslate.com/translate'),
    aiApiKey: String(boot.settings?.aiApiKey || ''),
    aiModel: String(boot.settings?.aiModel || 'google/gemma-3-4b-it'),
    aiRolePrompt: String(boot.settings?.aiRolePrompt || ''),
  };
  state.aiModel = state.settings.aiModel || 'google/gemma-3-4b-it';
  state.aiRolePrompt = state.settings.aiRolePrompt || '';
  state.templates = Array.isArray(boot.templates) ? boot.templates.map((tpl) => ({ ...tpl })) : [];
  state.runtime = boot.runtime || {};

  for (const account of state.accounts) {
    ensureWebview(account);
  }

  if (state.accounts.length) {
    setActiveAccount(state.accounts[0].id);
  } else {
    renderAccounts();
    updateFreezeButtonState();
    refreshWebviewVisibility();
  }
  updatePanelVisibility();
  applySettingsToForm();
  renderAiModels([state.aiModel]);
  renderAttachmentsDraft();
  renderScheduleTarget();
  els.translateTargetLang.value = state.translateTargetLang;
  els.translateSourceLang.value = state.translateSourceLang;
  els.translateInput.value = '';
  els.translateOutput.value = '';
  els.aiInput.value = '';
  els.aiOutput.value = '';
  els.crmContactName.value = '';
  els.crmFullName.value = '';
  els.crmCountryCity.value = '';
  els.crmAbout.value = '';
  els.crmMyInfo.value = '';
  els.crmMeta.textContent = 'Файл: —';
  setCrmEditable(false);
  els.aiContextCount.value = String(state.aiContextCount);
  els.aiReplySourceLang.checked = Boolean(state.aiReplySourceLang);
  renderAiModeButtons();

  if (window.WaDeckTemplatesModule?.createTemplateController) {
    templateController = window.WaDeckTemplatesModule.createTemplateController({
      state,
      els,
      setStatus,
      insertTextToActiveChat: insertTextIntoActiveChat,
    });
    await templateController.init(state.templates);
  }

  els.scheduleAt.value = nextSendAtLocal(5);
  await renderScheduled();

  bindActions();
  await refreshAiModels(false).catch(() => {});
  startScheduleRunner();
  startUnreadPolling();
  scheduleDockBadgeSync();

  setStatus(
    `Готово. Аккаунтов: ${state.accounts.length}, Electron ${state.runtime.electron || '?'}, Chromium ${state.runtime.chrome || '?'}`,
  );
}

init().catch((error) => {
  setStatus(`Ошибка запуска: ${String(error?.message || error)}`);
});
