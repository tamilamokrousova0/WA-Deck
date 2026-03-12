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
  accountMenuAccountId: '',
  accountMenuDraftIconPath: '',
  draggedAccountId: '',
  collapsedGroups: new Set(),
  crmEditable: false,
  crmTarget: {
    accountId: '',
    accountName: '',
    contactName: '',
    filePath: '',
  },
  startupHubVisible: true,
  startupHubTimeoutId: null,
  weatherGeoCache: new Map(),
  weatherRefreshTimer: null,
  hoverTranslatePending: new Set(),
  unreadPollBusy: false,
};

const HOVER_TRANSLATE_LANG_OPTIONS = [
  { value: 'RU', label: 'Русский' },
  { value: 'DE', label: 'Немецкий' },
  { value: 'EN-US', label: 'Английский (US)' },
  { value: 'EN-GB', label: 'Английский (UK)' },
  { value: 'UK', label: 'Украинский' },
  { value: 'FR', label: 'Французский' },
  { value: 'ES', label: 'Испанский' },
  { value: 'IT', label: 'Итальянский' },
  { value: 'NL', label: 'Нидерландский' },
  { value: 'PL', label: 'Польский' },
  { value: 'PT-PT', label: 'Португальский' },
  { value: 'TR', label: 'Турецкий' },
];
window._waDeckLangOptions = HOVER_TRANSLATE_LANG_OPTIONS;

const els = {
  appRoot: document.getElementById('app-root'),
  brandFrog: document.getElementById('brand-frog'),
  accountsScrollUp: document.getElementById('accounts-scroll-up'),
  brandMoneyBurst: document.getElementById('brand-money-burst'),
  accountsList: document.getElementById('accounts-list'),
  accountsScrollDown: document.getElementById('accounts-scroll-down'),
  addAccount: document.getElementById('add-account'),
  webviews: document.getElementById('webviews'),
  hubScreen: document.getElementById('hub-screen'),
  hubOverlay: document.getElementById('hub-overlay'),
  status: document.getElementById('status'),
  refreshActive: document.getElementById('refresh-active'),
  freezeActive: document.getElementById('freeze-active'),
  openCrmModal: document.getElementById('open-crm-modal'),
  weatherWidget: document.getElementById('weather-widget'),
  weatherToggle: document.getElementById('weather-toggle'),
  weatherIcon: document.getElementById('weather-icon'),
  weatherTemp: document.getElementById('weather-temp'),
  weatherCity: document.getElementById('weather-city'),
  weatherPopover: document.getElementById('weather-popover'),
  weatherCityInput: document.getElementById('weather-city-input'),
  weatherUnit: document.getElementById('weather-unit'),
  weatherRefresh: document.getElementById('weather-refresh'),
  weatherSave: document.getElementById('weather-save'),
  weatherMeta: document.getElementById('weather-meta'),
  activeAccountDisplay: document.getElementById('active-account-display'),
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
  templateSelect: document.getElementById('template-select'),
  templateSearch: document.getElementById('template-search'),
  templateSearchRow: document.getElementById('template-search-row'),
  templateSearchInput: document.getElementById('template-search-input'),
  templateSearchResultsRow: document.getElementById('template-search-results-row'),
  templateSearchResults: document.getElementById('template-search-results'),
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
  closeChatPicker: document.getElementById('close-chat-picker'),
  pickerAccount: document.getElementById('picker-account'),
  pickerChat: document.getElementById('picker-chat'),
  pickerRefresh: document.getElementById('picker-refresh'),
  pickerApply: document.getElementById('picker-apply'),
  accountMenuModal: document.getElementById('account-menu-modal'),
  accountMenuTitle: document.getElementById('account-menu-title'),
  accountMenuName: document.getElementById('account-menu-name'),
  accountMenuSave: document.getElementById('account-menu-save'),
  accountMenuReset: document.getElementById('account-menu-reset'),
  accountMenuIcon: document.getElementById('account-menu-icon'),
  accountMenuCancel: document.getElementById('account-menu-cancel'),
  accountMenuChip: document.getElementById('account-menu-chip'),
  accountMenuStatus: document.getElementById('account-menu-status'),
  accountMenuFreeze: document.getElementById('account-menu-freeze'),
  accountMenuDelete: document.getElementById('account-menu-delete'),

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

  releaseNotesModal: document.getElementById('release-notes-modal'),
  releaseNotesTitle: document.getElementById('release-notes-title'),
  releaseNotesVersion: document.getElementById('release-notes-version'),
  releaseNotesList: document.getElementById('release-notes-list'),
  closeReleaseNotes: document.getElementById('close-release-notes'),

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
  crmAddNote: document.getElementById('crm-add-note'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmOk: document.getElementById('confirm-ok'),
  confirmCancel: document.getElementById('confirm-cancel'),
};

let templateController = null;

function normalizeTheme(value) {
  return String(value || '').toLowerCase() === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  const safeTheme = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', safeTheme);
  if (els.themeToggle) {
    els.themeToggle.textContent = safeTheme === 'light' ? '☀︎' : '☾';
    els.themeToggle.title = safeTheme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему';
  }
}

function platformPasteModifier() {
  const runtimePlatform = String(state.runtime?.platform || '').toLowerCase();
  if (runtimePlatform) {
    return runtimePlatform === 'darwin' ? 'meta' : 'control';
  }
  const browserPlatform = String(navigator.platform || '').toLowerCase();
  return browserPlatform.includes('mac') ? 'meta' : 'control';
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
  const safeText = String(text || '');
  if (els.status) {
    els.status.textContent = safeText;
    els.status.title = safeText;
  }
  if (els.panelStatus) {
    els.panelStatus.textContent = safeText;
    els.panelStatus.title = safeText;
  }
  const lower = safeText.toLowerCase();
  if (lower.includes('сохранен') || lower.includes('скопирован') || lower.includes('удален') || lower.includes('разморожен')) {
    showToast(text, 'success');
  } else if (lower.includes('ошибка') || lower.includes('не удалось') || lower.includes('неверн')) {
    showToast(text, 'error', 5000);
  }
}

function showToast(text, type, duration) {
  if (typeof type === 'undefined') type = 'info';
  if (typeof duration === 'undefined') duration = 3000;
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : type === 'warn' ? ' toast-warn' : '');
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('is-hiding');
    setTimeout(function () { toast.remove(); }, 260);
  }, duration);
}

// ── Confirm модал ──
let _confirmResolve = null;
function showConfirm(title, message, okText) {
  // Resolve any pending confirm as false to prevent promise leaks
  if (_confirmResolve) {
    _confirmResolve(false);
    _confirmResolve = null;
  }
  return new Promise(function (resolve) {
    _confirmResolve = resolve;
    if (els.confirmTitle) els.confirmTitle.textContent = title || 'Подтверждение';
    if (els.confirmMessage) els.confirmMessage.textContent = message || '';
    if (els.confirmOk) els.confirmOk.textContent = okText || 'OK';
    if (els.confirmModal) els.confirmModal.classList.remove('hidden');
  });
}

function closeConfirm(result) {
  if (els.confirmModal) els.confirmModal.classList.add('hidden');
  if (_confirmResolve) {
    _confirmResolve(Boolean(result));
    _confirmResolve = null;
  }
}

function trimMapSize(map, limit) {
  if (!(map instanceof Map) || !Number.isFinite(limit) || limit <= 0) return;
  while (map.size > limit) {
    const oldestKey = map.keys().next();
    if (oldestKey.done) break;
    map.delete(oldestKey.value);
  }
}

function setButtonBusy(button, busy, options = {}) {
  if (!button) return;
  const { text = '', title = '' } = options;
  if (!button.dataset.idleText) {
    button.dataset.idleText = button.textContent || '';
  }
  if (!button.dataset.idleTitle) {
    button.dataset.idleTitle = button.title || '';
  }
  button.disabled = Boolean(busy);
  button.classList.toggle('is-busy', Boolean(busy));
  if (text && !button.querySelector('svg')) {
    button.textContent = busy ? text : button.dataset.idleText;
  }
  if (title) {
    button.title = busy ? title : button.dataset.idleTitle;
  }
}

async function runWithBusyButton(button, task, options = {}) {
  if (button?.disabled) return null;
  setButtonBusy(button, true, options);
  try {
    return await task();
  } finally {
    setButtonBusy(button, false, options);
  }
}

function setHubVisibility(visible) {
  if (!els.webviews || !els.hubScreen) return;
  els.webviews.classList.toggle('hub-mode', Boolean(visible));
  els.hubScreen.classList.toggle('hidden', !visible);
  els.hubScreen.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (visible) updateHubDashboard();
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

function updateActiveAccountDisplay() {
  if (!els.activeAccountDisplay) return;
  const account = activeAccount();
  if (!account) {
    els.activeAccountDisplay.textContent = 'Нет активного WhatsApp';
    els.activeAccountDisplay.title = 'Нет активного WhatsApp';
    els.activeAccountDisplay.classList.add('is-empty');
    return;
  }
  const suffix = account.frozen ? ' • заморожен' : '';
  els.activeAccountDisplay.textContent = `${account.name}${suffix}`;
  els.activeAccountDisplay.title = account.name;
  els.activeAccountDisplay.classList.remove('is-empty');
}

function updateToolbarState() {
  const hasActive = Boolean(activeAccount());
  if (els.refreshActive) els.refreshActive.disabled = !hasActive;
  if (els.freezeActive) els.freezeActive.disabled = !hasActive;
  if (els.openCrmModal) els.openCrmModal.disabled = !hasActive;
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
  state.accounts.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function replaceAccounts(nextAccounts) {
  state.accounts = Array.isArray(nextAccounts) ? nextAccounts.map((row) => ({ ...row })) : [];
  state.accounts.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

async function reorderAccountsByDrag(sourceAccountId, targetAccountId) {
  const sourceId = String(sourceAccountId || '').trim();
  const targetId = String(targetAccountId || '').trim();
  if (!sourceId || !targetId || sourceId === targetId) return;

  const fromIndex = state.accounts.findIndex((row) => row.id === sourceId);
  const toIndex = state.accounts.findIndex((row) => row.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const direction = fromIndex < toIndex ? 'down' : 'up';
  const steps = Math.abs(fromIndex - toIndex);
  let lastResponse = null;
  for (let i = 0; i < steps; i += 1) {
    // backend умеет только сдвиг на 1 позицию, поэтому двигаем пошагово
    // один и тот же accountId в нужном направлении.
    lastResponse = await window.waDeck.moveAccount({ accountId: sourceId, direction });
    if (!lastResponse?.ok) {
      setStatus(`Не удалось изменить порядок: ${lastResponse?.error || 'error'}`);
      return;
    }
  }

  if (Array.isArray(lastResponse?.accounts)) {
    replaceAccounts(lastResponse.accounts);
    renderAccounts();
    setStatus('Порядок WhatsApp обновлён');
  }
}

function renderAccounts() {
  els.accountsList.innerHTML = '';

  for (const account of state.accounts) {
    const card = document.createElement('div');
    card.className = `account-item ${state.activeAccountId === account.id ? 'active' : ''} ${account.frozen ? 'frozen' : ''}`;
    card.dataset.accountId = account.id;
    // tooltip вместо title (добавляется ниже)
    card.draggable = state.accounts.length > 1;
    card.addEventListener('click', () => setActiveAccount(account.id));
    card.addEventListener('dragstart', (event) => {
      state.draggedAccountId = account.id;
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', account.id);
      } catch {
        // ignore dataTransfer limitations
      }
      card.classList.add('dragging');
    });
    card.addEventListener('dragover', (event) => {
      if (!state.draggedAccountId || state.draggedAccountId === account.id) return;
      event.preventDefault();
      try {
        event.dataTransfer.dropEffect = 'move';
      } catch {
        // ignore
      }
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedId = String(state.draggedAccountId || '').trim();
      card.classList.remove('drag-over');
      if (!draggedId || draggedId === account.id) return;
      reorderAccountsByDrag(draggedId, account.id).catch(console.error);
    });
    card.addEventListener('dragend', () => {
      state.draggedAccountId = '';
      card.classList.remove('dragging');
      for (const node of els.accountsList.querySelectorAll('.account-item.drag-over')) {
        node.classList.remove('drag-over');
      }
    });

    const chip = document.createElement('div');
    chip.className = 'account-chip';
    chip.style.background = account.color;
    if (account.iconUrl) {
      const iconImg = document.createElement('img');
      iconImg.src = account.iconUrl;
      iconImg.alt = account.name;
      iconImg.loading = 'lazy';
      chip.appendChild(iconImg);
    } else {
      chip.textContent = account.name.slice(0, 2).toUpperCase();
    }
    // chip title убран — используется кастомный tooltip
    chip.addEventListener('dblclick', (event) => {
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

    const statusDot = document.createElement('div');
    statusDot.className = 'account-status-dot';
    if (account.frozen) {
      statusDot.classList.add('status-frozen');
      statusDot.title = 'Заморожен';
    } else {
      const wv = state.webviews.get(account.id);
      if (!wv) {
        statusDot.classList.add('status-offline');
        statusDot.title = 'Не загружен';
      } else if (wv.dataset?.waReady === '1') {
        statusDot.classList.add('status-ready');
        statusDot.title = 'Подключён';
      } else {
        statusDot.classList.add('status-loading');
        statusDot.title = 'Загружается';
      }
    }
    card.appendChild(statusDot);

    // Кастомный tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'account-tooltip';
    let tooltipStatus = '';
    if (account.frozen) {
      tooltipStatus = 'Заморожен ❄';
    } else {
      const wv = state.webviews.get(account.id);
      if (!wv) tooltipStatus = 'Не подключён';
      else if (wv.dataset?.waReady === '1') tooltipStatus = 'Подключён';
      else tooltipStatus = 'Загрузка…';
    }
    tooltip.textContent = account.name + ' — ' + tooltipStatus;
    card.appendChild(tooltip);

    // Контекстное меню (правый клик)
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAccountContextMenu(e, account);
    });

    card.append(remove, chip, name);
    els.accountsList.appendChild(card);
  }

  updateActiveAccountDisplay();
  updateSidebarScrollControls();
}

function updateSidebarScrollControls() {
  if (!els.accountsList || !els.accountsScrollUp || !els.accountsScrollDown) return;
  const pane = els.accountsList;
  const hasOverflow = pane.scrollHeight > pane.clientHeight + 4;
  const atTop = pane.scrollTop <= 4;
  const atBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4;

  els.accountsScrollUp.classList.toggle('hidden', !hasOverflow || atTop);
  els.accountsScrollDown.classList.toggle('hidden', !hasOverflow || atBottom);
}

function scrollAccountsList(direction) {
  if (!els.accountsList) return;
  const step = Math.max(120, Math.floor(els.accountsList.clientHeight * 0.52));
  els.accountsList.scrollBy({
    top: direction === 'down' ? step : -step,
    behavior: 'smooth',
  });
  window.setTimeout(updateSidebarScrollControls, 220);
}

// ── Контекстное меню аккаунта ──
function showAccountContextMenu(event, account) {
  closeAccountContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'account-context-menu';

  const items = [
    { label: 'Обновить', action: () => { setActiveAccount(account.id); requestAnimationFrame(() => refreshActiveWebview()); } },
    { label: account.frozen ? 'Разморозить' : 'Заморозить', action: () => { setAccountFrozenState(account.id, !account.frozen).catch(console.error); } },
    { divider: true },
    { label: 'CRM', action: () => { setActiveAccount(account.id); requestAnimationFrame(() => { if (window.WaDeckCrmModule) window.WaDeckCrmModule.openCrmModal(); }); } },
    { label: 'Управление', action: () => openAccountMenu(account.id) },
    { divider: true },
    { label: 'Удалить', danger: true, action: () => removeAccount(account.id).catch(console.error) },
  ];

  for (const item of items) {
    if (item.divider) {
      const div = document.createElement('div');
      div.className = 'context-menu-divider';
      menu.appendChild(div);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'context-menu-item' + (item.danger ? ' danger' : '');
    el.textContent = item.label;
    el.addEventListener('click', () => {
      closeAccountContextMenu();
      item.action();
    });
    menu.appendChild(el);
  }

  // Позиционирование у курсора
  document.body.appendChild(menu);
  let x = event.clientX;
  let y = event.clientY;
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  menu.style.left = Math.max(0, x) + 'px';
  menu.style.top = Math.max(0, y) + 'px';

  // Закрытие
  const closeOnClick = (e) => {
    if (!menu.contains(e.target)) closeAccountContextMenu();
  };
  const closeOnEsc = (e) => {
    if (e.key === 'Escape') closeAccountContextMenu();
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnClick, { capture: true });
    document.addEventListener('keydown', closeOnEsc);
  }, 0);
  menu._cleanup = () => {
    document.removeEventListener('click', closeOnClick, { capture: true });
    document.removeEventListener('keydown', closeOnEsc);
  };
}

function closeAccountContextMenu() {
  const existing = document.getElementById('account-context-menu');
  if (existing) {
    if (existing._cleanup) existing._cleanup();
    existing.remove();
  }
}

// ── Hub Dashboard ──
async function updateHubDashboard() {
  const container = document.getElementById('hub-dashboard');
  if (!container) return;
  container.innerHTML = '';

  // Строки аккаунтов
  for (const account of state.accounts) {
    const row = document.createElement('div');
    row.className = 'hub-stat-row';

    const dot = document.createElement('div');
    dot.className = 'hub-stat-dot';
    dot.style.background = account.color;

    const nameEl = document.createElement('div');
    nameEl.className = 'hub-stat-name';
    nameEl.textContent = account.name;

    const unread = Number(state.unreadByAccount.get(account.id) || 0);
    const badgeEl = document.createElement('div');
    badgeEl.className = 'hub-stat-badge';
    badgeEl.textContent = unread > 0 ? (unread > 99 ? '99+' : String(unread)) : '';

    let statusText = '';
    if (account.frozen) {
      statusText = '❄ заморожен';
    } else {
      const wv = state.webviews.get(account.id);
      if (!wv) statusText = 'не загружен';
      else if (wv.dataset?.waReady === '1') statusText = '● онлайн';
      else statusText = '◌ загрузка';
    }
    const statusEl = document.createElement('div');
    statusEl.className = 'hub-stat-status';
    statusEl.textContent = statusText;

    row.append(dot, nameEl, badgeEl, statusEl);
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => setActiveAccount(account.id));
    container.appendChild(row);
  }

  // Pending scheduled
  try {
    const res = await window.waDeck.listScheduled({ limit: 50 });
    const pending = Array.isArray(res?.items) ? res.items.filter((i) => i.status === 'pending') : [];
    if (pending.length > 0) {
      const info = document.createElement('div');
      info.className = 'hub-pending-info';
      info.textContent = '\u23F0 Запланированных сообщений: ' + pending.length;
      container.appendChild(info);
    }
  } catch { /* ignore */ }

  // Кнопки
  const actions = document.createElement('div');
  actions.className = 'hub-actions';

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'btn';
  settingsBtn.textContent = '⚙ Настройки';
  settingsBtn.addEventListener('click', () => { if (state.panelHidden) openSettingsPanel(); else closeSettingsPanel(); });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+ Аккаунт';
  addBtn.addEventListener('click', () => addAccount());

  actions.append(settingsBtn, addBtn);
  container.appendChild(actions);
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
  webview.dataset.waReady = '0';

  const accountId = account.id;
  const currentAccount = () => accountById(accountId) || account;

  webview.addEventListener('did-start-loading', () => {
    webview.dataset.waReady = '0';
    if (accountId === state.activeAccountId) {
      setStatus(`${currentAccount().name}: загрузка...`);
    }
  });

  webview.addEventListener('did-finish-load', () => {
    if (accountId === state.activeAccountId) {
      if (state.startupHubVisible) {
        state.startupHubVisible = false;
        if (state.startupHubTimeoutId) {
          clearTimeout(state.startupHubTimeoutId);
          state.startupHubTimeoutId = null;
        }
      }
      showWebviewLoading(false);
      refreshWebviewVisibility();
      setStatus(`${currentAccount().name}: готово`);
    }
  });

  webview.addEventListener('did-fail-load', () => {
    webview.dataset.waReady = '0';
    if (accountId === state.activeAccountId) {
      showWebviewLoading(false);
      if (state.startupHubVisible) {
        state.startupHubVisible = false;
      }
      refreshWebviewVisibility();
    }
  });

  webview.addEventListener('page-title-updated', (event) => {
    const title = String(event?.title || '');
    const count = WaDeckUnreadModule.parseUnreadFromTitle(title);
    WaDeckUnreadModule.setUnreadCount(accountId, count);
  });

  let _bindDomTimer = null;
  const bindDomHelpers = () => {
    webview.dataset.waReady = '1';
    if (typeof webview.setUserAgent === 'function' && state.runtime?.waUserAgent) {
      webview.setUserAgent(state.runtime.waUserAgent);
    }

    webview
      .executeJavaScript(bridgeScript(), true)
      .catch((e) => console.warn('[bridge]', e));

    webview.executeJavaScript(hoverTranslateBridgeScript(state.translateTargetLang), true).catch((e) => console.warn('[hover-bridge]', e));

    // Debounced UI update — prevents excessive re-renders on SPA navigation
    if (_bindDomTimer) clearTimeout(_bindDomTimer);
    _bindDomTimer = setTimeout(() => {
      _bindDomTimer = null;
      renderAccounts();
      updateHubDashboard();
    }, 300);
  };

  webview.addEventListener('dom-ready', bindDomHelpers);
  webview.addEventListener('did-navigate-in-page', bindDomHelpers);
  webview.addEventListener('console-message', (event) => {
    const message = String(event?.message || '');
    if (!message.startsWith('__WADECK_HOVER_TRANSLATE__')) return;
    WaDeckTranslateModule.handleHoverTranslateMessage(account.id, message).catch(console.error);
  });

  state.webviews.set(account.id, webview);
  els.webviews.appendChild(webview);
}

function isWebviewReady(webview) {
  return Boolean(webview && webview.isConnected && webview.dataset?.waReady === '1');
}

function safeExecuteInWebview(webview, script, userGesture = true) {
  if (!isWebviewReady(webview)) {
    return Promise.resolve(null);
  }
  try {
    return Promise.resolve(webview.executeJavaScript(script, userGesture)).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

function showWebviewLoading(show) {
  let overlay = els.webviews.querySelector('.webview-loading-overlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'webview-loading-overlay';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      overlay.appendChild(spinner);
      els.webviews.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
}

function refreshWebviewVisibility() {
  const showHub = state.startupHubVisible || !state.activeAccountId || !selectedWebview();
  setHubVisibility(showHub);
  let activeLoading = false;
  for (const [accountId, webview] of state.webviews.entries()) {
    if (accountId === state.activeAccountId) {
      webview.classList.add('active');
      if (webview.dataset.waReady !== '1' && typeof webview.isLoading === 'function' && webview.isLoading()) {
        activeLoading = true;
      }
    } else {
      webview.classList.remove('active');
    }
  }
  showWebviewLoading(!showHub && activeLoading);
}

function openHubMode() {
  state.startupHubVisible = false;
  setActiveAccount('');
}

function handleEscapeUiReset() {
  WaDeckWeatherModule.closeWeatherPopover();
  WaDeckScheduleModule.closeChatPicker();
  closeSettingsPanel();
  WaDeckTranslateModule.closeTranslateModal();
  if (els.releaseNotesModal && !els.releaseNotesModal.classList.contains('hidden')) {
    WaDeckAutoUpdateModule.closeReleaseNotesModal().catch(console.error);
  }
  WaDeckCrmModule.closeCrmModal();
  closeAccountMenu();
}

let _switchingAccount = false;
function setActiveAccount(accountId) {
  if (_switchingAccount) return;
  _switchingAccount = true;
  try {
    _setActiveAccountInner(accountId);
  } finally {
    _switchingAccount = false;
  }
}
function _setActiveAccountInner(accountId) {
  const nextId = String(accountId || '').trim();
  state.activeAccountId = nextId;
  if (nextId && state.startupHubVisible) {
    const webview = state.webviews.get(nextId);
    if (!webview || !webview.isLoading?.()) {
      state.startupHubVisible = false;
    }
  }
  renderAccounts();
  updateActiveAccountDisplay();
  updateFreezeButtonState();
  updateToolbarState();
  WaDeckUnreadModule.updateActiveUnreadIndicator();
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
      WaDeckScheduleModule.renderScheduleTarget();
    }
  } else {
    setStatus('Нет активного аккаунта');
  }
  WaDeckUnreadModule.scheduleDockBadgeSync();
  WaDeckScheduleModule.renderScheduled().catch(console.error);
}

function syncTranslateProviderVisibility() {
  const provider = WaDeckTranslateModule.getSelectedTranslateProvider();
  const deeplBlock = document.getElementById('deepl-settings-block');
  const libreBlock = document.getElementById('libre-settings-block');
  if (deeplBlock) deeplBlock.classList.toggle('hidden', provider !== 'deepl');
  if (libreBlock) libreBlock.classList.toggle('hidden', provider !== 'libre');
}

function applySettingsToForm() {
  state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
  state.settings.weatherCity = WaDeckWeatherModule.normalizeWeatherCity(state.settings.weatherCity);
  state.settings.weatherUnit = WaDeckWeatherModule.normalizeWeatherUnit(state.settings.weatherUnit);
  applyTheme(state.settings.uiTheme);
  WaDeckTranslateModule.setSelectedTranslateProvider(state.settings.translateProvider || 'deepl');
  syncTranslateProviderVisibility();
  els.deeplApiKey.value = state.settings.deeplApiKey || '';
  els.libreTranslateUrl.value = state.settings.libreTranslateUrl || 'https://libretranslate.com/translate';
  els.libreTranslateApiKey.value = state.settings.libreTranslateApiKey || '';
  resetPasswordFieldVisibility(els.deeplApiKey, els.toggleDeeplApiKey);
  resetPasswordFieldVisibility(els.libreTranslateApiKey, els.toggleLibreTranslateApiKey);
  if (els.weatherCityInput) {
    els.weatherCityInput.value = state.settings.weatherCity;
  }
  WaDeckWeatherModule.renderWeatherSummary({
    city: state.settings.weatherCity,
    unit: state.settings.weatherUnit,
    loading: false,
  });
  WaDeckTranslateModule.syncHoverTranslateTargetLang();
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
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

function closeSettingsPanel() {
  state.panelHidden = true;
  updatePanelVisibility();
  if (!els.crmModal.classList.contains('hidden')) {
    setTimeout(() => {
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

function openAccountMenu(accountId) {
  const account = accountById(accountId);
  if (!account) return;

  state.accountMenuAccountId = account.id;
  state.accountMenuDraftIconPath = String(account.iconPath || '').trim();
  els.accountMenuTitle.textContent = account.name;
  els.accountMenuName.value = account.name;

  // Preview chip
  if (els.accountMenuChip) {
    els.accountMenuChip.innerHTML = '';
    els.accountMenuChip.style.background = account.color || 'var(--accent)';
    if (account.iconUrl) {
      const img = document.createElement('img');
      img.src = account.iconUrl;
      img.alt = account.name;
      els.accountMenuChip.appendChild(img);
    } else {
      els.accountMenuChip.textContent = account.name.slice(0, 2).toUpperCase();
    }
  }

  // Status line
  if (els.accountMenuStatus) {
    let statusText = '';
    if (account.frozen) {
      statusText = '❄ Заморожен';
    } else {
      const wv = state.webviews.get(account.id);
      if (!wv) statusText = '○ Не подключён';
      else if (wv.dataset?.waReady === '1') statusText = '● Подключён';
      else statusText = '◌ Загрузка…';
    }
    els.accountMenuStatus.textContent = statusText;
  }

  // Freeze button text
  if (els.accountMenuFreeze) {
    els.accountMenuFreeze.textContent = account.frozen ? '▶ Разморозить' : '❄ Заморозить';
  }

  // Icon button
  if (els.accountMenuIcon) {
    els.accountMenuIcon.textContent = state.accountMenuDraftIconPath ? '🖼 Иконка ✓' : '🖼 Иконка';
  }

  els.accountMenuModal.classList.remove('hidden');
}

function closeAccountMenu() {
  state.accountMenuAccountId = '';
  state.accountMenuDraftIconPath = '';
  els.accountMenuModal.classList.add('hidden');
}

async function saveAccountFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const nextName = String(els.accountMenuName.value || '').trim();
  if (!nextName) {
    setStatus('Введите название аккаунта');
    return;
  }

  const nextIconPath = String(state.accountMenuDraftIconPath || '').trim();
  const currentIconPath = String(account.iconPath || '').trim();

  let changed = false;
  let currentAccount = account;

  if (nextName !== String(account.name || '').trim()) {
    const renameResponse = await window.waDeck.renameAccount({ accountId, name: nextName });
    if (!renameResponse?.ok || !renameResponse.account) {
      setStatus(`Не удалось сохранить: ${renameResponse?.error || 'error'}`);
      return;
    }
    patchLocalAccount(renameResponse.account);
    currentAccount = accountById(accountId) || currentAccount;
    changed = true;
  }

  if (nextIconPath !== currentIconPath) {
    const iconResponse = await window.waDeck.setAccountIcon({ accountId, iconPath: nextIconPath });
    if (!iconResponse?.ok || !iconResponse.account) {
      const map = {
        icon_not_found: 'Файл иконки не найден',
        icon_invalid_type: 'Поддерживаются только PNG/JPG',
        account_not_found: 'Аккаунт не найден',
      };
      setStatus(`Не удалось сохранить иконку: ${map[iconResponse?.error] || iconResponse?.error || 'ошибка'}`);
      return;
    }
    patchLocalAccount(iconResponse.account);
    currentAccount = accountById(accountId) || currentAccount;
    changed = true;
  }

  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget.accountName = String(currentAccount.name || nextName);
    WaDeckScheduleModule.renderScheduleTarget();
  }
  renderAccounts();
  setStatus(changed ? `Сохранено: ${currentAccount.name || nextName}` : 'Изменений нет');
  closeAccountMenu();
}

async function resetAccountFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const fallbackOrder = state.accounts.findIndex((row) => row.id === accountId) + 1;
  const defaultName = `WP_${Number(account.order || fallbackOrder || 1)}`;

  const iconResponse = await window.waDeck.setAccountIcon({ accountId, iconPath: '' });
  if (!iconResponse?.ok || !iconResponse.account) {
    setStatus(`Не удалось сбросить иконку: ${iconResponse?.error || 'error'}`);
    return;
  }
  patchLocalAccount(iconResponse.account);

  const renameResponse = await window.waDeck.renameAccount({ accountId, name: defaultName });
  if (!renameResponse?.ok || !renameResponse.account) {
    setStatus(`Не удалось сбросить имя: ${renameResponse?.error || 'error'}`);
    return;
  }
  patchLocalAccount(renameResponse.account);

  state.accountMenuDraftIconPath = '';
  els.accountMenuName.value = defaultName;
  if (els.accountMenuIcon) {
    els.accountMenuIcon.textContent = '🖼 Иконка';
  }

  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget.accountName = defaultName;
    WaDeckScheduleModule.renderScheduleTarget();
  }

  renderAccounts();
  setStatus(`Сброшено: ${defaultName}`);
  closeAccountMenu();
}

async function changeAccountIconFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const picked = await window.waDeck.pickAccountIcon();
  if (!picked || picked.canceled || !picked.path) return;
  state.accountMenuDraftIconPath = String(picked.path || '').trim();
  if (els.accountMenuIcon) {
    els.accountMenuIcon.textContent = state.accountMenuDraftIconPath ? '🖼 Иконка ✓' : '🖼 Иконка';
  }
  setStatus(`Иконка выбрана: ${account.name}. Нажмите «Сохранить»`);
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
    WaDeckUnreadModule.setUnreadCount(accountId, 0);
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
  updateToolbarState();
  updateActiveAccountDisplay();
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

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.slice(i, i + chunk);
    let piece = '';
    for (let j = 0; j < slice.length; j += 1) {
      piece += String.fromCharCode(slice[j]);
    }
    binary += piece;
  }
  return btoa(binary);
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

async function resetWebviewUiState(webview, tries = 2) {
  if (!webview) return;
  if (typeof webview.focus === 'function') {
    try {
      webview.focus();
    } catch {
      // ignore
    }
  }
  for (let i = 0; i < tries; i += 1) {
    await sendWebviewInput(webview, { type: 'keyDown', keyCode: 'Escape' });
    await sendWebviewInput(webview, { type: 'keyUp', keyCode: 'Escape' });
    await delay(120);
  }
}

async function saveSettings() {
  els.saveSettings?.classList.add('is-saving');
  const payload = {
    uiTheme: normalizeTheme(state.settings?.uiTheme || 'dark'),
    translateProvider: WaDeckTranslateModule.getSelectedTranslateProvider(),
    deeplApiKey: els.deeplApiKey.value.trim(),
    libreTranslateUrl: els.libreTranslateUrl.value.trim(),
    libreTranslateApiKey: els.libreTranslateApiKey.value.trim(),
    weatherCity: WaDeckWeatherModule.normalizeWeatherCity(state.settings?.weatherCity),
    weatherUnit: WaDeckWeatherModule.normalizeWeatherUnit(state.settings?.weatherUnit),
    lastSeenReleaseNotesVersion: String(state.settings?.lastSeenReleaseNotesVersion || '').trim(),
  };

  try {
    const saved = await window.waDeck.saveSettings(payload);
    if (!saved || typeof saved !== 'object') {
      throw new Error('save_settings_failed');
    }
    state.settings = saved;
    state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
    applySettingsToForm();
    setStatus('Настройки сохранены');
  } catch (error) {
    setStatus(`Не удалось сохранить настройки: ${String(error?.message || error || 'error')}`);
    throw error;
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

async function addAccount() {
  try {
    const created = await window.waDeck.addAccount();
    if (!created || typeof created !== 'object' || !created.id) {
      setStatus('Не удалось добавить аккаунт');
      return;
    }
    state.accounts.push(created);
    renderAccounts();
    setActiveAccount(created.id);
    // ensureWebview после setActiveAccount — даём DOM обновиться
    try { ensureWebview(created); } catch { /* webview создастся при переключении */ }
    setStatus(`Добавлен аккаунт: ${created.name}`);
  } catch (error) {
    setStatus(`Не удалось добавить аккаунт: ${String(error?.message || error || 'error')}`);
  }
}

async function removeAccount(accountId) {
  const account = state.accounts.find((row) => row.id === accountId);
  if (!account) return;

  const accepted = await showConfirm('Удаление аккаунта', `Удалить «${account.name}»?\nВсе данные сессии будут потеряны.`, 'Удалить');
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
  WaDeckUnreadModule.scheduleDockBadgeSync();

  state.accounts = state.accounts.filter((row) => row.id !== accountId);
  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget = { accountId: '', accountName: '', chatName: '' };
    WaDeckScheduleModule.renderScheduleTarget();
  }

  const nextId = String(response.nextActiveAccountId || state.accounts[0]?.id || '');
  if (nextId) {
    setActiveAccount(nextId);
  } else {
    state.activeAccountId = null;
    renderAccounts();
    updateFreezeButtonState();
    WaDeckUnreadModule.updateActiveUnreadIndicator();
    refreshWebviewVisibility();
    await WaDeckScheduleModule.renderScheduled();
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

  try {
    const result = await webview.executeJavaScript(insertTextScript(safeText), true);
    if (!result?.ok) return { ok: false, error: String(result?.error || 'insert_failed') };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error || 'insert_failed') };
  }
}

function bindActions() {
  els.addAccount.addEventListener('click', () => {
    runWithBusyButton(els.addAccount, () => addAccount(), { text: '…', title: 'Добавление WhatsApp' }).catch(console.error);
  });
  els.accountsScrollUp?.addEventListener('click', () => scrollAccountsList('up'));
  els.accountsScrollDown?.addEventListener('click', () => scrollAccountsList('down'));
  els.accountsList?.addEventListener('scroll', updateSidebarScrollControls, { passive: true });
  els.refreshActive.addEventListener('click', refreshActiveWebview);
  els.freezeActive?.addEventListener('click', () => toggleActiveFreeze().catch(console.error));
  els.openTranslateModal?.addEventListener('click', WaDeckTranslateModule.openTranslateModal);
  els.openCrmModal.addEventListener('click', () => WaDeckCrmModule.openCrmModal().catch(console.error));

  els.togglePanel.addEventListener('click', () => {
    openSettingsPanel();
  });
  els.themeToggle.addEventListener('click', () => toggleTheme().catch(console.error));
  els.closePanel.addEventListener('click', closeSettingsPanel);
  els.manualUpdate?.addEventListener('click', () => WaDeckAutoUpdateModule.requestManualUpdate().catch(console.error));
  els.brandFrog?.addEventListener('click', () => {
    playFrogMoneyBurst();
    openHubMode();
  });
  els.weatherToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    WaDeckWeatherModule.toggleWeatherPopover();
  });
  els.weatherRefresh?.addEventListener('click', () => WaDeckWeatherModule.refreshWeather().catch(console.error));
  els.weatherSave?.addEventListener('click', () => WaDeckWeatherModule.saveWeatherSettings().catch(console.error));
  els.weatherUnit?.addEventListener('click', () => WaDeckWeatherModule.toggleWeatherUnit().catch(console.error));
  els.weatherCityInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      WaDeckWeatherModule.saveWeatherSettings().catch(console.error);
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      handleEscapeUiReset();
      return;
    }

    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;

    const digit = parseInt(event.key, 10);
    if (digit >= 1 && digit <= 9 && !event.shiftKey && !event.altKey) {
      const account = state.accounts[digit - 1];
      if (account) {
        event.preventDefault();
        setActiveAccount(account.id);
      }
      return;
    }

    const tag = (event.target?.tagName || '').toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (isInput) return;

    if (event.key === 't' && !event.shiftKey) {
      event.preventDefault();
      WaDeckTranslateModule.openTranslateModal();
      return;
    }
    if (event.key === ',' || event.key === '\u0431') {
      event.preventDefault();
      if (state.panelHidden) { openSettingsPanel(); } else { closeSettingsPanel(); }
      return;
    }
    if (event.key === 'r' && !event.shiftKey) {
      event.preventDefault();
      refreshActiveWebview();
      return;
    }
  });
  document.addEventListener('click', (event) => {
    if (!els.weatherWidget || !els.weatherPopover) return;
    if (els.weatherPopover.classList.contains('hidden')) return;
    if (els.weatherWidget.contains(event.target)) return;
    WaDeckWeatherModule.closeWeatherPopover();
  });

  els.saveSettings.addEventListener('click', () => saveSettings().catch(console.error));
  els.testTranslateApiDeepl.addEventListener('click', () => {
    runWithBusyButton(els.testTranslateApiDeepl, () => WaDeckTranslateModule.testTranslateApi('deepl'), {
      text: 'Проверка...',
      title: 'Проверка DeepL API',
    }).catch(console.error);
  });
  els.testTranslateApiLibre.addEventListener('click', () => {
    runWithBusyButton(els.testTranslateApiLibre, () => WaDeckTranslateModule.testTranslateApi('libre'), {
      text: 'Проверка...',
      title: 'Проверка LibreTranslate API',
    }).catch(console.error);
  });
  bindPasswordToggle(els.deeplApiKey, els.toggleDeeplApiKey);
  bindPasswordToggle(els.libreTranslateApiKey, els.toggleLibreTranslateApiKey);
  els.translateProviderDeepl?.addEventListener('change', syncTranslateProviderVisibility);
  els.translateProviderLibre?.addEventListener('change', syncTranslateProviderVisibility);
  els.fillSelectedText.addEventListener('click', () => WaDeckTranslateModule.fillTranslateInputFromSelection().catch(console.error));
  els.doTranslate.addEventListener('click', () => WaDeckTranslateModule.doModalTranslate().catch(console.error));
  els.copyTranslate.addEventListener('click', () => WaDeckTranslateModule.copyTranslateOutput().catch(console.error));
  els.clearTranslate.addEventListener('click', () => {
    els.translateInput.value = '';
    els.translateOutput.value = '';
  });
  els.closeTranslateModal.addEventListener('click', WaDeckTranslateModule.closeTranslateModal);
  els.closeReleaseNotes?.addEventListener('click', () => WaDeckAutoUpdateModule.closeReleaseNotesModal().catch(console.error));
  els.crmEdit.addEventListener('click', WaDeckCrmModule.toggleCrmEdit);
  els.crmSave.addEventListener('click', () => WaDeckCrmModule.saveCrmCard().catch(console.error));
  els.crmCopy.addEventListener('click', () => WaDeckCrmModule.copyCrmCard().catch(console.error));
  els.crmClose.addEventListener('click', WaDeckCrmModule.closeCrmModal);
  if (els.crmAddNote) els.crmAddNote.addEventListener('click', WaDeckCrmModule.addCrmNote);
  WaDeckCrmModule.bindCrmAutoResize();
  // Confirm модал
  els.confirmOk.addEventListener('click', () => closeConfirm(true));
  els.confirmCancel.addEventListener('click', () => closeConfirm(false));
  els.confirmModal.addEventListener('click', (e) => { if (e.target === els.confirmModal) closeConfirm(false); });
  window.addEventListener('resize', () => {
    if (!els.crmModal.classList.contains('hidden')) {
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }
    updateSidebarScrollControls();
  });
  els.translateTargetLang.addEventListener('change', () => {
    state.translateTargetLang = WaDeckTranslateModule.normalizeTranslateTargetLang(els.translateTargetLang.value || 'RU');
    WaDeckTranslateModule.syncHoverTranslateTargetLang();
  });
  els.translateSourceLang.addEventListener('change', () => {
    state.translateSourceLang = String(els.translateSourceLang.value || 'AUTO').toUpperCase();
  });

  els.pickAttachments.addEventListener('click', () => WaDeckScheduleModule.pickAttachments().catch(console.error));
  els.clearAttachments.addEventListener('click', WaDeckScheduleModule.clearAttachments);
  els.openChatPicker.addEventListener('click', () => WaDeckScheduleModule.openChatPicker().catch(console.error));
  els.pickerAccount.addEventListener('change', () => WaDeckScheduleModule.refreshPickerChats(true).catch(console.error));
  els.pickerRefresh.addEventListener('click', () => WaDeckScheduleModule.refreshPickerChats(true).catch(console.error));
  els.closeChatPicker?.addEventListener('click', WaDeckScheduleModule.closeChatPicker);
  els.accountMenuSave.addEventListener('click', () => saveAccountFromMenu().catch(console.error));
  els.accountMenuReset?.addEventListener('click', () => resetAccountFromMenu().catch(console.error));
  els.accountMenuIcon?.addEventListener('click', () => changeAccountIconFromMenu().catch(console.error));
  els.accountMenuCancel.addEventListener('click', closeAccountMenu);
  els.accountMenuFreeze?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    const account = accountById(id);
    if (!account) return;
    setAccountFrozenState(id, !account.frozen, { reopenMenu: true }).catch(console.error);
  });
  els.accountMenuDelete?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    if (!id) return;
    closeAccountMenu();
    removeAccount(id).catch(console.error);
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
    WaDeckScheduleModule.renderScheduleTarget();
    WaDeckScheduleModule.closeChatPicker();
    setStatus(`Цель отправки: ${account.name} / ${chatName}`);
  });
  els.createSchedule.addEventListener('click', () => {
    runWithBusyButton(els.createSchedule, () => WaDeckScheduleModule.createScheduledMessage(), {
      text: 'Планирую...',
      title: 'Создание отложенной отправки',
    }).catch(console.error);
  });
  templateController?.bind();
}

async function init() {
  const moduleCtx = { state, els, setStatus, trimMapSize, runWithBusyButton };
  WaDeckWeatherModule.init(moduleCtx);
  WaDeckAutoUpdateModule.init(moduleCtx);
  WaDeckUnreadModule.init({ ...moduleCtx, renderAccounts, isWebviewReady, safeExecuteInWebview });
  WaDeckCrmModule.init({ ...moduleCtx, activeAccount, selectedWebview });
  WaDeckTranslateModule.init({ ...moduleCtx, runWithBusyButton, safeExecuteInWebview, selectedWebview });
  WaDeckScheduleModule.init({ ...moduleCtx, trimMapSize, runWithBusyButton, accountById, ensureWebview, isWebviewReady, sendWebviewInput, delay, formatDateTime, nextSendAtLocal });

  if (typeof window.waDeck.onAutoUpdateStatus === 'function' && !state.autoUpdateUnsubscribe) {
    state.autoUpdateUnsubscribe = window.waDeck.onAutoUpdateStatus((payload) => {
      WaDeckAutoUpdateModule.handleAutoUpdateStatus(payload);
    });
  }
  if (typeof window.waDeck.onHostEscape === 'function') {
    window.waDeck.onHostEscape(() => {
      handleEscapeUiReset();
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
    weatherCity: WaDeckWeatherModule.normalizeWeatherCity(boot.settings?.weatherCity || 'Moscow'),
    weatherUnit: WaDeckWeatherModule.normalizeWeatherUnit(boot.settings?.weatherUnit || 'celsius'),
    lastSeenReleaseNotesVersion: String(boot.settings?.lastSeenReleaseNotesVersion || ''),
  };
  state.templates = Array.isArray(boot.templates) ? boot.templates.map((tpl) => ({ ...tpl })) : [];
  state.runtime = boot.runtime || {};
  state.runtime.appVersion = String(boot.appVersion || state.runtime.appVersion || '').trim();

  for (const account of state.accounts) {
    ensureWebview(account);
  }

  state.startupHubVisible = true;
  if (state.startupHubTimeoutId) {
    clearTimeout(state.startupHubTimeoutId);
    state.startupHubTimeoutId = null;
  }

  // Стартуем всегда в хабе без активного WhatsApp.
  setActiveAccount('');
  updatePanelVisibility();
  applySettingsToForm();
  WaDeckScheduleModule.renderAttachmentsDraft();
  WaDeckScheduleModule.renderScheduleTarget();
  els.translateTargetLang.value = state.translateTargetLang;
  els.translateSourceLang.value = state.translateSourceLang;
  els.translateInput.value = '';
  els.translateOutput.value = '';
  els.crmContactName.value = '';
  els.crmFullName.value = '';
  els.crmCountryCity.value = '';
  els.crmAbout.value = '';
  els.crmMyInfo.value = '';
  els.crmMeta.textContent = 'Файл: —';
  WaDeckCrmModule.setCrmEditable(false);
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
  await WaDeckScheduleModule.renderScheduled();

  bindActions();
  WaDeckWeatherModule.startWeatherRefreshLoop();
  WaDeckWeatherModule.refreshWeather().catch((e) => console.warn('[weather]', e));
  WaDeckScheduleModule.startScheduleRunner();
  WaDeckUnreadModule.startUnreadPolling();
  WaDeckUnreadModule.scheduleDockBadgeSync();
  WaDeckAutoUpdateModule.maybeShowReleaseNotes().catch(console.error);

  setStatus(
    `Готово. Аккаунтов: ${state.accounts.length}, Electron ${state.runtime.electron || '?'}, Chromium ${state.runtime.chrome || '?'}`,
  );
}

init().catch((error) => {
  setStatus(`Ошибка запуска: ${String(error?.message || error)}`);
});
