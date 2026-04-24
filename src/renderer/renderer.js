/* Global error handlers for renderer process */
window.addEventListener('error', (e) => console.error('[renderer] error:', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => console.error('[renderer] unhandled rejection:', e.reason));

/* Encode UTF-8 string to base64 — used by webview inject scripts (insert-text) */
function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(String(str || ''));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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
  // Single-entry cache: picker only ever shows chats for the active account.
  // Shape: { accountId, at, chats }  (null when nothing fetched yet)
  chatPickerCache: null,
  unreadByAccount: new Map(),
  unreadPollTimer: null,
  dockBadgeTimer: null,
  autoUpdateUnsubscribe: null,
  hostEscapeUnsubscribe: null,
  accountMenuAccountId: '',
  accountMenuDraftIconPath: '',
  accountMenuDraftColor: '',
  draggedAccountId: '',
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
  unreadPollBusy: false,
  zoomByAccount: new Map(),
  _hubClockTimer: null,
  hubFilter: 'all', // 'all' | 'unread' | 'online'
  hubPendingCount: 0,
};

const els = {
  appRoot: document.getElementById('app-root'),
  brandHub: document.getElementById('brand-hub'),
  accountsScrollUp: document.getElementById('accounts-scroll-up'),
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
  weatherClose: document.getElementById('weather-close'),
  weatherMeta: document.getElementById('weather-meta'),
  activeAccountDisplay: document.getElementById('active-account-display'),
  activeUnread: document.getElementById('active-unread'),
  activeUnreadCount: document.getElementById('active-unread-count'),
  togglePanel: document.getElementById('toggle-panel'),
  panel: document.getElementById('panel'),
  closePanel: document.getElementById('close-panel'),
  manualUpdate: document.getElementById('manual-update'),
  themeToggle: document.getElementById('theme-toggle'),
  settingsBack: document.getElementById('settings-back'),
  settingsViewMenu: document.getElementById('settings-view-menu'),
  settingsViewDetail: document.getElementById('settings-view-detail'),
  panelTitleText: document.getElementById('panel-title-text'),
  aboutAppVersion: document.getElementById('about-app-version'),
  aboutElectronVersion: document.getElementById('about-electron-version'),
  aboutChromiumVersion: document.getElementById('about-chromium-version'),
  wsettingsCity: document.getElementById('wsettings-city'),
  wsettingsUnit: document.getElementById('wsettings-unit'),
  wsettingsSave: document.getElementById('wsettings-save'),
  wsettingsRefresh: document.getElementById('wsettings-refresh'),

  saveSettings: document.getElementById('save-settings'),
  settingTranslatorEnabled: document.getElementById('setting-translator-enabled'),
  settingCrmHoverEnabled: document.getElementById('setting-crm-hover-enabled'),
  templateSelect: document.getElementById('template-select'),
  templateSearch: document.getElementById('template-search'),
  templateSearchRow: document.getElementById('template-search-row'),
  templateSearchInput: document.getElementById('template-search-input'),
  templateSearchResultsRow: document.getElementById('template-search-results-row'),
  templateSearchResults: document.getElementById('template-search-results'),
  templateTitle: document.getElementById('template-title'),
  templateCategory: document.getElementById('template-category'),
  templateCategoryList: document.getElementById('template-category-list'),
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
  accountMenuResetIcon: document.getElementById('account-menu-reset-icon'),
  accountMenuCancel: document.getElementById('account-menu-cancel'),
  accountMenuChip: document.getElementById('account-menu-chip'),
  accountMenuStatus: document.getElementById('account-menu-status'),
  accountMenuFreeze: document.getElementById('account-menu-freeze'),
  accountMenuPin: document.getElementById('account-menu-pin'),
  accountMenuDelete: document.getElementById('account-menu-delete'),
  sidebarResizeHandle: document.getElementById('sidebar-resize-handle'),

  updateAvailableModal: document.getElementById('update-available-modal'),
  updateVersionText: document.getElementById('update-version-text'),
  updateProgressBar: document.getElementById('update-progress-bar'),
  updateProgressFill: document.getElementById('update-progress-fill'),
  updateStatusText: document.getElementById('update-status-text'),
  updateInstallBtn: document.getElementById('update-install-btn'),
  updateDismissBtn: document.getElementById('update-dismiss-btn'),
  closeUpdateModal: document.getElementById('close-update-modal'),

  releaseNotesModal: document.getElementById('release-notes-modal'),
  releaseNotesTitle: document.getElementById('release-notes-title'),
  releaseNotesVersion: document.getElementById('release-notes-version'),
  releaseNotesList: document.getElementById('release-notes-list'),
  closeReleaseNotes: document.getElementById('close-release-notes'),

  crmModal: document.getElementById('crm-modal'),
  crmContactName: document.getElementById('crm-contact-name'),
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
  confirmClose: document.getElementById('confirm-close'),

  zoomSlider: document.getElementById('zoom-slider'),
  zoomOut: document.getElementById('zoom-out'),
  zoomIn: document.getElementById('zoom-in'),
  zoomValue: document.getElementById('zoom-value'),

  clocksSettingsList: document.getElementById('clocks-settings-list'),
  clockNewLabel: document.getElementById('clock-new-label'),
  clockNewTz: document.getElementById('clock-new-tz'),
  clockAdd: document.getElementById('clock-add'),
  clockAddForm: document.getElementById('clocks-add-form'),
  clockAddToggle: document.getElementById('clock-add-toggle'),

  toolbarClock: document.getElementById('toolbar-clock'),
  toolbarClockTime: document.getElementById('toolbar-clock-time'),
  toolbarClockZones: document.getElementById('toolbar-clock-zones'),
  toolbarClockPopover: document.getElementById('toolbar-clock-popover'),

  openTemplateQuick: document.getElementById('open-template-quick'),
  openScheduleToolbar: document.getElementById('open-schedule-toolbar'),
  schedulePopover: document.getElementById('schedule-popover'),
  schedulePopoverClose: document.getElementById('schedule-popover-close'),
  spCreateDetails: document.getElementById('sp-create-details'),
  spAccount: document.getElementById('sp-account'),
  spChat: document.getElementById('sp-chat'),
  spText: document.getElementById('sp-text'),
  spAt: document.getElementById('sp-at'),
  spPickAttachments: document.getElementById('sp-pick-attachments'),
  spClearAttachments: document.getElementById('sp-clear-attachments'),
  spAttachmentsList: document.getElementById('sp-attachments-list'),
  spCreate: document.getElementById('sp-create'),
  spList: document.getElementById('sp-list'),
  spListSummary: document.getElementById('sp-list-summary'),
  sendVoiceMsg: document.getElementById('send-voice-msg'),
};

let templateController = null;

function normalizeTheme(value) {
  return String(value || '').toLowerCase() === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  const safeTheme = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', safeTheme);
  if (els.themeToggle) {
    els.themeToggle.classList.toggle('is-light', safeTheme === 'light');
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

let _statusClearTimer = null;
function setStatus(text) {
  const safeText = String(text || '');
  if (els.status) {
    els.status.textContent = safeText;
    els.status.title = safeText;
    els.status.classList.toggle('hidden', !safeText);
  }
  const lower = safeText.toLowerCase();
  const isError = lower.includes('ошибка') || lower.includes('не удалось') || lower.includes('неверн');
  if (lower.includes('сохранен') || lower.includes('скопирован') || lower.includes('удален') || lower.includes('разморожен')) {
    showToast(text, 'success');
  } else if (isError) {
    showToast(text, 'error', 5000);
  }
  if (_statusClearTimer) { clearTimeout(_statusClearTimer); _statusClearTimer = null; }
  if (safeText && !isError) {
    _statusClearTimer = setTimeout(() => {
      if (els.status) { els.status.textContent = ''; els.status.classList.add('hidden'); }
    }, 3000);
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

// ── Animated modal close ──
function closeModalAnimated(modalEl) {
  if (!modalEl || modalEl.classList.contains('hidden') || modalEl.classList.contains('is-closing')) return;
  modalEl.classList.add('is-closing');
  const cleanup = () => {
    modalEl.classList.remove('is-closing');
    modalEl.classList.add('hidden');
  };
  modalEl.addEventListener('animationend', cleanup, { once: true });
  setTimeout(() => {
    if (modalEl.classList.contains('is-closing')) cleanup();
  }, 250);
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
    if (els.confirmModal) {
      els.confirmModal.classList.remove('hidden');
      els.confirmModal.setAttribute('role', 'dialog');
      els.confirmModal.setAttribute('aria-modal', 'true');
      setTimeout(() => els.confirmOk?.focus(), 50);
    }
  });
}

function closeConfirm(result) {
  closeModalAnimated(els.confirmModal);
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

function playBrandClickAnimation() {
  if (!els.brandHub) return;
  els.brandHub.classList.remove('is-clicked');
  void els.brandHub.offsetWidth;
  els.brandHub.classList.add('is-clicked');
  setTimeout(() => els.brandHub?.classList.remove('is-clicked'), 750);
}

/* ── CRM Hover Popover (read-only on contact hover) ── */
let _crmHoverCache = new Map(); // contactKey → { data, ts }
let _crmHoverGen = new Map();   // contactKey → generation counter (bumps on save/invalidate)
const CRM_HOVER_CACHE_MAX = 200;
function _crmHoverCacheSet(key, value) {
  if (_crmHoverCache.size >= CRM_HOVER_CACHE_MAX) {
    // Evict oldest (first key in insertion-order Map)
    const oldest = _crmHoverCache.keys().next().value;
    if (oldest !== undefined) {
      _crmHoverCache.delete(oldest);
      _crmHoverGen.delete(oldest);
    }
  }
  _crmHoverCache.set(key, value);
}
let _crmHoverTimer = null;

function _crmHoverGenOf(key) {
  return _crmHoverGen.get(key) || 0;
}
function _crmHoverGenBump(key) {
  const next = _crmHoverGenOf(key) + 1;
  _crmHoverGen.set(key, next);
  return next;
}

window._invalidateCrmHoverCache = function (accountId, contactName) {
  const key = accountId + '::' + contactName;
  _crmHoverCache.delete(key);
  _crmHoverGenBump(key);
  if (_crmHoverVisible && _crmHoverShowName === contactName) hideCrmHoverPopover(true);
};

// Direct cache update with known-fresh record (used after save).
window._updateCrmHoverCache = function (accountId, contactName, record) {
  const key = accountId + '::' + contactName;
  _crmHoverGenBump(key);
  _crmHoverCacheSet(key, { data: record || {}, ts: Date.now() });
};
let _crmHoverVisible = false;
let _crmHoverShowName = ''; // track which contact the current show is for

function getCrmHoverPopover() {
  let el = document.getElementById('crm-hover-popover');
  if (!el) {
    el = document.createElement('div');
    el.id = 'crm-hover-popover';
    el.className = 'crm-hover-popover hidden';
    el.innerHTML = [
      '<div class="crm-hover-header">',
      '  <span class="crm-hover-contact"></span>',
      '  <span class="crm-hover-badge">CRM</span>',
      '</div>',
      '<div class="crm-hover-fields"></div>',
    ].join('');
    document.body.appendChild(el);
    el.addEventListener('mouseenter', () => {
      if (_crmHoverTimer) { clearTimeout(_crmHoverTimer); _crmHoverTimer = null; }
    });
    el.addEventListener('mouseleave', () => {
      _crmHoverTimer = setTimeout(() => hideCrmHoverPopover(), 600);
    });
    // Capture wheel events so scrolling works over webview
    el.addEventListener('wheel', (e) => {
      e.stopPropagation();
      e.preventDefault();
      el.scrollTop += e.deltaY;
    }, { passive: false });
  }
  return el;
}

function hideCrmHoverPopover(force = false) {
  const el = document.getElementById('crm-hover-popover');
  if (!el) return;
  /* Don't hide if mouse is over the popover or user is dragging it (unless forced) */
  if (!force && (el.matches(':hover') || el._dragging)) return;
  el.classList.add('hidden');
  _crmHoverVisible = false;
}

function showCrmHoverPopover(contactName, record, webview, rect) {
  const popover = getCrmHoverPopover();
  const nameEl = popover.querySelector('.crm-hover-contact');
  const fieldsEl = popover.querySelector('.crm-hover-fields');
  nameEl.textContent = contactName;

  const fields = [];
  if (record.about) fields.push({ label: 'О нём', value: record.about });
  if (record.myInfo) fields.push({ label: 'Заметки', value: record.myInfo });

  if (fields.length === 0) {
    fieldsEl.innerHTML = '<div class="crm-hover-empty">Нет данных в CRM</div>';
  } else {
    fieldsEl.innerHTML = fields.map((f) =>
      '<div class="crm-hover-field">' +
      '<div class="crm-hover-label">' + escapeHtml(f.label) + '</div>' +
      '<div class="crm-hover-value">' + escapeHtml(f.value) + '</div>' +
      '</div>'
    ).join('');
  }

  // Position popover next to the contact in sidebar
  const wvRect = webview.getBoundingClientRect();
  const popoverWidth = 340;
  popover.style.width = popoverWidth + 'px';
  popover.classList.remove('hidden');

  // Default: place to the right of the contact row
  let left = Math.round(wvRect.left + rect.right + 4);
  let top = Math.round(wvRect.top + rect.top);

  // Flip to the left side if it would spill off the right edge
  if (left + popoverWidth > window.innerWidth - 10) {
    const flipped = Math.round(wvRect.left + rect.left - popoverWidth - 4);
    left = flipped > 8 ? flipped : Math.max(8, window.innerWidth - popoverWidth - 10);
  }

  const popoverHeight = popover.offsetHeight || 120;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = Math.max(8, window.innerHeight - popoverHeight - 10);
  }

  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
  _crmHoverVisible = true;

  /* Make popover draggable by header */
  if (!popover._dragBound) {
    popover._dragBound = true;
    const header = popover.querySelector('.crm-hover-header');
    if (header) {
      let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.crm-hover-badge')) return;
        dragging = true;
        popover._dragging = true;
        startX = e.clientX; startY = e.clientY;
        origLeft = parseInt(popover.style.left, 10) || 0;
        origTop = parseInt(popover.style.top, 10) || 0;
        if (_crmHoverTimer) { clearTimeout(_crmHoverTimer); _crmHoverTimer = null; }
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        popover.style.left = (origLeft + e.clientX - startX) + 'px';
        popover.style.top = (origTop + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; popover._dragging = false; });
    }
  }
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

async function handleCrmHover(account, webview, payload) {
  if (payload.type === 'hide') {
    _crmHoverShowName = '';
    if (_crmHoverTimer) clearTimeout(_crmHoverTimer);
    _crmHoverTimer = setTimeout(() => hideCrmHoverPopover(), 600);
    return;
  }
  if (payload.type !== 'show') return;

  // Global kill-switch: Hover CRM disabled in settings
  if (!isCrmHoverEnabled()) {
    _crmHoverShowName = '';
    hideCrmHoverPopover(true);
    return;
  }

  if (_crmHoverTimer) { clearTimeout(_crmHoverTimer); _crmHoverTimer = null; }

  const contactName = String(payload.contactName || '').trim();
  if (!contactName) return;
  _crmHoverShowName = contactName;

  const cacheKey = account.id + '::' + contactName;
  const cached = _crmHoverCache.get(cacheKey);
  const now = Date.now();

  let record;
  if (cached && now - cached.ts < 30000) {
    record = cached.data;
  } else {
    const genAtStart = _crmHoverGenOf(cacheKey);
    try {
      const res = await window.waDeck.crmLoadContact({
        accountId: account.id,
        accountName: account.name,
        contactName,
      });
      if (!res?.ok) return;
      const fetched = res.record || {};
      // A save/invalidate could have bumped gen during the fetch — don't clobber fresher data
      if (_crmHoverGenOf(cacheKey) !== genAtStart) {
        const fresh = _crmHoverCache.get(cacheKey);
        record = fresh ? fresh.data : fetched;
      } else {
        record = fetched;
        _crmHoverCacheSet(cacheKey, { data: record, ts: Date.now() });
        trimMapSize(_crmHoverCache, 50);
      }
    } catch (err) {
      console.warn('[CRM Hover] Failed to load contact:', contactName, err);
      return;
    }
  }

  // Guard: if a hide arrived while we were loading, don't show
  if (_crmHoverShowName !== contactName) return;

  // Per-contact hover toggle deprecated — global `crmHoverEnabled` (checked above)
  // is now the single source of truth. Legacy `hoverEnabled:false` on stored
  // records is intentionally ignored.

  const rect = { top: payload.top, bottom: payload.bottom, left: payload.left, right: payload.right };
  showCrmHoverPopover(contactName, record, webview, rect);
}

/* ── Zoom Control ── */

function applyZoom(percent) {
  const clamped = Math.max(50, Math.min(150, Math.round(percent / 5) * 5));
  const wv = selectedWebview();
  if (wv) {
    try { wv.setZoomFactor(clamped / 100); } catch { /* ignore */ }
  }
  if (state.activeAccountId) {
    state.zoomByAccount.set(state.activeAccountId, clamped);
  }
  if (els.zoomSlider) els.zoomSlider.value = String(clamped);
  if (els.zoomValue) els.zoomValue.textContent = clamped + '%';
}

function syncZoomSlider() {
  const id = state.activeAccountId;
  let zoom = 100;
  if (id) {
    zoom = state.zoomByAccount.get(id) || 100;
    const wv = state.webviews.get(id);
    if (wv) {
      try {
        const actual = wv.getZoomFactor?.();
        if (actual && Number.isFinite(actual)) zoom = Math.round(actual * 100);
      } catch { /* ignore */ }
    }
    state.zoomByAccount.set(id, zoom);
  }
  if (els.zoomSlider) els.zoomSlider.value = String(zoom);
  if (els.zoomValue) els.zoomValue.textContent = zoom + '%';
}

/* ── Clocks Settings ── */

function renderClocksSettings() {
  const list = els.clocksSettingsList;
  if (!list) return;
  list.innerHTML = '';
  const clocks = (state.settings && state.settings.worldClocks) || [];
  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i];
    const row = document.createElement('div');
    row.className = 'clocks-settings-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'clock-label-input';
    labelInput.value = c.label;
    labelInput.maxLength = 30;
    labelInput.title = 'Название';
    labelInput.addEventListener('change', () => {
      const v = labelInput.value.trim();
      if (v) { state.settings.worldClocks[i].label = v; saveSettings().catch(console.error); }
      else { labelInput.value = c.label; }
    });

    const tzSelect = document.createElement('select');
    tzSelect.className = 'clock-tz-select';
    tzSelect.title = c.tz;
    const tzOptions = getTimezoneOptions();
    for (const opt of tzOptions) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === c.tz) o.selected = true;
      tzSelect.appendChild(o);
    }
    tzSelect.addEventListener('change', () => {
      if (tzSelect.value) {
        state.settings.worldClocks[i].tz = tzSelect.value;
        saveSettings().catch(console.error);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-clock';
    removeBtn.textContent = '\u2715';
    removeBtn.title = 'Удалить';
    removeBtn.addEventListener('click', () => {
      state.settings.worldClocks.splice(i, 1);
      renderClocksSettings();
      saveSettings().catch(console.error);
    });
    row.append(labelInput, tzSelect, removeBtn);
    list.appendChild(row);
  }
}

function getTimezoneOptions() {
  return [
    { value: 'Pacific/Auckland', label: 'Окленд +12' },
    { value: 'Asia/Tokyo', label: 'Токио +9' },
    { value: 'Asia/Shanghai', label: 'Шанхай +8' },
    { value: 'Asia/Bangkok', label: 'Бангкок +7' },
    { value: 'Asia/Almaty', label: 'Алматы +6' },
    { value: 'Asia/Tashkent', label: 'Ташкент +5' },
    { value: 'Asia/Dubai', label: 'Дубай +4' },
    { value: 'Europe/Moscow', label: 'Москва +3' },
    { value: 'Europe/Kiev', label: 'Киев +2/+3' },
    { value: 'Europe/Berlin', label: 'Берлин +1/+2' },
    { value: 'Europe/London', label: 'Лондон +0/+1' },
    { value: 'Atlantic/Azores', label: 'Азоры −1' },
    { value: 'America/Sao_Paulo', label: 'Сан-Паулу −3' },
    { value: 'America/New_York', label: 'Нью-Йорк −5' },
    { value: 'America/Chicago', label: 'Чикаго −6' },
    { value: 'America/Denver', label: 'Денвер −7' },
    { value: 'America/Los_Angeles', label: 'Лос-Анж. −8' },
    { value: 'Pacific/Honolulu', label: 'Гонолулу −10' },
  ];
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
  const account = activeAccount();
  const hasActive = Boolean(account);
  const isWa = hasActive && account.type !== 'telegram';
  if (els.refreshActive) els.refreshActive.disabled = !hasActive;
  if (els.freezeActive) { els.freezeActive.disabled = !isWa; els.freezeActive.style.display = isWa || !hasActive ? '' : 'none'; }
  if (els.openCrmModal) { els.openCrmModal.disabled = !isWa; els.openCrmModal.style.display = isWa || !hasActive ? '' : 'none'; }
  if (els.sendVoiceMsg) { els.sendVoiceMsg.disabled = !isWa; els.sendVoiceMsg.style.display = isWa || !hasActive ? '' : 'none'; }
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

// Global hotkey: Cmd+Alt+Shift+I → open DevTools of the currently active
// WhatsApp webview (so DOM diagnostics run in WA's context, not ours).
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.altKey && e.shiftKey && e.key.toLowerCase() === 'i') {
    const wv = selectedWebview();
    if (wv && typeof wv.openDevTools === 'function') {
      try { wv.openDevTools(); } catch (err) { console.warn('openDevTools failed:', err); }
      e.preventDefault();
    }
  }
});

// Debug helper — run from main-window DevTools: await window.__wadeckProbeChat()
// Probes the active WhatsApp webview DOM so we can find how WA Web labels
// the currently open chat on the current build.
window.__wadeckProbeChat = async function () {
  const wv = selectedWebview();
  if (!wv) return 'NO_ACTIVE_WEBVIEW';
  const script = `(() => {
    const out = {};
    out.headers = Array.from(document.querySelectorAll('header')).map((h, i) => {
      const r = h.getBoundingClientRect();
      return { i, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), text: (h.innerText||'').slice(0, 150) };
    });
    const compose =
      document.querySelector('footer [contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][data-tab]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]');
    out.composeFound = !!compose;
    if (compose) {
      // Walk up from compose and find the nearest header above it in the tree
      let node = compose;
      let hops = 0;
      while (node && hops < 20) {
        const h = node.querySelector ? node.querySelector('header') : null;
        if (h) { out.chatPaneHeader = (h.innerText||'').slice(0,150); break; }
        node = node.parentElement; hops++;
      }
    }
    // Try to locate the chat list (renamed away from #pane-side)
    const probes = ['#pane-side','[aria-label="Chat list"]','[aria-label="Список чатов"]','[aria-label*="Chat"]','div[role="grid"]','div[role="list"]','[data-testid*="chat-list"]','nav[aria-label]'];
    out.listProbes = probes.map((s) => ({ s, count: document.querySelectorAll(s).length }));
    // Find any element with "selected" / "current" aria
    const ariaSel = Array.from(document.querySelectorAll('[aria-selected="true"]')).slice(0, 5).map((el) => ({ tag: el.tagName, text: (el.innerText||'').slice(0,80) }));
    const ariaCur = Array.from(document.querySelectorAll('[aria-current="page"], [aria-current="true"]')).slice(0, 5).map((el) => ({ tag: el.tagName, text: (el.innerText||'').slice(0,80) }));
    out.ariaSelected = ariaSel;
    out.ariaCurrent = ariaCur;
    return out;
  })();`;
  try {
    const result = await wv.executeJavaScript(script, true);
    console.log('[wadeck probe]', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error('[wadeck probe] failed:', err);
    return { error: String(err) };
  }
};

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

/** Lightweight: only toggle .active class without rebuilding DOM */
function updateAccountActiveHighlight() {
  const cards = els.accountsList.querySelectorAll('.account-item');
  for (const card of cards) {
    card.classList.toggle('active', card.dataset.accountId === state.activeAccountId);
  }
}

/** Update status dot + tooltip for a single account card (no full rebuild) */
function updateAccountCardStatus(accountId) {
  const card = els.accountsList.querySelector(`.account-item[data-account-id="${accountId}"]`);
  if (!card) return;
  const account = accountById(accountId);
  if (!account) return;

  // Status dot: only rendered for frozen accounts now.
  // Add/remove the dot dynamically as the frozen flag toggles.
  const existingDot = card.querySelector('.account-status-dot');
  if (account.frozen) {
    if (existingDot) {
      existingDot.className = 'account-status-dot status-frozen';
      existingDot.title = 'Заморожен';
    } else {
      const statusDot = document.createElement('div');
      statusDot.className = 'account-status-dot status-frozen';
      statusDot.title = 'Заморожен';
      card.appendChild(statusDot);
    }
  } else if (existingDot) {
    existingDot.remove();
  }

  // Update tooltip
  const tooltip = card.querySelector('.account-tooltip');
  if (tooltip) {
    let tooltipStatus = '';
    if (account.frozen) { tooltipStatus = 'Заморожен ❄'; }
    else {
      const wv = state.webviews.get(account.id);
      if (!wv) tooltipStatus = 'Не подключён';
      else if (wv.dataset?.waReady === '1') tooltipStatus = 'Подключён';
      else tooltipStatus = 'Загрузка…';
    }
    const typeLabel = account.type === 'telegram' ? 'Telegram' : 'WhatsApp';
    tooltip.textContent = account.name + ' — ' + typeLabel + ' — ' + tooltipStatus;
  }
}

function renderAccounts() {
  const fragment = document.createDocumentFragment();

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

    // Lovable-style: whole card is colored, icon/initials inside
    card.style.background = account.color;
    if (account.iconUrl) {
      card.style.backgroundImage = `url(${account.iconUrl})`;
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';
    }

    const label = document.createElement('span');
    label.className = 'account-label';
    label.textContent = account.name.slice(0, 2).toUpperCase();
    if (account.iconUrl) label.style.opacity = '0'; // hide text when icon set

    card.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAccountMenu(account.id);
    });

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

    if (account.pinned) {
      const pinTag = document.createElement('div');
      pinTag.className = 'account-pin-tag';
      pinTag.title = 'Закреплён в хабе';
      pinTag.textContent = '★';
      card.appendChild(pinTag);
    }

    // Account type badge (WhatsApp / Telegram)
    const typeBadge = document.createElement('div');
    typeBadge.className = 'account-type-badge';
    if (account.type === 'telegram') {
      typeBadge.classList.add('account-type-tg');
      typeBadge.title = 'Telegram';
      typeBadge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.07-.2c-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z" fill="white"/></svg>';
    } else {
      typeBadge.classList.add('account-type-wa');
      typeBadge.title = 'WhatsApp';
      typeBadge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.106-1.138l-.294-.176-2.868.852.852-2.868-.176-.294A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="white"/></svg>';
    }
    card.appendChild(typeBadge);

    // Only show a status dot for frozen accounts (user-controlled, reliable).
    // Online/offline/loading dots were removed — they frequently lied because
    // WhatsApp Web's "ready" signal doesn't always match the actual logged-in
    // state the user perceives.
    if (account.frozen) {
      const statusDot = document.createElement('div');
      statusDot.className = 'account-status-dot status-frozen';
      statusDot.title = 'Заморожен';
      card.appendChild(statusDot);
    }

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
    const typeLabel = account.type === 'telegram' ? 'Telegram' : 'WhatsApp';
    tooltip.textContent = account.name + ' — ' + typeLabel + ' — ' + tooltipStatus;
    card.appendChild(tooltip);

    // Контекстное меню (правый клик)
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAccountContextMenu(e, account);
    });

    card.append(remove, label);
    fragment.appendChild(card);
  }

  els.accountsList.innerHTML = '';
  els.accountsList.appendChild(fragment);
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
// Leading 14×14 SVG icons — subtle, same stroke as text, match the app's
// existing lucide-style iconography.
const CM_ICON = {
  refresh: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFilled: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  snowflake: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8M2 12h20M5 9l3 3-3 3M19 9l-3 3 3 3M9 5l3 3 3-3M9 19l3-3 3 3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

function showAccountContextMenu(event, accountOrId) {
  closeAccountContextMenu();
  // Always resolve the FRESH account from state. patchLocalAccount replaces
  // the account object on every mutation, so the closure-captured `account`
  // here could be stale (e.g. after pin/unpin, frozen toggle). Re-fetching by
  // id guarantees the menu reflects current state — this was the root cause
  // of "Закрепить works, Открепить doesn't" reported in 0.7.4 testing.
  const id = typeof accountOrId === 'string' ? accountOrId : accountOrId?.id;
  const account = accountById(String(id || ''));
  if (!account) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu context-menu--account';
  menu.id = 'account-context-menu';

  const isWa = account.type !== 'telegram';

  const items = [
    { label: 'Обновить', icon: CM_ICON.refresh, action: () => { setActiveAccount(account.id); requestAnimationFrame(() => refreshActiveWebview()); } },
    {
      label: account.pinned ? 'Открепить' : 'Закрепить',
      icon: account.pinned ? CM_ICON.starFilled : CM_ICON.star,
      iconClass: account.pinned ? 'is-on' : '',
      action: () => { setAccountPinnedState(account.id, !account.pinned).catch(console.error); },
    },
    ...(isWa ? [{
      label: account.frozen ? 'Разморозить' : 'Заморозить',
      icon: CM_ICON.snowflake,
      iconClass: account.frozen ? 'is-on' : '',
      action: () => { setAccountFrozenState(account.id, !account.frozen).catch(console.error); },
    }] : []),
    { divider: true },
    { label: 'Управление', icon: CM_ICON.settings, action: () => openAccountMenu(account.id) },
    { divider: true },
    { label: 'Удалить', icon: CM_ICON.trash, danger: true, action: () => removeAccount(account.id).catch(console.error) },
  ];

  for (const item of items) {
    if (item.divider) {
      const div = document.createElement('div');
      div.className = 'context-menu-divider';
      menu.appendChild(div);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'context-menu-item'
      + (item.danger ? ' danger' : '')
      + (item.disabled ? ' is-disabled' : '');

    const iconHost = document.createElement('span');
    iconHost.className = 'context-menu-icon' + (item.iconClass ? ' ' + item.iconClass : '');
    iconHost.innerHTML = item.icon || '';
    el.appendChild(iconHost);

    const labelHost = document.createElement('span');
    labelHost.className = 'context-menu-label';
    labelHost.textContent = item.label;
    el.appendChild(labelHost);

    if (item.hint) {
      const hint = document.createElement('span');
      hint.className = 'context-menu-hint';
      hint.textContent = item.hint;
      el.appendChild(hint);
    }

    if (!item.disabled) {
      el.addEventListener('click', () => {
        closeAccountContextMenu();
        item.action();
      });
    }
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
  document.addEventListener('click', closeOnClick, { capture: true });
  document.addEventListener('keydown', closeOnEsc);
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

// ── Toolbar Clock tooltip ──
// We build a fresh tooltip element in document.body from scratch (and
// discard the legacy #toolbar-clock-popover) because:
//   1. Electron's <webview> paints on a compositor layer above normal DOM,
//      so a popover nested in the toolbar gets hidden by the chat view.
//   2. The legacy element inherited `right: 0` plus other rules that made
//      it stretch to full viewport width when we promoted it to fixed
//      positioning. Rebuilding guarantees a clean slate.
// The tooltip uses fully inline styles so no cascading rule can widen it.
(function setupClockTooltip() {
  const clock = document.getElementById('toolbar-clock');
  if (!clock) return;
  const legacy = document.getElementById('toolbar-clock-popover');
  if (legacy) legacy.remove();

  const tooltip = document.createElement('div');
  tooltip.id = 'clock-tooltip';
  tooltip.style.cssText = [
    'position:fixed',
    'top:-1000px', 'left:-1000px',          // offscreen until first show
    'z-index:99999',
    'opacity:0',
    'pointer-events:none',
    'transition:opacity 0.15s ease',
    'display:flex',
    'flex-direction:column',
    'gap:6px',
    'min-width:180px',
    'max-width:260px',
    'width:max-content',                    // shrink to content
    'padding:10px 14px',
    'background:var(--bg-1, #1a2030)',
    'border:1px solid var(--stroke, rgba(255,255,255,0.15))',
    'border-radius:12px',
    'box-shadow:0 16px 40px -12px rgba(0,0,0,0.6)',
    'backdrop-filter:blur(18px)',
    '-webkit-backdrop-filter:blur(18px)',
  ].join(';');
  document.body.appendChild(tooltip);

  const DEFAULT_ZONES = [
    { label: 'Москва', tz: 'Europe/Moscow' },
    { label: 'Киев',   tz: 'Europe/Kiev' },
    { label: 'Берлин', tz: 'Europe/Berlin' },
  ];

  function renderZones() {
    const zones = (state.settings && Array.isArray(state.settings.worldClocks) && state.settings.worldClocks.length)
      ? state.settings.worldClocks
      : DEFAULT_ZONES;
    const now = new Date();
    const parts = [
      '<div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-4,#6d7d90);margin-bottom:2px">Часовые пояса</div>',
    ];
    for (const z of zones) {
      let time = '--:--';
      try {
        time = new Intl.DateTimeFormat('ru', {
          hour: '2-digit', minute: '2-digit', timeZone: z.tz, hour12: false,
        }).format(now);
      } catch { /* invalid tz */ }
      const label = String(z.label || '').replace(/[<>]/g, '');
      parts.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:12px;white-space:nowrap">' +
          '<span style="color:var(--text-2,#b0bac8)">' + label + '</span>' +
          '<span style="font-family:var(--mono,ui-monospace,SF Mono,Menlo,monospace);color:var(--text-strong,#e5eaf0);font-weight:600;font-variant-numeric:tabular-nums">' + time + '</span>' +
        '</div>'
      );
    }
    tooltip.innerHTML = parts.join('');
  }

  function reposition() {
    const rect = clock.getBoundingClientRect();
    const ttWidth = tooltip.offsetWidth || 200;
    let left = Math.round(rect.right - ttWidth);
    if (left + ttWidth > window.innerWidth - 8) left = window.innerWidth - ttWidth - 8;
    if (left < 8) left = 8;
    tooltip.style.top = Math.round(rect.bottom + 6) + 'px';
    tooltip.style.left = left + 'px';
  }

  let hideTimer = null;
  const show = () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    renderZones();
    // Measure after content is in place
    reposition();
    tooltip.style.opacity = '1';
    tooltip.style.pointerEvents = 'auto';
    // One more pass after paint in case fonts changed the width
    requestAnimationFrame(reposition);
  };
  const hide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.pointerEvents = 'none';
    }, 120);
  };
  clock.addEventListener('mouseenter', show);
  clock.addEventListener('mouseleave', hide);
  tooltip.addEventListener('mouseenter', () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
  tooltip.addEventListener('mouseleave', hide);
  window.addEventListener('resize', () => {
    if (tooltip.style.opacity === '1') reposition();
  }, { passive: true });
})();

function updateToolbarClock() {
  if (!els.toolbarClockTime) return;
  const now = new Date();
  els.toolbarClockTime.textContent = new Intl.DateTimeFormat('ru', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
}

// ── Hub Dashboard ──
function updateHubClocks() {
  const container = document.getElementById('hub-clocks');
  if (!container) return;
  const zones = (state.settings && state.settings.worldClocks) || [
    { label: 'Москва', tz: 'Europe/Moscow' },
    { label: 'Киев', tz: 'Europe/Kiev' },
    { label: 'Берлин', tz: 'Europe/Berlin' },
  ];
  container.innerHTML = '';
  const now = new Date();
  for (const zone of zones) {
    const el = document.createElement('div');
    el.className = 'hub-clock-item';
    let time = '--:--';
    try {
      time = new Intl.DateTimeFormat('ru', {
        hour: '2-digit', minute: '2-digit',
        timeZone: zone.tz, hour12: false,
      }).format(now);
    } catch { /* invalid tz */ }
    const timeSpan = document.createElement('span');
    timeSpan.className = 'hub-clock-time';
    timeSpan.textContent = time;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'hub-clock-label';
    labelSpan.textContent = zone.label;
    el.append(timeSpan, labelSpan);
    container.appendChild(el);
  }
}

/* Motivational phrases shown in the hub title between 23:00 and 09:00 local
   time — a tiny reward for early-birds / night-owls working out of hours.
   Regular 09:00-23:00 keeps the plain "WA Deck" brand. */
const HUB_MOTIVATION_PHRASES = [
  'Пока другие спят — ты зарабатываешь 🌙',
  'Миллион сам себя не сделает 💵',
  'Каждое сообщение — шаг к богатству 📈',
  'Работай, пока остальные в кровати 🦉',
  'Деньги приходят к тем, кто не спит 🦅',
  'Сегодня трудись — завтра отдыхай 🔥',
  'Мечты не работают, пока не работаешь ты 💪',
  'Время — деньги, не теряй ни минуты ⏳',
  'Твой успех в твоих руках 🎯',
  'Не жди удачи — создавай её ⚡',
  'Богатые встают рано ☕',
  'Лень сегодня — пустой счёт завтра 🏦',
  'Сильные работают, слабые спят 💯',
  'Ещё один чат — ещё один рубль в копилке 💼',
  'Сон переоценён, деньги — нет 💸',
  'Ты сам проектируешь свой завтрашний доход 🛠️',
  'Делай больше, чем от тебя ждут 🏆',
  'Солнце ещё не встало — а ты уже в деле ☀️',
  'Пока город просыпается — твой доход уже растёт 🏙️',
  'Пока слабые видят сны — сильные шлют счета 🧾',
  'Кофе сварен — пора зарабатывать ☕',
  'Усталость — цена, деньги — награда 🎁',
];

function updateHubGreeting() {
  const el = document.getElementById('hub-greeting');
  if (!el) return;
  const now = new Date();
  const h = now.getHours();
  let word = 'Добрый день';
  let icon = '☀';
  if (h < 6) { word = 'Доброй ночи'; icon = '☾'; }
  else if (h < 12) { word = 'Доброе утро'; icon = '☀'; }
  else if (h < 18) { word = 'Добрый день'; icon = '☀'; }
  else { word = 'Добрый вечер'; icon = '☾'; }
  const dateStr = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  el.innerHTML = '';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'hub-greeting-icon';
  iconSpan.textContent = icon;
  const textSpan = document.createElement('span');
  textSpan.className = 'hub-greeting-text';
  textSpan.textContent = word;
  const dateSpan = document.createElement('span');
  dateSpan.className = 'hub-greeting-date';
  dateSpan.textContent = '· ' + dateStr;
  el.append(iconSpan, textSpan, dateSpan);

  // Motivational hub-title swap — active 23:00–08:59, plain "WA Deck" otherwise.
  const titleEl = document.getElementById('hub-title');
  if (titleEl) {
    const offHours = h < 9 || h >= 23;
    if (offHours) {
      const phrase = HUB_MOTIVATION_PHRASES[Math.floor(Math.random() * HUB_MOTIVATION_PHRASES.length)];
      titleEl.textContent = phrase;
      titleEl.classList.add('hub-title--motivation');
    } else {
      titleEl.textContent = 'WA Deck';
      titleEl.classList.remove('hub-title--motivation');
    }
  }
}

function updateHubMetrics() {
  // Metrics row was removed from the hub per UX feedback (it hogged space
  // without adding signal). Keep the function as a no-op so callers don't
  // need to branch. If the element is still present in some shell build,
  // clear it so nothing stale lingers.
  const el = document.getElementById('hub-metrics');
  if (el) el.innerHTML = '';
  return;
  // eslint-disable-next-line no-unreachable
  if (!el) return;
  let totalUnread = 0;
  for (const n of state.unreadByAccount.values()) totalUnread += Number(n || 0);
  const accounts = state.accounts || [];
  const online = accounts.filter((a) => {
    if (a.frozen) return false;
    const wv = state.webviews.get(a.id);
    return wv && wv.dataset && wv.dataset.waReady === '1';
  }).length;
  const total = accounts.length;
  const withUnread = accounts.filter((a) => Number(state.unreadByAccount.get(a.id) || 0) > 0).length;
  const pending = state.hubPendingCount || 0;

  const metrics = [
    { label: 'Непрочитанных', val: String(totalUnread), sub: totalUnread > 0 ? (withUnread + ' чат.') : 'нет новых', c: 'rose' },
    { label: 'Чаты с непрочитанными', val: String(withUnread), sub: total ? (withUnread + '/' + total) : '—', c: 'warn' },
    { label: 'Отложено', val: String(pending), sub: pending > 0 ? 'в очереди' : 'пусто', c: 'accent' },
    { label: 'Активных аккаунтов', val: online + '/' + total, sub: online === total && total > 0 ? 'все онлайн' : (online > 0 ? 'онлайн' : '—'), c: 'blue' },
  ];
  el.innerHTML = '';
  for (const m of metrics) {
    const card = document.createElement('div');
    card.className = 'hub-metric hub-metric-' + m.c;
    const bar = document.createElement('span');
    bar.className = 'hub-metric-bar';
    const label = document.createElement('div');
    label.className = 'hub-metric-label';
    label.textContent = m.label;
    const val = document.createElement('div');
    val.className = 'hub-metric-val';
    val.textContent = m.val;
    const sub = document.createElement('div');
    sub.className = 'hub-metric-sub';
    sub.textContent = m.sub;
    card.append(bar, label, val, sub);
    el.appendChild(card);
  }
}

function updateHubFilters() {
  const el = document.getElementById('hub-filters');
  if (!el) return;
  const filters = [
    { id: 'all', label: 'Все', hint: 'Все аккаунты' },
    { id: 'unread', label: 'Непрочитанные', hint: 'Только аккаунты с новыми сообщениями' },
    { id: 'online', label: 'Онлайн', hint: 'Только подключённые (не замороженные) аккаунты' },
  ];
  el.innerHTML = '';
  for (const f of filters) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-filter-chip' + (state.hubFilter === f.id ? ' active' : '');
    btn.textContent = f.label;
    btn.title = f.hint;
    btn.setAttribute('aria-label', f.hint);
    btn.addEventListener('click', () => {
      state.hubFilter = f.id;
      updateHubDashboard();
    });
    el.appendChild(btn);
  }
}

function filteredHubAccounts() {
  const all = state.accounts || [];
  if (state.hubFilter === 'unread') {
    return all.filter((a) => Number(state.unreadByAccount.get(a.id) || 0) > 0);
  }
  if (state.hubFilter === 'online') {
    return all.filter((a) => {
      if (a.frozen) return false;
      const wv = state.webviews.get(a.id);
      return wv && wv.dataset && wv.dataset.waReady === '1';
    });
  }
  return all;
}

async function updateHubDashboard() {
  const hubScreen = document.getElementById('hub-screen');
  if (hubScreen && hubScreen.classList.contains('hidden')) return;
  updateHubClocks();
  updateHubGreeting();

  // pending scheduled count (used by metrics)
  try {
    const res = await window.waDeck.listScheduled({ limit: 50 });
    const pending = Array.isArray(res?.items) ? res.items.filter((i) => i.status === 'pending') : [];
    state.hubPendingCount = pending.length;
  } catch { /* ignore */ }

  updateHubMetrics();
  updateHubFilters();

  const countEl = document.getElementById('hub-accts-count');
  if (countEl) countEl.textContent = state.accounts.length ? String(state.accounts.length) : '';

  const container = document.getElementById('hub-dashboard');
  if (!container) return;
  container.innerHTML = '';

  const accounts = filteredHubAccounts();
  if (!accounts.length) {
    const empty = document.createElement('div');
    empty.className = 'hub-empty';
    empty.textContent = state.accounts.length
      ? 'Ничего не найдено по текущему фильтру'
      : 'Пока нет аккаунтов — добавьте WhatsApp или Telegram';
    container.appendChild(empty);
  }

  const buildHubAccountCard = (account, { isPinned } = {}) => {
    const card = document.createElement('div');
    card.className = 'hub-acct-card' + (isPinned ? ' hub-acct-card--pinned' : '');
    card.style.setProperty('--card-c', account.color || 'var(--accent-blue)');
    card.addEventListener('click', () => setActiveAccount(account.id));

    const bar = document.createElement('span');
    bar.className = 'hub-acct-bar';

    const avWrap = document.createElement('div');
    avWrap.className = 'hub-acct-av';
    avWrap.style.background = account.color || 'var(--bg-3)';
    const labelText = (account.name || '').split(' ')[0].slice(0, 2).toUpperCase() || (account.type === 'telegram' ? 'TG' : 'WA');
    avWrap.textContent = labelText;
    if (account.frozen) {
      const status = document.createElement('span');
      status.className = 'hub-acct-status frozen';
      avWrap.appendChild(status);
    }

    const info = document.createElement('div');
    info.className = 'hub-acct-info';

    const row1 = document.createElement('div');
    row1.className = 'hub-acct-row1';
    const nameEl = document.createElement('span');
    nameEl.className = 'hub-acct-name';
    nameEl.textContent = account.name;
    row1.appendChild(nameEl);
    const unread = Number(state.unreadByAccount.get(account.id) || 0);
    if (unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'hub-acct-badge';
      badge.textContent = unread > 99 ? '99+' : String(unread);
      row1.appendChild(badge);
    }

    const preview = document.createElement('div');
    preview.className = 'hub-acct-preview';
    preview.textContent = account.frozen ? '❄ заморожен' : '';

    const row3 = document.createElement('div');
    row3.className = 'hub-acct-row3';
    const typeTag = document.createElement('span');
    typeTag.className = 'hub-acct-tag hub-acct-tag-' + (account.type === 'telegram' ? 'blue' : 'accent');
    typeTag.textContent = account.type === 'telegram' ? 'Telegram' : 'WhatsApp';
    row3.appendChild(typeTag);
    if (account.frozen) {
      const t = document.createElement('span');
      t.className = 'hub-acct-tag hub-acct-tag-warn';
      t.textContent = 'Заморожен';
      row3.appendChild(t);
    }

    if (isPinned) {
      const star = document.createElement('span');
      star.className = 'hub-acct-pin-star';
      star.textContent = '★';
      star.title = 'Закреплён';
      card.appendChild(star);
    }

    info.append(row1, preview, row3);
    card.append(bar, avWrap, info);
    return card;
  };

  const pinnedAccounts = accounts.filter((a) => a.pinned);
  const pinnedIds = new Set(pinnedAccounts.map((a) => a.id));
  const restAccounts = accounts.filter((a) => !pinnedIds.has(a.id));

  if (pinnedAccounts.length) {
    const pinnedRow = document.createElement('div');
    pinnedRow.className = 'hub-pinned-row';
    for (const account of pinnedAccounts) {
      pinnedRow.appendChild(buildHubAccountCard(account, { isPinned: true }));
    }
    container.appendChild(pinnedRow);
  }

  for (const account of restAccounts) {
    container.appendChild(buildHubAccountCard(account, { isPinned: false }));
  }

  // Кнопки — отрисовываем в отдельный ряд под сеткой аккаунтов, чтобы
  // они не попадали в тот же grid и не растягивали последнюю карточку.
  const actionsHost = document.getElementById('hub-actions-row') || container;
  actionsHost.innerHTML = '';
  const actions = document.createElement('div');
  actions.className = 'hub-actions';

  const addWaBtn = document.createElement('button');
  addWaBtn.className = 'btn hub-action-btn hub-action-wa hub-action-primary';
  addWaBtn.type = 'button';
  addWaBtn.title = 'Добавить WhatsApp-аккаунт';
  addWaBtn.setAttribute('aria-label', 'Добавить WhatsApp-аккаунт');
  addWaBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Добавить WhatsApp';
  addWaBtn.addEventListener('click', () => addAccount('whatsapp'));

  const addTgBtn = document.createElement('button');
  addTgBtn.className = 'btn btn-ghost hub-action-btn hub-action-tg';
  addTgBtn.type = 'button';
  addTgBtn.title = 'Добавить Telegram-аккаунт';
  addTgBtn.setAttribute('aria-label', 'Добавить Telegram-аккаунт');
  addTgBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Добавить Telegram';
  addTgBtn.addEventListener('click', () => addAccount('telegram'));

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'btn btn-ghost hub-action-btn hub-action-settings';
  settingsBtn.title = 'Настройки';
  settingsBtn.setAttribute('aria-label', 'Настройки');
  settingsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  settingsBtn.addEventListener('click', () => { if (state.panelHidden) openSettingsPanel(); else closeSettingsPanel(); });

  actions.append(addWaBtn, addTgBtn, settingsBtn);
  actionsHost.appendChild(actions);
}

function cleanupWebview(webview) {
  if (!webview) return;
  // Remove ALL stored event listeners to prevent memory leaks
  if (webview._wadeckListeners) {
    const L = webview._wadeckListeners;
    if (L.onDomReady) webview.removeEventListener('dom-ready', L.onDomReady);
    if (L.onNavigateInPage) webview.removeEventListener('did-navigate-in-page', L.onNavigateInPage);
    if (L.onStartLoading) webview.removeEventListener('did-start-loading', L.onStartLoading);
    if (L.onFinishLoad) webview.removeEventListener('did-finish-load', L.onFinishLoad);
    if (L.onFailLoad) webview.removeEventListener('did-fail-load', L.onFailLoad);
    if (L.onPageTitle) webview.removeEventListener('page-title-updated', L.onPageTitle);
    if (L.onConsoleMessage) webview.removeEventListener('console-message', L.onConsoleMessage);
    webview._wadeckListeners = null;
  }
  if (webview.parentNode) {
    webview.parentNode.removeChild(webview);
  }
}

function ensureWebview(account) {
  if (account?.frozen) return;
  if (state.webviews.has(account.id)) return;

  const isWhatsApp = account.type !== 'telegram';

  const webview = document.createElement('webview');
  webview.partition = account.partition;
  webview.src = account.url;
  // Custom user-agent only for WhatsApp
  if (isWhatsApp && state.runtime?.waUserAgent) {
    webview.setAttribute('useragent', state.runtime.waUserAgent);
  }
  webview.setAttribute('allowpopups', 'false');
  // backgroundThrottling=false is the third layer of our keep-alive fix.
  // See comments at the top of main.js — without this, hidden webviews
  // (display:none in styles.css) get their timers throttled to 1/min after
  // ~5 minutes, which kills the WhatsApp Web WebSocket heartbeat.
  webview.setAttribute('webpreferences', 'contextIsolation=yes,backgroundThrottling=no');
  webview.dataset.waReady = '0';
  webview.dataset.accountType = account.type || 'whatsapp';

  const accountId = account.id;
  const currentAccount = () => accountById(accountId) || account;

  const onStartLoading = () => {
    // After initial dom-ready, don't reset status for SPA reloads (Telegram does many internal navigations)
    if (_domReadyFired) return;
    webview.dataset.waReady = '0';
    updateAccountCardStatus(accountId);
    if (accountId === state.activeAccountId) {
      setStatus(`${currentAccount().name}: загрузка...`);
    }
  };

  const onFinishLoad = () => {
    webview.dataset.waReady = '1';
    updateAccountCardStatus(accountId);
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
    // Re-inject translator bar after full page reload. Full reload creates a fresh
    // JS context, so the __waDeckTranslatorBound guard is already undefined and the
    // IIFE will init normally. Do NOT reset the flag — doing so would run a second
    // IIFE on top of an already-alive one (when WhatsApp does an internal reload
    // that preserves context), duplicating the bar.
    if (isWhatsApp && isTranslatorEnabled() && typeof translatorBarScript === 'function') {
      webview.executeJavaScript(translatorBarScript(), true)
        .catch((e) => console.warn('[translator-reload]', e));
    }
  };

  const onFailLoad = () => {
    webview.dataset.waReady = '0';
    updateAccountCardStatus(accountId);
    if (accountId === state.activeAccountId) {
      showWebviewLoading(false);
      if (state.startupHubVisible) {
        state.startupHubVisible = false;
      }
      refreshWebviewVisibility();
    }
  };

  const onPageTitle = (event) => {
    const title = String(event?.title || '');
    const count = WaDeckUnreadModule.parseUnreadFromTitle(title);
    WaDeckUnreadModule.setUnreadCount(accountId, count);
  };

  webview.addEventListener('did-start-loading', onStartLoading);
  webview.addEventListener('did-finish-load', onFinishLoad);
  webview.addEventListener('did-fail-load', onFailLoad);
  webview.addEventListener('page-title-updated', onPageTitle);

  let _bindDomTimer = null;
  let _domReadyFired = false;

  const onDomReady = () => {
    webview.dataset.waReady = '1';
    _domReadyFired = true;

    // Keep-alive visibility spoof — runs for BOTH WhatsApp and Telegram so
    // neither app voluntarily pauses its WebSocket while hidden behind
    // another active account. Must run before any other inject.
    if (typeof keepAliveScript === 'function') {
      webview.executeJavaScript(keepAliveScript(), true)
        .catch((e) => console.warn('[keep-alive]', e));
    }

    // WhatsApp-specific script injection
    if (isWhatsApp) {
      if (typeof webview.setUserAgent === 'function' && state.runtime?.waUserAgent) {
        webview.setUserAgent(state.runtime.waUserAgent);
      }

      webview
        .executeJavaScript(bridgeScript(), true)
        .catch((e) => console.warn('[bridge]', e));

      if (isCrmHoverEnabled() && typeof crmHoverBridgeScript === 'function') {
        webview.executeJavaScript(crmHoverBridgeScript(), true).catch((e) => console.warn('[crm-hover]', e));
      }
      if (isTranslatorEnabled() && typeof translatorBarScript === 'function') {
        webview.executeJavaScript(translatorBarScript(), true).catch((e) => console.warn('[translator]', e));
      }
    }

    // Debounced status update on initial load (no full sidebar rebuild)
    if (_bindDomTimer) clearTimeout(_bindDomTimer);
    _bindDomTimer = setTimeout(() => {
      _bindDomTimer = null;
      updateAccountCardStatus(accountId);
      updateHubDashboard();
    }, 300);
  };

  const onNavigateInPage = () => {
    if (!_domReadyFired) return;

    webview.dataset.waReady = '1';

    // Only WhatsApp needs script re-injection after SPA navigation
    if (!isWhatsApp) {
      updateAccountCardStatus(accountId);
      return;
    }

    webview
      .executeJavaScript(bridgeScript(), true)
      .catch((e) => console.warn('[bridge]', e));

    if (isCrmHoverEnabled() && typeof crmHoverBridgeScript === 'function') {
      webview.executeJavaScript(crmHoverBridgeScript(), true).catch((e) => console.warn('[crm-hover]', e));
    }
    if (isTranslatorEnabled() && typeof translatorBarScript === 'function') {
      webview.executeJavaScript(translatorBarScript(), true).catch((e) => console.warn('[translator]', e));
    }

    // Debounced status update — prevents excessive re-renders on SPA navigation
    if (_bindDomTimer) clearTimeout(_bindDomTimer);
    _bindDomTimer = setTimeout(() => {
      _bindDomTimer = null;
      updateAccountCardStatus(accountId);
      updateHubDashboard();
    }, 800);
  };

  let onConsoleMessage = null;
  if (isWhatsApp) {
    onConsoleMessage = (event) => {
      const message = String(event?.message || '');
      if (message.startsWith('__WADECK_CRM_HOVER__')) {
        try {
          const payload = JSON.parse(message.slice('__WADECK_CRM_HOVER__'.length));
          handleCrmHover(account, webview, payload);
        } catch { /* ignore parse errors */ }
        return;
      }
      if (message.startsWith('__WADECK_TRANSLATE_MSG__')) {
        try {
          const payload = JSON.parse(message.slice('__WADECK_TRANSLATE_MSG__'.length));
          const reqId = String(payload.reqId || '').replace(/[^a-zA-Z0-9_]/g, '');
          if (!reqId) return;
          const cbName = '__waDeckTrCb_' + reqId;
          const finish = (result) => {
            const ok = Boolean(result?.ok && result.translated);
            const translated = ok ? String(result.translated) : '';
            const escaped = translated
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '');
            const script = ok
              ? `if (window.${cbName}) window.${cbName}({ ok: true, translated: '${escaped}' });`
              : `if (window.${cbName}) window.${cbName}({ ok: false });`;
            webview.executeJavaScript(script, true).catch(() => {});
          };
          window.waDeck.translateText({
            text: String(payload.text || ''),
            from: String(payload.from || 'auto'),
            to: String(payload.to || 'ru'),
          }).then(finish).catch(() => finish({ ok: false }));
        } catch { /* ignore parse errors */ }
        return;
      }
      if (message.startsWith('__WADECK_TRANSLATE__')) {
        try {
          const payload = JSON.parse(message.slice('__WADECK_TRANSLATE__'.length));
          window.waDeck.translateText(payload).then((result) => {
            if (result?.ok && result.translated) {
              const escaped = result.translated
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\n/g, '\\n');
              webview.executeJavaScript(
                `window.__waDeckInsertTranslation('${escaped}');`,
                true
              ).catch(() => {});
            }
          }).catch(() => {});
        } catch { /* ignore parse errors */ }
        return;
      }
    };
    webview.addEventListener('console-message', onConsoleMessage);
  }

  // Store ALL listener references for cleanup
  webview._wadeckListeners = {
    onDomReady, onNavigateInPage, onStartLoading,
    onFinishLoad, onFailLoad, onPageTitle, onConsoleMessage,
  };
  webview.addEventListener('dom-ready', onDomReady);
  webview.addEventListener('did-navigate-in-page', onNavigateInPage);

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

/**
 * Idle webview sweeper — destroys WhatsApp/Telegram webviews that haven't been
 * visited for WEBVIEW_IDLE_MS. This is the core memory-saver for power-users
 * with 20+ accounts: instead of keeping every WebContents alive forever (each
 * ~80-150 MB RAM), we keep only the recently active ones. A destroyed webview
 * is transparently recreated on the next setActiveAccount() / ensureWebview()
 * call, restored from its session partition cache (login persists).
 */
const WEBVIEW_IDLE_MS = 15 * 60 * 1000;  // 15 min
function startIdleWebviewSweeper() {
  if (state._idleWebviewTimer) clearInterval(state._idleWebviewTimer);
  state._idleWebviewTimer = setInterval(() => {
    const now = Date.now();
    for (const [accountId, webview] of Array.from(state.webviews.entries())) {
      // Never suspend the currently active account
      if (accountId === state.activeAccountId) {
        if (webview) webview._lastActive = now;
        continue;
      }
      const lastActive = Number(webview?._lastActive || 0);
      if (!lastActive) {
        // Initialize on first sweep so freshly created webviews get one full
        // cycle before being considered for suspension.
        if (webview) webview._lastActive = now;
        continue;
      }
      if (now - lastActive > WEBVIEW_IDLE_MS) {
        try {
          cleanupWebview(webview);
          state.webviews.delete(accountId);
          WaDeckUnreadModule.setUnreadCount(accountId, 0);
        } catch (err) {
          console.warn('[idle-sweeper]', err?.message || err);
        }
      }
    }
  }, 60 * 1000); // check every minute
}

function refreshWebviewVisibility() {
  const showHub = state.startupHubVisible || !state.activeAccountId || !selectedWebview();
  setHubVisibility(showHub);
  let activeLoading = false;
  for (const [accountId, webview] of state.webviews.entries()) {
    if (accountId === state.activeAccountId) {
      webview.classList.add('active');
      try {
        if (webview.dataset.waReady !== '1' && typeof webview.isLoading === 'function' && webview.isLoading()) {
          activeLoading = true;
        }
      } catch { /* webview not yet attached to DOM — ignore */ }
    } else {
      webview.classList.remove('active');
    }
  }
  showWebviewLoading(!showHub && activeLoading);
  refreshTweaksFabVisibility();
}

/**
 * Tweaks FAB lives bottom-right. It should only appear when the user is on the
 * Hub screen or has the Settings panel open — not while viewing a WhatsApp chat,
 * where it would overlap message content.
 */
function refreshTweaksFabVisibility() {
  const fab = document.getElementById('tweaks-fab');
  const popover = document.getElementById('tweaks-panel');
  if (!fab) return;
  const hubVisible = state.startupHubVisible || !state.activeAccountId || !selectedWebview();
  const settingsVisible = !state.panelHidden;
  const shouldShow = hubVisible || settingsVisible;
  fab.classList.toggle('is-hidden', !shouldShow);
  // If we're hiding the FAB and popover is open, close it too
  if (!shouldShow && popover && !popover.classList.contains('hidden')) {
    toggleTweaksPopover(false);
  }
}

function openHubMode() {
  state.startupHubVisible = false;
  setActiveAccount('');
}

function handleEscapeUiReset() {
  // Close floating Tweaks popover first if open — it's the most shallow UI
  const tweaksPanel = document.getElementById('tweaks-panel');
  if (tweaksPanel && !tweaksPanel.classList.contains('hidden')) {
    toggleTweaksPopover(false);
    return;
  }
  WaDeckWeatherModule.closeWeatherPopover();
  WaDeckScheduleModule.closeChatPicker();
  // If a settings section is open, Escape goes back to the menu first.
  // Only a second Escape closes the whole panel.
  if (!state.panelHidden && state._openSettingsSection) {
    showSettingsMenu();
  } else {
    closeSettingsPanel();
  }
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
  // Lazy-create the webview on first activation and bump its last-active
  // timestamp so the idle sweeper knows to keep it alive.
  if (nextId) {
    const account = state.accounts.find((a) => a.id === nextId);
    if (account && !account.frozen) {
      if (!state.webviews.has(nextId)) {
        try { ensureWebview(account); }
        catch (err) { console.error('[setActiveAccount] ensureWebview failed:', err); }
      }
      const wv = state.webviews.get(nextId);
      if (wv) wv._lastActive = Date.now();
    }
  }
  if (nextId && state.startupHubVisible) {
    const webview = state.webviews.get(nextId);
    // webview.isLoading() throws on a freshly-created webview until dom-ready
    // has fired. Treat "not-yet-ready" as "still loading" and only trust a
    // clean false (finished loading) to hide the startup hub.
    let stillLoading = true;
    if (webview && webview.dataset?.waReady === '1') {
      try {
        stillLoading = typeof webview.isLoading === 'function' && webview.isLoading();
      } catch { /* not attached yet — treat as loading */ }
    }
    if (!stillLoading) {
      state.startupHubVisible = false;
    }
  }
  updateAccountActiveHighlight();
  updateActiveAccountDisplay();
  updateFreezeButtonState();
  updateToolbarState();
  syncZoomSlider();
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

function isTranslatorEnabled() {
  return state.settings?.translatorEnabled !== false;
}
function isCrmHoverEnabled() {
  return state.settings?.crmHoverEnabled !== false;
}

function applySettingsToForm(options = {}) {
  const { renderWeather = false } = options;
  state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
  state.settings.weatherCity = WaDeckWeatherModule.normalizeWeatherCity(state.settings.weatherCity);
  state.settings.weatherUnit = WaDeckWeatherModule.normalizeWeatherUnit(state.settings.weatherUnit);
  applyTheme(state.settings.uiTheme);
  if (els.weatherCityInput) {
    els.weatherCityInput.value = state.settings.weatherCity;
  }
  if (els.settingTranslatorEnabled) {
    els.settingTranslatorEnabled.checked = isTranslatorEnabled();
  }
  if (els.settingCrmHoverEnabled) {
    els.settingCrmHoverEnabled.checked = isCrmHoverEnabled();
  }
  // Only render the weather summary when explicitly requested (init / weather
  // settings save). Rendering it with `loading: false` after every
  // save-settings call blanks the temperature until the next 30-min refresh,
  // which looked like "weather reset" when the user just toggled translator.
  if (renderWeather) {
    WaDeckWeatherModule.renderWeatherSummary({
      city: state.settings.weatherCity,
      unit: state.settings.weatherUnit,
      loading: false,
    });
  }
  renderClocksSettings();
  // Keep menu subtitles + about block in sync with current settings
  if (typeof refreshSettingsMenuSubtitles === 'function') {
    refreshSettingsMenuSubtitles();
  }
  // Apply Tweaks (scene/density) to <html> so CSS can react
  applyScene(state.settings.uiScene);
  applyDensity(state.settings.uiDensity);
  refreshTweakPills();
}

/**
 * Apply translator enable/disable to every live webview.
 * When disabled: set window.__waDeckTranslatorDisabled=true — the bar's own
 * tick loop will tear down the bar and overlays on its next tick.
 * When enabled: clear the flag and reinject so the bar comes back immediately.
 */
function applyTranslatorToggleToAllWebviews(enabled) {
  if (!state.webviews) return;
  state.webviews.forEach((wv, accountId) => {
    const account = state.accounts?.find((a) => a.id === accountId);
    const isWa = !account || account.type !== 'telegram';
    if (!isWa || !wv || !wv.isConnected) return;
    try {
      if (enabled) {
        wv.executeJavaScript(
          '(() => { try { window.__waDeckTranslatorDisabled = false; } catch {} return true; })()',
          true,
        ).catch(() => {});
        if (typeof translatorBarScript === 'function') {
          wv.executeJavaScript(translatorBarScript(), true).catch(() => {});
        }
      } else {
        wv.executeJavaScript(
          `(() => {
            try { window.__waDeckTranslatorDisabled = true; } catch {}
            try {
              const bar = document.getElementById('__wadeck-translator-bar');
              if (bar) bar.remove();
              document.querySelectorAll('.__wadeck-tr-overlay').forEach((o) => o.remove());
            } catch {}
            return true;
          })()`,
          true,
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('[translator-toggle]', e);
    }
  });
}

function applyCrmHoverToggle(enabled) {
  if (!enabled) {
    try { hideCrmHoverPopover(); } catch {}
  }
}

function updatePanelVisibility() {
  els.panel.classList.toggle('hidden', state.panelHidden);
  els.appRoot.classList.toggle('panel-hidden', state.panelHidden);
}

function openSettingsPanel() {
  state.panelHidden = false;
  updatePanelVisibility();
  // Highlight the toolbar gear so it's clear the panel is open
  els.togglePanel?.classList.add('is-active');
  // Always land on the top-level menu when opening fresh
  showSettingsMenu();
  refreshSettingsMenuSubtitles();
  refreshTweaksFabVisibility();
  if (!els.crmModal.classList.contains('hidden')) {
    setTimeout(() => {
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

function closeSettingsPanel() {
  state.panelHidden = true;
  updatePanelVisibility();
  els.togglePanel?.classList.remove('is-active');
  refreshTweaksFabVisibility();
  if (!els.crmModal.classList.contains('hidden')) {
    setTimeout(() => {
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }, 40);
  }
}

/* ── Floating Tweaks widget: toggle / outside-click close ─────── */

function toggleTweaksPopover(forceOpen) {
  const panel = document.getElementById('tweaks-panel');
  const fab = document.getElementById('tweaks-fab');
  if (!panel || !fab) return;
  const isHidden = panel.classList.contains('hidden');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isHidden;
  panel.classList.toggle('hidden', !shouldOpen);
  fab.classList.toggle('is-active', shouldOpen);
  // Make sure pills reflect current state every time we open
  if (shouldOpen && typeof refreshTweakPills === 'function') refreshTweakPills();
}

/* ── Settings panel: 2-level menu navigation ───────────────────── */

const SETTINGS_SECTION_TITLES = {
  interface: 'Интерфейс',
  templates: 'Общие шаблоны',
  schedule: 'Отложенные сообщения',
  clocks: 'Мировые часы',
  weather: 'Погода',
};

/* ── Tweaks (theme / scene / density pills) ─────────────────── */

const VALID_SCENES = ['night', 'day', 'rain', 'space', 'minimal'];
const VALID_DENSITY = ['compact', 'cozy', 'spacious'];

function applyScene(scene) {
  const s = VALID_SCENES.includes(String(scene)) ? scene : 'night';
  document.documentElement.setAttribute('data-scene', s);
}
function applyDensity(density) {
  const d = VALID_DENSITY.includes(String(density)) ? density : 'compact';
  document.documentElement.setAttribute('data-density', d);
}

function refreshTweakPills() {
  const theme = normalizeTheme(state.settings?.uiTheme || 'dark');
  const scene = VALID_SCENES.includes(state.settings?.uiScene) ? state.settings.uiScene : 'night';

  document.querySelectorAll('.tweak-pill[data-theme]').forEach((el) => {
    el.classList.toggle('is-active', el.getAttribute('data-theme') === theme);
  });
  document.querySelectorAll('.tweak-pill[data-scene]').forEach((el) => {
    el.classList.toggle('is-active', el.getAttribute('data-scene') === scene);
  });
}

function showSettingsMenu() {
  if (!els.settingsViewMenu || !els.settingsViewDetail) return;
  els.settingsViewDetail.classList.add('hidden');
  els.settingsViewMenu.classList.remove('hidden');
  els.settingsViewMenu.setAttribute('data-dir', 'back');
  // Force animation replay
  els.settingsViewMenu.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  els.settingsViewMenu.offsetHeight;
  els.settingsViewMenu.style.animation = '';
  els.settingsViewMenu.querySelectorAll('.settings-section').forEach((s) => s.classList.remove('active'));
  if (els.settingsBack) els.settingsBack.classList.add('hidden');
  if (els.panelTitleText) els.panelTitleText.textContent = 'Настройки';
  state._openSettingsSection = null;
}

function showSettingsSection(key) {
  if (!els.settingsViewMenu || !els.settingsViewDetail) return;
  const section = els.settingsViewDetail.querySelector(`.settings-section[data-settings-section="${CSS.escape(key)}"]`);
  if (!section) return;
  els.settingsViewDetail.querySelectorAll('.settings-section').forEach((s) => s.classList.remove('active'));
  section.classList.add('active');
  els.settingsViewMenu.classList.add('hidden');
  els.settingsViewDetail.classList.remove('hidden');
  els.settingsViewDetail.removeAttribute('data-dir');
  // Force animation replay
  els.settingsViewDetail.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  els.settingsViewDetail.offsetHeight;
  els.settingsViewDetail.style.animation = '';
  if (els.settingsBack) els.settingsBack.classList.remove('hidden');
  if (els.panelTitleText) els.panelTitleText.textContent = SETTINGS_SECTION_TITLES[key] || 'Настройки';
  state._openSettingsSection = key;

  // Weather screen: mirror current values into the settings form
  if (key === 'weather') {
    if (els.wsettingsCity) els.wsettingsCity.value = String(state.settings?.weatherCity || '');
    if (els.wsettingsUnit) {
      const unit = WaDeckWeatherModule.normalizeWeatherUnit(state.settings?.weatherUnit || 'celsius');
      els.wsettingsUnit.value = unit;
    }
  }
}

function renderTemplatesLibrary() {
  const listEl = document.getElementById('tmpl-lib-list');
  const countEl = document.getElementById('tmpl-lib-count');
  if (!listEl) return;
  const templates = Array.isArray(state.templates) ? state.templates : [];

  if (countEl) {
    const n = templates.length;
    const plural = (x, forms) =>
      forms[x % 10 === 1 && x % 100 !== 11 ? 0 : (x % 10 >= 2 && x % 10 <= 4 && (x % 100 < 10 || x % 100 >= 20) ? 1 : 2)];
    countEl.textContent = n + ' ' + plural(n, ['шаблон', 'шаблона', 'шаблонов']);
  }

  listEl.innerHTML = '';
  if (!templates.length) {
    const empty = document.createElement('div');
    empty.className = 'tmpl-lib-empty';
    const title = document.createElement('div');
    title.className = 'tmpl-lib-empty-title';
    title.textContent = 'Пока нет шаблонов';
    const hint = document.createElement('div');
    hint.className = 'tmpl-lib-empty-hint';
    hint.textContent = 'Шаблоны доступны для всех WhatsApp-аккаунтов и всех чатов.';
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'tmpl-lib-empty-cta';
    cta.textContent = '+ Создать первый шаблон';
    cta.addEventListener('click', () => {
      const newBtn = document.getElementById('tmpl-lib-new');
      if (newBtn) newBtn.click();
    });
    empty.append(title, hint, cta);
    listEl.appendChild(empty);
    return;
  }

  // Group by category
  const groups = new Map();
  for (const tpl of templates) {
    const cat = String(tpl.category || '').trim() || 'Без категории';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(tpl);
  }
  const sortedCats = [...groups.keys()].sort((a, b) => {
    if (a === 'Без категории') return 1;
    if (b === 'Без категории') return -1;
    return a.localeCompare(b, 'ru');
  });

  // Build a single shared item renderer so we can reuse it both for
  // lazy-expand and search-mode (which needs all items upfront).
  function buildTemplateItemEl(tpl, n) {
    // `<div role="button">` instead of nested <button> so the in-card
    // delete control (also a button) doesn't become an invalid child.
    const item = document.createElement('div');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.className = 'tmpl-lib-item';
    const lang = (typeof detectTemplateLang === 'function')
      ? detectTemplateLang(tpl)
      : { code: '', color: 'oklch(0.60 0.05 250)' };
    item.style.setProperty('--tmpl-lang-color', lang.color);

    const num = document.createElement('div');
    num.className = 'tmpl-lib-num';
    num.textContent = String(n);

    const body = document.createElement('div');
    body.className = 'tmpl-lib-body';
    if (lang.code) {
      const langEl = document.createElement('span');
      langEl.className = 'tmpl-lib-lang';
      langEl.textContent = lang.code;
      body.appendChild(langEl);
    }
    const title = document.createElement('div');
    title.className = 'tmpl-lib-title';
    title.textContent = tpl.title || 'Без названия';
    body.appendChild(title);
    const preview = document.createElement('div');
    preview.className = 'tmpl-lib-preview';
    const txt = String(tpl.text || '');
    preview.textContent = txt.length > 100 ? txt.slice(0, 100) + '…' : txt;
    body.appendChild(preview);

    // Inline delete (× in top-right of the card). Fades in on hover so it
    // doesn't clutter the list in its resting state.
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'tmpl-lib-del';
    del.title = 'Удалить шаблон';
    del.setAttribute('aria-label', 'Удалить шаблон');
    del.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const accepted = await showConfirm(
        'Удаление шаблона',
        `Удалить «${tpl.title || 'Без названия'}»?`,
        'Удалить',
      );
      if (!accepted) return;
      const response = await window.waDeck.deleteTemplate(tpl.id);
      if (!response?.ok) {
        setStatus(`Шаблон: ${response?.error || 'ошибка удаления'}`);
        return;
      }
      // Mirror the templates-controller flow: update state + refresh palette.
      state.templates = Array.isArray(response.templates)
        ? response.templates.map((t) => ({ ...t }))
        : [];
      setStatus('Шаблон удалён');
      try { refreshSettingsMenuSubtitles(); } catch { /* ignore */ }
    });

    item.append(num, body, del);

    const openInEditor = () => {
      if (typeof window._showTemplateEditForm === 'function') window._showTemplateEditForm();
      if (els.templateSelect) {
        els.templateSelect.value = tpl.id || '';
        els.templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const card = document.getElementById('templates-settings-card');
      if (card && !card.open) card.open = true;
    };
    item.addEventListener('click', openInEditor);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openInEditor();
      }
    });
    return item;
  }

  // Lazy-hydrate a category section: items are only materialized the first
  // time the user expands the <details>. With hundreds of templates spread
  // across multiple categories this keeps the initial render near O(categories)
  // instead of O(templates).
  function hydrateSection(section, items) {
    if (section.dataset.hydrated === '1') return;
    section.dataset.hydrated = '1';
    const frag = document.createDocumentFragment();
    let n = 0;
    for (const tpl of items) {
      n += 1;
      frag.appendChild(buildTemplateItemEl(tpl, n));
    }
    section.appendChild(frag);
  }

  for (const cat of sortedCats) {
    const section = document.createElement('details');
    section.className = 'tmpl-lib-section';
    const items = groups.get(cat);
    items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'));

    const summary = document.createElement('summary');
    summary.className = 'tmpl-lib-section-label';
    const label = document.createElement('span');
    label.className = 'tmpl-lib-section-label-text';
    label.textContent = cat;
    const count = document.createElement('span');
    count.className = 'tmpl-lib-section-count';
    count.textContent = ` (${items.length})`;
    summary.append(label, count);
    section.appendChild(summary);

    // Render on first expand (toggle). Also supports programmatic hydration
    // below (search path / pre-expanded state).
    section.addEventListener('toggle', () => {
      if (section.open) hydrateSection(section, items);
    });

    listEl.appendChild(section);
  }
}

function refreshSettingsMenuSubtitles() {
  // Keep the templates library in sync with state.templates every time
  // subtitles refresh (after save/delete/new).
  try { renderTemplatesLibrary(); } catch { /* ignore */ }

  // Live subtitles under each menu item
  const subs = {
    templates: () => {
      const count = Array.isArray(state.templates) ? state.templates.length : 0;
      const cats = new Set((state.templates || []).map((t) => String(t?.category || '').trim()).filter(Boolean));
      const plural = (n, forms) => forms[n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
      const tplWord = plural(count, ['шаблон', 'шаблона', 'шаблонов']);
      const catWord = plural(cats.size, ['категория', 'категории', 'категорий']);
      if (!count) return 'нет шаблонов';
      return `${count} ${tplWord}${cats.size ? ` · ${cats.size} ${catWord}` : ''}`;
    },
    schedule: () => {
      return 'очередь · расписание';
    },
    clocks: () => {
      const count = Array.isArray(state.settings?.worldClocks) ? state.settings.worldClocks.length : 0;
      if (!count) return 'нет городов';
      const plural = (n, forms) => forms[n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
      return `${count} ${plural(count, ['город', 'города', 'городов'])} · авто-обновление`;
    },
    weather: () => {
      const city = String(state.settings?.weatherCity || '—');
      const unit = WaDeckWeatherModule.normalizeWeatherUnit(state.settings?.weatherUnit || 'celsius');
      return `${city} · ${unit === 'fahrenheit' ? '°F' : '°C'}`;
    },
    interface: () => {
      const t = isTranslatorEnabled() ? 'переводчик вкл' : 'переводчик выкл';
      const c = isCrmHoverEnabled() ? 'CRM hover вкл' : 'CRM hover выкл';
      return `${t} · ${c}`;
    },
    hotkeys: () => '⌘K · ⌘N · ⌘T · ⌘,',
    notifications: () => 'по аккаунтам',
  };

  document.querySelectorAll('[data-sub]').forEach((el) => {
    const key = el.getAttribute('data-sub');
    const fn = subs[key];
    if (!fn) return;
    try { el.textContent = fn(); } catch { /* ignore */ }
  });

  // "About" block: version / runtime info
  if (els.aboutAppVersion) {
    els.aboutAppVersion.textContent = String(state.runtime?.appVersion || '—');
  }
  if (els.aboutElectronVersion) {
    els.aboutElectronVersion.textContent = String(state.runtime?.electron || '—');
  }
  if (els.aboutChromiumVersion) {
    els.aboutChromiumVersion.textContent = String(state.runtime?.chrome || '—');
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

  // Freeze toggle — flips is-active + textual state
  if (els.accountMenuFreeze) {
    const frozen = Boolean(account.frozen);
    els.accountMenuFreeze.classList.toggle('is-active', frozen);
    const label = els.accountMenuFreeze.querySelector('.toggle-text');
    if (label) label.textContent = frozen ? 'Разморозить' : 'Заморозить';
    els.accountMenuFreeze.title = frozen
      ? 'Разморозить и возобновить загрузку WhatsApp'
      : 'Заморозить аккаунт (выгрузить webview)';
  }

  // Pin toggle — no limit; user can pin as many accounts as they want.
  if (els.accountMenuPin) {
    const pinned = Boolean(account.pinned);
    els.accountMenuPin.classList.toggle('is-active', pinned);
    els.accountMenuPin.disabled = false;
    const label = els.accountMenuPin.querySelector('.toggle-text');
    if (label) label.textContent = pinned ? 'Закреплено' : 'Закрепить';
    els.accountMenuPin.title = pinned
      ? 'Снять с главной полки хаба'
      : 'Закрепить на главной полке хаба';
  }

  // Show/hide reset icon button
  if (els.accountMenuResetIcon) {
    const hasIcon = Boolean(account.iconPath || account.iconUrl);
    els.accountMenuResetIcon.classList.toggle('hidden', !hasIcon);
  }

  // Color swatch
  const swatch = document.getElementById('account-menu-color-swatch');
  if (swatch) {
    swatch.style.background = account.color || '#0ea5e9';
  }
  state.accountMenuDraftColor = account.color || '';

  // Build color palette popover
  const colorPopover = document.getElementById('account-color-popover');
  if (colorPopover) {
    colorPopover.innerHTML = '';
    colorPopover.classList.add('hidden');
    const PALETTE = [
      // Greens
      '#22c55e', '#16a34a', '#15803d', '#059669', '#10b981',
      // Teals & Cyans
      '#14b8a6', '#0d9488', '#06b6d4', '#0891b2', '#22d3ee',
      // Blues
      '#0ea5e9', '#0284c7', '#3b82f6', '#2563eb', '#1d4ed8',
      // Indigos & Violets
      '#6366f1', '#4f46e5', '#7c3aed', '#8b5cf6', '#a78bfa',
      // Purples & Pinks
      '#a855f7', '#9333ea', '#d946ef', '#c026d3', '#e879f9',
      // Roses & Reds
      '#ec4899', '#db2777', '#e11d48', '#be123c', '#f43f5e',
      // Reds & Oranges
      '#ef4444', '#dc2626', '#b91c1c', '#f97316', '#ea580c',
      // Ambers & Yellows
      '#f59e0b', '#d97706', '#eab308', '#ca8a04', '#facc15',
      // Limes
      '#84cc16', '#65a30d', '#a3e635', '#4ade80', '#34d399',
      // Neutrals
      '#78716c', '#57534e', '#475569', '#334155', '#1e293b',
    ];
    for (const c of PALETTE) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'color-dot';
      dot.style.background = c;
      dot.title = c;
      if (c === (account.color || '').toLowerCase()) dot.classList.add('active');
      dot.addEventListener('click', () => {
        state.accountMenuDraftColor = c;
        if (swatch) swatch.style.background = c;
        if (els.accountMenuChip) els.accountMenuChip.style.background = c;
        for (const d of colorPopover.querySelectorAll('.color-dot')) d.classList.remove('active');
        dot.classList.add('active');
        colorPopover.classList.add('hidden');
      });
      colorPopover.appendChild(dot);
    }
  }

  // Hide freeze for Telegram
  if (els.accountMenuFreeze) {
    els.accountMenuFreeze.style.display = account.type === 'telegram' ? 'none' : '';
  }

  els.accountMenuModal.classList.remove('hidden');
  els.accountMenuModal.setAttribute('role', 'dialog');
  els.accountMenuModal.setAttribute('aria-modal', 'true');
  setTimeout(() => els.accountMenuName?.focus(), 50);
}

function closeAccountMenu() {
  state.accountMenuAccountId = '';
  state.accountMenuDraftIconPath = '';
  state.accountMenuDraftColor = '';
  const colorPop = document.getElementById('account-color-popover');
  if (colorPop) colorPop.classList.add('hidden');
  closeModalAnimated(els.accountMenuModal);
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

  // Save color if changed
  const draftColor = String(state.accountMenuDraftColor || '').trim();
  if (draftColor && draftColor !== String(account.color || '').trim()) {
    const colorResponse = await window.waDeck.setAccountColor({ accountId, color: draftColor });
    if (colorResponse?.ok && colorResponse.account) {
      patchLocalAccount(colorResponse.account);
      currentAccount = accountById(accountId) || currentAccount;
      changed = true;
    }
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
    els.accountMenuIcon.style.borderColor = '';
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

  // Immediate preview in the chip — doesn't persist until Save, but gives
  // the user visual confirmation that the pick worked.
  if (els.accountMenuChip && picked.url) {
    els.accountMenuChip.innerHTML = '';
    const img = document.createElement('img');
    img.src = picked.url;
    img.alt = account.name;
    els.accountMenuChip.appendChild(img);
  }
  if (els.accountMenuResetIcon) {
    els.accountMenuResetIcon.classList.remove('hidden');
  }
  if (els.accountMenuIcon) {
    els.accountMenuIcon.style.borderColor = '#3dd68c';
  }
  setStatus(`Иконка выбрана: ${account.name}. Нажмите «Сохранить»`);
}

async function resetAccountIconFromMenu() {
  const accountId = String(state.accountMenuAccountId || '');
  const account = accountById(accountId);
  if (!account) return;

  const iconResponse = await window.waDeck.setAccountIcon({ accountId, iconPath: '' });
  if (!iconResponse?.ok || !iconResponse.account) {
    setStatus(`Не удалось сбросить иконку: ${iconResponse?.error || 'error'}`);
    return;
  }
  patchLocalAccount(iconResponse.account);
  state.accountMenuDraftIconPath = '';
  renderAccounts();
  setStatus(`Иконка сброшена: ${account.name}`);
  // Re-open to reflect changes
  openAccountMenu(accountId);
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
    cleanupWebview(state.webviews.get(accountId));
    state.webviews.delete(accountId);
    if (state.chatPickerCache && state.chatPickerCache.accountId === accountId) {
      state.chatPickerCache = null;
    }
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

async function setAccountPinnedState(accountId, nextPinned, options = {}) {
  const account = accountById(accountId);
  if (!account) return { ok: false };

  const response = await window.waDeck.setAccountPinned({ accountId, pinned: nextPinned });
  if (!response?.ok || !response.account) {
    setStatus(`Не удалось изменить пин: ${response?.error || 'error'}`);
    return { ok: false, response };
  }

  patchLocalAccount(response.account);
  renderAccounts();
  updateHubDashboard();
  setStatus(
    response.account.pinned
      ? `${response.account.name} закреплён в хабе`
      : `${response.account.name} откреплён`,
  );
  if (options.reopenMenu) {
    openAccountMenu(accountId);
  }
  return { ok: true, account: response.account };
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
    weatherCity: WaDeckWeatherModule.normalizeWeatherCity(state.settings?.weatherCity),
    weatherUnit: WaDeckWeatherModule.normalizeWeatherUnit(state.settings?.weatherUnit),
    lastSeenReleaseNotesVersion: String(state.settings?.lastSeenReleaseNotesVersion || '').trim(),
    worldClocks: state.settings?.worldClocks || [],
    translatorEnabled: state.settings?.translatorEnabled !== false,
    crmHoverEnabled: state.settings?.crmHoverEnabled !== false,
    uiScene: VALID_SCENES.includes(state.settings?.uiScene) ? state.settings.uiScene : 'night',
    uiDensity: VALID_DENSITY.includes(state.settings?.uiDensity) ? state.settings.uiDensity : 'compact',
    tweaksCollapsed: !!state.settings?.tweaksCollapsed,
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
      els.saveSettings?.classList.add('is-saved');
      setTimeout(() => els.saveSettings?.classList.remove('is-saved'), 2000);
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

async function addAccount(type) {
  try {
    const created = await window.waDeck.addAccount(type || 'whatsapp');
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

  cleanupWebview(state.webviews.get(accountId));
  state.webviews.delete(accountId);
  if (state.chatPickerCache && state.chatPickerCache.accountId === accountId) {
    state.chatPickerCache = null;
  }
  state.unreadByAccount.delete(accountId);
  WaDeckUnreadModule.scheduleDockBadgeSync();

  state.accounts = state.accounts.filter((row) => row.id !== accountId);
  if (state.scheduleTarget.accountId === accountId) {
    state.scheduleTarget = { accountId: '', accountName: '', chatName: '' };
    WaDeckScheduleModule.renderScheduleTarget();
  }

  // After deletion, always return to the Hub screen instead of jumping to a
  // neighbouring account — that jump was disorienting (users land on an
  // unrelated workspace). Empty activeAccountId triggers the hub in
  // refreshWebviewVisibility() via the !state.activeAccountId branch.
  setActiveAccount('');
  await WaDeckScheduleModule.renderScheduled();
  // Always re-render the sidebar and hub after a removal so the deleted
  // account's badge disappears immediately, regardless of whether a next
  // active account was assigned. Previously this happened only in the
  // "no accounts left" branch, causing the ghost-icon bug.
  renderAccounts();
  updateHubDashboard().catch(console.error);
  setStatus('Аккаунт удалён');
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

function refreshAllWebviews() {
  let count = 0;
  for (const account of state.accounts) {
    if (account.frozen) continue;
    const wv = state.webviews.get(account.id);
    if (wv) { wv.reload(); count++; }
  }
  els.refreshActive?.classList.add('is-spinning');
  setTimeout(() => els.refreshActive?.classList.remove('is-spinning'), 680);
  setStatus(`Обновлено аккаунтов: ${count}`);
}

function showRefreshContextMenu(event) {
  closeAccountContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'account-context-menu';

  const items = [
    { label: 'Обновить текущий', action: () => refreshActiveWebview() },
    { label: 'Обновить все', action: () => refreshAllWebviews() },
  ];

  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'context-menu-item';
    el.textContent = item.label;
    el.addEventListener('click', () => {
      closeAccountContextMenu();
      item.action();
    });
    menu.appendChild(el);
  }

  document.body.appendChild(menu);
  let x = event.clientX;
  let y = event.clientY;
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  menu.style.left = Math.max(0, x) + 'px';
  menu.style.top = Math.max(0, y) + 'px';

  const closeOnClick = (e) => { if (!menu.contains(e.target)) closeAccountContextMenu(); };
  const closeOnEsc = (e) => { if (e.key === 'Escape') closeAccountContextMenu(); };
  document.addEventListener('click', closeOnClick, { capture: true });
  document.addEventListener('keydown', closeOnEsc);
  menu._cleanup = () => {
    document.removeEventListener('click', closeOnClick, { capture: true });
    document.removeEventListener('keydown', closeOnEsc);
  };
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

async function sendAudioAsVoiceMessage() {
  const account = activeAccount();
  if (!account) {
    showToast('Нет активного аккаунта', 'warn');
    return;
  }
  if (account.type === 'telegram') {
    showToast('Голосовые сообщения доступны только для WhatsApp', 'warn');
    return;
  }
  if (account.frozen) {
    showToast('Аккаунт заморожен', 'warn');
    return;
  }
  const webview = selectedWebview();
  if (!webview || !isWebviewReady(webview)) {
    showToast('WhatsApp ещё не загружен', 'warn');
    return;
  }

  /* Pick audio file */
  let picked;
  try {
    picked = await window.waDeck.pickAudioFile();
  } catch (err) {
    console.error('[voice-msg] pick failed', err);
    showToast('Не удалось открыть диалог выбора файла', 'error');
    return;
  }
  if (!picked || picked.canceled) return;
  if (!picked.ok) {
    const errMap = {
      file_too_large: 'Файл слишком большой (макс. 16 МБ)',
      read_failed: 'Не удалось прочитать файл',
    };
    showToast(errMap[picked.error] || 'Ошибка загрузки файла', 'error');
    return;
  }

  /* Show recording state */
  if (els.sendVoiceMsg) {
    els.sendVoiceMsg.classList.add('is-recording');
    els.sendVoiceMsg.disabled = true;
  }

  const _delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const errMessages = {
    ptt_button_not_found: 'Кнопка записи не найдена. Откройте чат в WhatsApp.',
    getUserMedia_not_called: 'WhatsApp не запросил микрофон. Попробуйте снова.',
    audio_decode_failed: 'Не удалось декодировать аудиофайл.',
    audio_too_short: 'Аудиофайл слишком короткий (менее 0.3 сек).',
    no_voice_state: 'Внутренняя ошибка состояния.',
  };

  try {
    /* ── Phase 1: Setup — decode audio, override getUserMedia, find PTT button ── */
    const setup = await webview.executeJavaScript(
      voiceMessageSetupScript(picked.dataBase64, picked.mime),
      true
    );
    if (!setup?.ok) {
      const key = setup?.error || 'unknown';
      showToast(errMessages[key] || `Ошибка: ${key}`, 'error', 5000);
      return;
    }

    /* ── Phase 2: Trusted mouseDown via sendInputEvent (isTrusted: true) ── */
    webview.sendInputEvent({ type: 'mouseDown', x: setup.x, y: setup.y, button: 'left', clickCount: 1 });
    await _delay(80);

    /* ── Phase 3: Wait for getUserMedia + audio duration ── */
    const waitResult = await webview.executeJavaScript(voiceMessageWaitScript(), true);

    if (!waitResult?.ok) {
      /* getUserMedia not called — release and cleanup */
      webview.sendInputEvent({ type: 'mouseUp', x: setup.x, y: setup.y, button: 'left' });
      await webview.executeJavaScript(voiceMessageCleanupScript(), true).catch(() => {});
      const key = waitResult?.error || 'unknown';
      showToast(errMessages[key] || `Ошибка: ${key}`, 'error', 5000);
      return;
    }

    /* ── Phase 4: Trusted mouseUp — WhatsApp finalizes & sends the voice message ── */
    webview.sendInputEvent({ type: 'mouseUp', x: setup.x, y: setup.y, button: 'left' });
    await _delay(600);

    /* ── Phase 5: Cleanup ── */
    await webview.executeJavaScript(voiceMessageCleanupScript(), true).catch(() => {});

    const dur = waitResult.duration ? ` (${Math.round(waitResult.duration)}с)` : '';
    showToast(`Голосовое сообщение отправлено${dur}`, 'success');
  } catch (error) {
    console.error('[voice-msg]', error);
    /* Emergency cleanup */
    webview.executeJavaScript(voiceMessageCleanupScript(), true).catch(() => {});
    showToast('Ошибка отправки голосового сообщения', 'error', 5000);
  } finally {
    if (els.sendVoiceMsg) {
      els.sendVoiceMsg.classList.remove('is-recording');
      els.sendVoiceMsg.disabled = false;
    }
  }
}

function bindActions() {
  // ── Add-account popover (WhatsApp / Telegram choice) ──
  const addPopover = document.getElementById('add-account-popover');
  els.addAccount.addEventListener('click', (e) => {
    e.stopPropagation();
    if (addPopover) addPopover.classList.toggle('hidden');
  });
  if (addPopover) {
    for (const btn of addPopover.querySelectorAll('.add-account-option')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.type || 'whatsapp';
        addPopover.classList.add('hidden');
        runWithBusyButton(els.addAccount, () => addAccount(type), { text: '…', title: 'Добавление аккаунта' }).catch(console.error);
      });
    }
    document.addEventListener('click', (e) => {
      if (!addPopover.contains(e.target) && e.target !== els.addAccount) {
        addPopover.classList.add('hidden');
      }
    });
  }
  els.accountsScrollUp?.addEventListener('click', () => scrollAccountsList('up'));
  els.accountsScrollDown?.addEventListener('click', () => scrollAccountsList('down'));
  els.accountsList?.addEventListener('scroll', updateSidebarScrollControls, { passive: true });
  els.refreshActive?.addEventListener('click', refreshActiveWebview);
  els.refreshActive?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showRefreshContextMenu(e);
  });
  els.freezeActive?.addEventListener('click', () => toggleActiveFreeze().catch(console.error));
  els.openCrmModal?.addEventListener('click', () => WaDeckCrmModule.openCrmModal().catch(console.error));
  els.sendVoiceMsg?.addEventListener('click', () => sendAudioAsVoiceMessage().catch(console.error));

  els.togglePanel.addEventListener('click', () => {
    // Clicking the toolbar settings button also closes panel if it's already open
    if (!state.panelHidden) {
      closeSettingsPanel();
    } else {
      openSettingsPanel();
    }
  });
  els.themeToggle?.addEventListener('click', () => toggleTheme().catch(console.error));
  els.closePanel?.addEventListener('click', closeSettingsPanel);

  // Settings menu: card clicks → open section (or dedicated drawer for
  // scheduled messages, so it matches the toolbar button UX).
  document.querySelectorAll('.settings-menu-item[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-open');
      if (!key) return;
      showSettingsSection(key);
    });
  });
  // Back button in settings header
  els.settingsBack?.addEventListener('click', () => showSettingsMenu());

  // Tweaks: theme / scene / density pills
  document.querySelectorAll('.tweak-pill[data-theme]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      if (normalizeTheme(state.settings?.uiTheme || 'dark') === next) return;
      state.settings = { ...(state.settings || {}), uiTheme: next };
      applyTheme(next);
      refreshTweakPills();
      try { await saveSettings(); } catch {}
    });
  });

  document.querySelectorAll('.tweak-pill[data-scene]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.getAttribute('data-scene') || 'night';
      state.settings = { ...(state.settings || {}), uiScene: next };
      applyScene(next);
      refreshTweakPills();
      try { await saveSettings(); } catch {}
    });
  });

  document.querySelectorAll('.tweak-pill[data-density]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.getAttribute('data-density') || 'cozy';
      state.settings = { ...(state.settings || {}), uiDensity: next };
      applyDensity(next);
      refreshTweakPills();
      try { await saveSettings(); } catch {}
    });
  });

  document.getElementById('tweaks-collapse')?.addEventListener('click', () => {
    // In floating mode, "свернуть" simply closes the popover
    toggleTweaksPopover(false);
  });

  // Floating Tweaks: FAB click toggles the popover
  document.getElementById('tweaks-fab')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleTweaksPopover();
  });

  // Close Tweaks popover on any click that lands outside of it or the FAB
  document.addEventListener('click', (event) => {
    const panel = document.getElementById('tweaks-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const fab = document.getElementById('tweaks-fab');
    if (event.target.closest('#tweaks-panel')) return;
    if (fab && event.target.closest('#tweaks-fab')) return;
    toggleTweaksPopover(false);
  });

  // Weather settings: auto-save on change (no explicit button).
  const autoSaveWeather = async () => {
    const city = String(els.wsettingsCity?.value || '').trim();
    const unit = WaDeckWeatherModule.normalizeWeatherUnit(els.wsettingsUnit?.value);
    const normCity = WaDeckWeatherModule.normalizeWeatherCity(city);
    // Skip no-op saves to avoid spamming IPC on every keystroke
    if (
      normCity === state.settings?.weatherCity &&
      unit === state.settings?.weatherUnit
    ) return;
    state.settings = {
      ...(state.settings || {}),
      weatherCity: normCity,
      weatherUnit: unit,
    };
    try {
      await saveSettings();
      refreshSettingsMenuSubtitles();
      WaDeckWeatherModule.refreshWeather().catch(() => {});
    } catch { /* saveSettings already reported */ }
  };
  // Debounce city typing so every keystroke isn't a save
  let _weatherCityDebounce = null;
  els.wsettingsCity?.addEventListener('input', () => {
    if (_weatherCityDebounce) clearTimeout(_weatherCityDebounce);
    _weatherCityDebounce = setTimeout(autoSaveWeather, 700);
  });
  els.wsettingsCity?.addEventListener('blur', () => {
    if (_weatherCityDebounce) { clearTimeout(_weatherCityDebounce); _weatherCityDebounce = null; }
    autoSaveWeather();
  });
  els.wsettingsUnit?.addEventListener('change', () => autoSaveWeather());
  els.wsettingsRefresh?.addEventListener('click', () => {
    WaDeckWeatherModule.refreshWeather().catch(console.error);
    setStatus('Обновляю погоду…');
  });

  // Template edit form lives inline inside the Templates settings card.
  // Opened/closed in place to match the other drawer sections' style.
  const tmplEditWrap = document.getElementById('tmpl-edit-wrap');
  const tmplEditCloseBtn = document.getElementById('tmpl-edit-close');
  const tmplEditTitleEl = document.getElementById('tmpl-edit-title');
  if (tmplEditWrap) {
    const openTemplateEdit = () => {
      tmplEditWrap.classList.remove('hidden');
      setTimeout(() => {
        tmplEditWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 20);
    };
    const closeTemplateEdit = () => tmplEditWrap.classList.add('hidden');

    tmplEditCloseBtn?.addEventListener('click', closeTemplateEdit);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !tmplEditWrap.classList.contains('hidden')) {
        closeTemplateEdit();
      }
    });

    // Update header title based on whether this is a new or existing template
    const updateTmplEditTitle = () => {
      if (!tmplEditTitleEl) return;
      const titleVal = els.templateTitle?.value?.trim();
      const hasId = els.templateSelect && els.templateSelect.value;
      tmplEditTitleEl.textContent = hasId
        ? `Редактирование · ${titleVal || 'без названия'}`
        : 'Новый шаблон';
    };
    els.templateSelect?.addEventListener('change', updateTmplEditTitle);
    els.templateTitle?.addEventListener('input', updateTmplEditTitle);

    // Hide form automatically after save/delete
    els.templateSave?.addEventListener('click', () => setTimeout(closeTemplateEdit, 50));
    els.templateDelete?.addEventListener('click', () => setTimeout(closeTemplateEdit, 50));

    window._showTemplateEditForm = () => { openTemplateEdit(); updateTmplEditTitle(); };
    window._hideTemplateEditForm = closeTemplateEdit;
  } else {
    window._showTemplateEditForm = () => {};
    window._hideTemplateEditForm = () => {};
  }

  // "+ Новый шаблон" (settings library header) → open edit modal fresh
  const tmplLibNewBtn = document.getElementById('tmpl-lib-new');
  if (tmplLibNewBtn && els.templateNew) {
    tmplLibNewBtn.addEventListener('click', () => {
      els.templateNew.click();
      if (typeof window._showTemplateEditForm === 'function') window._showTemplateEditForm();
      setTimeout(() => els.templateTitle?.focus(), 30);
    });
  }

  /* Scroll-fade for panel body */
  const panelBody = document.querySelector('.panel-body');
  const scrollFade = document.querySelector('.panel-scroll-fade');
  if (panelBody && scrollFade) {
    panelBody.addEventListener('scroll', () => {
      const atBottom = panelBody.scrollTop + panelBody.clientHeight >= panelBody.scrollHeight - 10;
      scrollFade.classList.toggle('is-bottom', atBottom);
    });
  }

  /* Zoom controls */
  els.zoomSlider?.addEventListener('input', () => {
    applyZoom(Number(els.zoomSlider.value) || 100);
  });
  els.zoomIn?.addEventListener('click', () => {
    applyZoom((Number(els.zoomSlider?.value) || 100) + 10);
  });
  els.zoomOut?.addEventListener('click', () => {
    applyZoom((Number(els.zoomSlider?.value) || 100) - 10);
  });

  /* Clocks settings — toggle add form */
  els.clockAddToggle?.addEventListener('click', () => {
    const form = els.clockAddForm;
    if (!form) return;
    const isHidden = form.classList.contains('hidden');
    if (isHidden) {
      form.classList.remove('hidden');
      form.style.maxHeight = '0';
      form.style.opacity = '0';
      requestAnimationFrame(() => {
        form.style.transition = 'max-height 0.25s ease, opacity 0.2s ease';
        form.style.maxHeight = '50px';
        form.style.opacity = '1';
      });
      els.clockAddToggle.textContent = '− Отмена';
      els.clockNewLabel?.focus();
    } else {
      form.style.maxHeight = '0';
      form.style.opacity = '0';
      setTimeout(() => { form.classList.add('hidden'); form.style.transition = ''; }, 250);
      els.clockAddToggle.textContent = '+ Добавить';
    }
  });

  /* Clocks settings — add new clock */
  els.clockAdd?.addEventListener('click', () => {
    const label = (els.clockNewLabel?.value || '').trim();
    const tz = (els.clockNewTz?.value || '').trim();
    if (!label || !tz) { showToast('Введите город и выберите часовой пояс', 'warn'); return; }
    if (!state.settings.worldClocks) state.settings.worldClocks = [];
    if (state.settings.worldClocks.length >= 10) { showToast('Максимум 10 часовых поясов', 'warn'); return; }
    state.settings.worldClocks.push({ label, tz });
    if (els.clockNewLabel) els.clockNewLabel.value = '';
    if (els.clockNewTz) els.clockNewTz.value = '';
    renderClocksSettings();
    saveSettings().catch(console.error);
    // Collapse add form after adding
    if (els.clockAddForm) {
      els.clockAddForm.style.maxHeight = '0';
      els.clockAddForm.style.opacity = '0';
      setTimeout(() => { els.clockAddForm.classList.add('hidden'); els.clockAddForm.style.transition = ''; }, 250);
    }
    if (els.clockAddToggle) els.clockAddToggle.textContent = '+ Добавить';
  });

  els.manualUpdate?.addEventListener('click', () => WaDeckAutoUpdateModule.requestManualUpdate().catch(console.error));
  els.brandHub?.addEventListener('click', () => {
    playBrandClickAnimation();
    openHubMode();
  });
  // Weather widget is a read-only indicator now — configuration lives in
  // the settings panel, so the popover stays hidden and clicks are no-ops.
  els.weatherClose?.addEventListener('click', () => WaDeckWeatherModule.closeWeatherPopover());
  els.weatherRefresh?.addEventListener('click', () => WaDeckWeatherModule.refreshWeather().catch(console.error));
  els.weatherSave?.addEventListener('click', () => WaDeckWeatherModule.saveWeatherSettings().catch(console.error));
  els.weatherUnit?.addEventListener('click', () => WaDeckWeatherModule.toggleWeatherUnit().catch(console.error));
  els.weatherCityInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      WaDeckWeatherModule.saveWeatherSettings().catch(console.error);
    }
  });

  els.settingTranslatorEnabled?.addEventListener('change', async (event) => {
    const enabled = !!event.target.checked;
    state.settings = { ...(state.settings || {}), translatorEnabled: enabled };
    applyTranslatorToggleToAllWebviews(enabled);
    try {
      await saveSettings();
      refreshSettingsMenuSubtitles();
      setStatus(enabled ? 'Переводчик включён' : 'Переводчик отключён');
    } catch {
      // saveSettings already surfaces its own error; revert UI to current state
      event.target.checked = isTranslatorEnabled();
    }
  });

  els.settingCrmHoverEnabled?.addEventListener('change', async (event) => {
    const enabled = !!event.target.checked;
    state.settings = { ...(state.settings || {}), crmHoverEnabled: enabled };
    applyCrmHoverToggle(enabled);
    try {
      await saveSettings();
      refreshSettingsMenuSubtitles();
      setStatus(enabled ? 'Hover-меню CRM включено' : 'Hover-меню CRM отключено');
    } catch {
      event.target.checked = isCrmHoverEnabled();
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

    // Zoom: Cmd/Ctrl + = / + / -
    if (event.key === '=' || event.key === '+') {
      event.preventDefault();
      applyZoom((Number(els.zoomSlider?.value) || 100) + 10);
      return;
    }
    if (event.key === '-') {
      event.preventDefault();
      applyZoom((Number(els.zoomSlider?.value) || 100) - 10);
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      applyZoom(100);
      return;
    }
  });
  document.addEventListener('click', (event) => {
    if (!els.weatherWidget || !els.weatherPopover) return;
    if (els.weatherPopover.classList.contains('hidden')) return;
    if (els.weatherWidget.contains(event.target)) return;
    WaDeckWeatherModule.closeWeatherPopover();
  });

  els.saveSettings?.addEventListener('click', () => saveSettings().catch(console.error));
  els.closeReleaseNotes?.addEventListener('click', () => WaDeckAutoUpdateModule.closeReleaseNotesModal().catch(console.error));

  /* Update available modal buttons */
  els.closeUpdateModal?.addEventListener('click', () => WaDeckAutoUpdateModule.closeUpdateModal());
  els.updateDismissBtn?.addEventListener('click', () => WaDeckAutoUpdateModule.closeUpdateModal());
  els.updateInstallBtn?.addEventListener('click', () => WaDeckAutoUpdateModule.installUpdate().catch(console.error));



  els.crmEdit?.addEventListener('click', WaDeckCrmModule.toggleCrmEdit);
  els.crmSave?.addEventListener('click', () => WaDeckCrmModule.saveCrmCard().catch(console.error));
  els.crmCopy?.addEventListener('click', () => WaDeckCrmModule.copyCrmCard().catch(console.error));
  els.crmClose?.addEventListener('click', WaDeckCrmModule.closeCrmModal);
  if (els.crmAddNote) els.crmAddNote.addEventListener('click', WaDeckCrmModule.addCrmNote);
  WaDeckCrmModule.bindCrmAutoResize();
  // Confirm модал
  els.confirmOk?.addEventListener('click', () => closeConfirm(true));
  els.confirmCancel?.addEventListener('click', () => closeConfirm(false));
  if (els.confirmClose) els.confirmClose.addEventListener('click', () => closeConfirm(false));
  els.confirmModal?.addEventListener('click', (e) => { if (e.target === els.confirmModal) closeConfirm(false); });
  window.addEventListener('resize', () => {
    if (!els.crmModal.classList.contains('hidden')) {
      WaDeckCrmModule.updateCrmModalPosition().catch(() => {});
    }
    updateSidebarScrollControls();
  });
  els.pickAttachments?.addEventListener('click', () => WaDeckScheduleModule.pickAttachments().catch(console.error));
  els.clearAttachments?.addEventListener('click', WaDeckScheduleModule.clearAttachments);
  els.openChatPicker?.addEventListener('click', () => WaDeckScheduleModule.openChatPicker().catch(console.error));

  /* ── Schedule: toolbar "Отложенные" opens the settings → Schedule drawer,
     consistent with Templates. The old floating popover was removed. ── */
  function openScheduleSection() {
    if (state.panelHidden) openSettingsPanel();
    showSettingsSection('schedule');
    // Always prefill "send at" with the current system time on every open —
    // even if the card was already expanded from a previous visit. Otherwise
    // the field keeps a stale value (often a few minutes old), which was the
    // source of the "time is slightly off" bug.
    if (els.scheduleAt) {
      els.scheduleAt.value = nextSendAtLocal(0);
    }
  }

  if (els.openScheduleToolbar) {
    els.openScheduleToolbar.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openScheduleSection();
    });
  }
  // Also refresh when user navigates via Settings → Отложенные сообщения
  document.querySelectorAll('.settings-menu-item[data-open="schedule"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // showSettingsSection already fired by the generic handler — just refresh time.
      setTimeout(() => {
        if (els.scheduleAt) els.scheduleAt.value = nextSendAtLocal(0);
      }, 0);
    });
  });

  /* Keep settings card toggle handler for datetime reset */
  const scheduleCard = document.getElementById('schedule-settings-card');
  if (scheduleCard) {
    scheduleCard.addEventListener('toggle', () => {
      if (scheduleCard.open) {
        els.scheduleAt.value = nextSendAtLocal(0);
      }
    });
  }

  /* ── Schedule Popover Form Handlers ── */
  let spAttachments = [];

  /* Populate account select with WhatsApp accounts */
  function populateSpAccounts() {
    if (!els.spAccount) return;
    els.spAccount.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— Выберите аккаунт —';
    els.spAccount.appendChild(defaultOpt);
    for (const account of state.accounts) {
      if (account.type === 'telegram') continue;
      const opt = document.createElement('option');
      opt.value = account.id;
      opt.textContent = account.frozen ? `${account.name} (заморожен)` : account.name;
      els.spAccount.appendChild(opt);
    }
    const active = activeAccount();
    if (active && active.type !== 'telegram') {
      els.spAccount.value = active.id;
    }
  }

  async function populateSpChats(accountId) {
    if (!els.spChat) return;
    els.spChat.innerHTML = '';
    if (!accountId) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— Сначала выберите аккаунт —';
      els.spChat.appendChild(opt);
      return;
    }
    const loadOpt = document.createElement('option');
    loadOpt.value = '';
    loadOpt.textContent = 'Загрузка чатов...';
    els.spChat.appendChild(loadOpt);

    const chats = await WaDeckScheduleModule.fetchChatsForAccount(accountId);
    els.spChat.innerHTML = '';
    if (!chats.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Чаты не найдены';
      els.spChat.appendChild(opt);
      return;
    }
    for (const chat of chats) {
      const opt = document.createElement('option');
      opt.value = chat;
      opt.textContent = chat;
      els.spChat.appendChild(opt);
    }
  }

  els.spAccount?.addEventListener('change', () => {
    populateSpChats(els.spAccount.value);
  });

  els.spPickAttachments?.addEventListener('click', async () => {
    const files = await window.waDeck.pickAttachments();
    if (!files || !Array.isArray(files) || !files.length) return;
    spAttachments.push(...files);
    renderSpAttachments();
  });

  els.spClearAttachments?.addEventListener('click', () => {
    spAttachments = [];
    renderSpAttachments();
  });

  function renderSpAttachments() {
    if (!els.spAttachmentsList) return;
    els.spAttachmentsList.innerHTML = '';
    for (const f of spAttachments) {
      const div = document.createElement('div');
      div.className = 'attachment-item';
      div.textContent = f.name || 'file';
      els.spAttachmentsList.appendChild(div);
    }
  }

  els.spCreate?.addEventListener('click', async () => {
    const text = String(els.spText?.value || '').trim();
    const sendAt = String(els.spAt?.value || '');
    const accountId = String(els.spAccount?.value || '').trim();
    const chatName = String(els.spChat?.value || '').trim();

    if (!accountId || !chatName) {
      showToast('Выберите аккаунт и чат', 'warn');
      return;
    }
    if (!text && !spAttachments.length) {
      showToast('Введите текст или добавьте вложения', 'warn');
      return;
    }
    if (!sendAt) {
      showToast('Укажите время отправки', 'warn');
      return;
    }
    const parsedDate = new Date(sendAt);
    if (isNaN(parsedDate.getTime())) {
      showToast('Неверный формат времени', 'warn');
      return;
    }

    const payload = {
      accountId,
      chatName,
      text,
      sendAt: parsedDate.toISOString(),
      attachments: spAttachments.map((f) => ({ ...f })),
    };

    const response = await window.waDeck.scheduleMessage(payload);
    if (!response?.ok) {
      showToast(response?.error || 'Ошибка планирования', 'error');
      return;
    }

    // If this save was an "edit" of an existing entry, retire the original.
    if (state._scheduleEditingId) {
      try { await window.waDeck.cancelScheduled(state._scheduleEditingId); } catch { /* ignore */ }
      state._scheduleEditingId = null;
      showToast('Отложенное обновлено', 'success');
    } else {
      showToast('Сообщение запланировано', 'success');
    }
    if (els.spText) els.spText.value = '';
    spAttachments = [];
    renderSpAttachments();
    if (els.spAt) els.spAt.value = nextSendAtLocal(0);
    await WaDeckScheduleModule.renderScheduled();
    renderSchedulePopoverList();
  });

  async function renderSchedulePopoverList() {
    if (!els.spList) return;
    els.spList.innerHTML = '';

    let response;
    try {
      response = await window.waDeck.listScheduled({ limit: 120 });
    } catch (err) {
      const errDiv = document.createElement('div');
      errDiv.className = 'sp-empty sp-error';
      errDiv.textContent = 'Ошибка загрузки: ' + (err.message || 'неизвестная ошибка');
      els.spList.appendChild(errDiv);
      return;
    }

    const items = Array.isArray(response?.items) ? response.items : [];

    if (els.spListSummary) {
      els.spListSummary.textContent = `Запланированные (${items.length})`;
    }

    if (!items.length) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'sp-empty';
      emptyDiv.textContent = 'Нет запланированных сообщений';
      els.spList.appendChild(emptyDiv);
      return;
    }

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'sp-item';

      const statusClass = item.status === 'failed' ? 'badge-failed' : item.status === 'sent' ? 'badge-sent' : 'badge-pending';
      const statusLabel = item.status === 'failed' ? 'ошибка' : item.status === 'sent' ? 'отправлено' : item.status === 'processing' ? 'отправка...' : 'ожидает';

      const sendAtStr = new Date(item.sendAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const textPreview = String(item.text || '').slice(0, 40) || '(вложения)';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'sp-item-info';

      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'sp-badge ' + statusClass;
      badgeSpan.textContent = statusLabel;
      infoDiv.appendChild(badgeSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'sp-item-time';
      timeSpan.textContent = sendAtStr;
      infoDiv.appendChild(timeSpan);

      const textDiv = document.createElement('div');
      textDiv.className = 'sp-item-text';
      textDiv.textContent = textPreview;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'sp-item-actions';

      // Edit — copy the entry back into the form for adjustment
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-small sp-edit';
      editBtn.dataset.id = String(item.id);
      editBtn.title = 'Редактировать (будет пересоздано)';
      editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      actionsDiv.appendChild(editBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-small sp-cancel';
      cancelBtn.dataset.id = String(item.id);
      cancelBtn.title = 'Отменить';
      cancelBtn.textContent = '\u2715';
      actionsDiv.appendChild(cancelBtn);

      row.appendChild(infoDiv);
      row.appendChild(textDiv);
      row.appendChild(actionsDiv);

      // Disable edit/cancel for items that already went out.
      if (item.status === 'sent') {
        editBtn.disabled = true;
        cancelBtn.style.display = 'none';
      }

      editBtn.addEventListener('click', () => {
        // Pull the item into the Create form. The original row stays
        // pending; on "Запланировать" it is replaced with a fresh entry
        // and the original is cancelled, so effectively it's an edit.
        const createDetails = document.getElementById('sp-create-details');
        if (createDetails) createDetails.open = true;
        if (els.spAccount && item.accountId) els.spAccount.value = item.accountId;
        if (els.spAccount && item.accountId) populateSpChats(item.accountId);
        setTimeout(() => {
          if (els.spChat && item.chatName) els.spChat.value = item.chatName;
        }, 30);
        if (els.spText) els.spText.value = String(item.text || '');
        if (els.spAt && item.sendAt) {
          const d = new Date(item.sendAt);
          if (!isNaN(d.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            els.spAt.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          }
        }
        // Mark the original for replacement on next "Запланировать"
        state._scheduleEditingId = item.id;
        setStatus('Отложенное отредактируется — сохраните, старое будет отменено');
      });

      cancelBtn.addEventListener('click', async () => {
        await window.waDeck.cancelScheduled(item.id);
        await WaDeckScheduleModule.renderScheduled();
        renderSchedulePopoverList();
      });

      els.spList.appendChild(row);
    }
  }

  document.addEventListener('schedule-list-updated', () => {
    renderSchedulePopoverList();
  });
  els.pickerAccount?.addEventListener('change', () => WaDeckScheduleModule.refreshPickerChats(true).catch(console.error));
  els.pickerRefresh?.addEventListener('click', () => WaDeckScheduleModule.refreshPickerChats(true).catch(console.error));
  els.closeChatPicker?.addEventListener('click', WaDeckScheduleModule.closeChatPicker);
  els.accountMenuSave?.addEventListener('click', () => saveAccountFromMenu().catch(console.error));
  els.accountMenuReset?.addEventListener('click', () => resetAccountFromMenu().catch(console.error));
  els.accountMenuIcon?.addEventListener('click', () => changeAccountIconFromMenu().catch(console.error));
  els.accountMenuResetIcon?.addEventListener('click', () => resetAccountIconFromMenu().catch(console.error));

  // Color picker toggle
  const colorBtn = document.getElementById('account-menu-color');
  const colorPop = document.getElementById('account-color-popover');
  if (colorBtn && colorPop) {
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPop.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!colorPop.contains(e.target) && e.target !== colorBtn && !colorBtn.contains(e.target)) {
        colorPop.classList.add('hidden');
      }
    });
  }
  els.accountMenuCancel?.addEventListener('click', closeAccountMenu);
  els.accountMenuFreeze?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    const account = accountById(id);
    if (!account) return;
    setAccountFrozenState(id, !account.frozen, { reopenMenu: true }).catch(console.error);
  });
  els.accountMenuPin?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    const account = accountById(id);
    if (!account) return;
    setAccountPinnedState(id, !account.pinned, { reopenMenu: true }).catch(console.error);
  });
  els.accountMenuDelete?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    if (!id) return;
    closeAccountMenu();
    removeAccount(id).catch(console.error);
  });
  els.pickerApply?.addEventListener('click', () => {
    // Always tie the pick to the currently active account — renderer ignores
    // the hidden picker-account select entirely to match the "chats from the
    // open account only" UX.
    const accountId = String(state.activeAccountId || '').trim();
    const chatName = String(els.pickerChat.value || '').trim();
    const account = state.accounts.find((row) => row.id === accountId);
    if (!accountId || !account) {
      setStatus('Откройте WhatsApp-аккаунт');
      return;
    }
    if (!chatName) {
      setStatus('Выберите чат');
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
  els.createSchedule?.addEventListener('click', () => {
    runWithBusyButton(els.createSchedule, () => WaDeckScheduleModule.createScheduledMessage(), {
      text: 'Планирую...',
      title: 'Создание отложенной отправки',
    }).catch(console.error);
  });
  templateController?.bind();

  // ── Sidebar Resize Handle ──
  if (els.sidebarResizeHandle) {
    const SIDEBAR_MIN = 64;
    const SIDEBAR_MAX = 200;
    const appRoot = document.getElementById('app-root');
    let resizing = false;

    // Restore saved width (with NaN protection — corrupted value breaks CSS grid)
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const parsed = Number(savedWidth);
      if (Number.isFinite(parsed)) {
        const w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, parsed));
        appRoot.style.setProperty('--sidebar-width', w + 'px');
        els.sidebarResizeHandle.style.left = w + 'px';
      } else {
        localStorage.removeItem('sidebarWidth');
      }
    }

    els.sidebarResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true;
      els.sidebarResizeHandle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const x = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX));
      appRoot.style.setProperty('--sidebar-width', x + 'px');
      els.sidebarResizeHandle.style.left = x + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      els.sidebarResizeHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const currentWidth = parseInt(getComputedStyle(appRoot).getPropertyValue('--sidebar-width'), 10);
      if (Number.isFinite(currentWidth) && currentWidth >= SIDEBAR_MIN && currentWidth <= SIDEBAR_MAX) {
        localStorage.setItem('sidebarWidth', currentWidth);
      }
    });
  }
}

async function init() {
  /* Guard: detect broken CSS grid from corrupted --sidebar-width (NaNpx etc.) */
  const appRoot = document.getElementById('app-root');
  if (appRoot) {
    const sidebarEl = appRoot.querySelector('.sidebar');
    if (sidebarEl) {
      const sidebarRect = sidebarEl.getBoundingClientRect();
      const appRect = appRoot.getBoundingClientRect();
      if (sidebarRect.width < 40 || sidebarRect.width > 300 || sidebarRect.width >= appRect.width * 0.8) {
        console.warn('[layout] Corrupted sidebar width detected, resetting to default');
        appRoot.style.removeProperty('--sidebar-width');
        localStorage.removeItem('sidebarWidth');
      }
    }
  }

  /* Accessibility: copy title → aria-label for all icon-only buttons */
  document.querySelectorAll('.btn-icon[title]').forEach((btn) => {
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', btn.title);
  });

  const moduleCtx = { state, els, setStatus, trimMapSize, runWithBusyButton };
  WaDeckWeatherModule.init(moduleCtx);
  WaDeckAutoUpdateModule.init(moduleCtx);
  WaDeckUnreadModule.init({ ...moduleCtx, renderAccounts, isWebviewReady, safeExecuteInWebview, updateHubDashboard });
  WaDeckCrmModule.init({ ...moduleCtx, activeAccount, selectedWebview });
  WaDeckScheduleModule.init({ ...moduleCtx, trimMapSize, runWithBusyButton, accountById, ensureWebview, isWebviewReady, sendWebviewInput, delay, formatDateTime, nextSendAtLocal, showConfirm });
  if (typeof window.waDeck.onAutoUpdateStatus === 'function' && !state.autoUpdateUnsubscribe) {
    state.autoUpdateUnsubscribe = window.waDeck.onAutoUpdateStatus((payload) => {
      WaDeckAutoUpdateModule.handleAutoUpdateStatus(payload);
    });
  }
  if (typeof window.waDeck.onHostEscape === 'function') {
    if (state.hostEscapeUnsubscribe) state.hostEscapeUnsubscribe();
    state.hostEscapeUnsubscribe = window.waDeck.onHostEscape(() => {
      handleEscapeUiReset();
    });
  }

  /* Webview crash recovery — reload crashed webview and update status */
  if (typeof window.waDeck.onWebviewCrashed === 'function') {
    window.waDeck.onWebviewCrashed((payload) => {
      console.warn('[webview-crashed]', payload.reason);
      setStatus(`Webview упал (${payload.reason}). Перезагрузка...`);
      // Find and reload any crashed webviews
      for (const [accountId, webview] of state.webviews) {
        try {
          if (webview && webview.isConnected && webview.getWebContentsId) {
            webview.getWebContentsId(); // throws if crashed
          }
        } catch {
          console.warn('[webview-crashed] reloading', accountId);
          try { webview.reload(); } catch { /* already dead */ }
        }
      }
    });
  }

  const boot = await window.waDeck.bootstrap();
  state.accounts = Array.isArray(boot.accounts) ? boot.accounts : [];
  state.settings = {
    uiTheme: normalizeTheme(boot.settings?.uiTheme || 'dark'),
    weatherCity: WaDeckWeatherModule.normalizeWeatherCity(boot.settings?.weatherCity || 'Moscow'),
    weatherUnit: WaDeckWeatherModule.normalizeWeatherUnit(boot.settings?.weatherUnit || 'celsius'),
    lastSeenReleaseNotesVersion: String(boot.settings?.lastSeenReleaseNotesVersion || ''),
    translatorEnabled: boot.settings?.translatorEnabled !== false,
    crmHoverEnabled: boot.settings?.crmHoverEnabled !== false,
    uiScene: VALID_SCENES.includes(boot.settings?.uiScene) ? boot.settings.uiScene : 'night',
    uiDensity: VALID_DENSITY.includes(boot.settings?.uiDensity) ? boot.settings.uiDensity : 'cozy',
    tweaksCollapsed: !!boot.settings?.tweaksCollapsed,
    worldClocks: Array.isArray(boot.settings?.worldClocks) ? boot.settings.worldClocks : [
      { label: 'Москва', tz: 'Europe/Moscow' },
      { label: 'Киев', tz: 'Europe/Kiev' },
      { label: 'Берлин', tz: 'Europe/Berlin' },
    ],
  };
  state.templates = Array.isArray(boot.templates) ? boot.templates.map((tpl) => ({ ...tpl })) : [];
  state.runtime = boot.runtime || {};
  state.runtime.appVersion = String(boot.appVersion || state.runtime.appVersion || '').trim();

  // Render sidebar immediately so accounts are visible right away
  renderAccounts();

  // Staged background load: kick off webview creation for every account but
  // staggered by STAGGER_MS so the UI stays responsive during initial paint.
  // Startup time to "app usable" stays fast; unread counters populate over
  // the next few seconds as each account boots. For 30 accounts this takes
  // ~15s total, but the UI never freezes.
  //
  // Note: all webviews stay alive for the lifetime of the app — idle-suspend
  // was removed because it caused WhatsApp accounts to drop messages while
  // suspended and forced users to re-click each account to reload WA Web.
  const STAGGER_MS = 400;
  for (let i = 0; i < state.accounts.length; i += 1) {
    const account = state.accounts[i];
    setTimeout(() => {
      try {
        ensureWebview(account);
        const wv = state.webviews.get(account.id);
        if (wv) wv._lastActive = Date.now();
      } catch (err) {
        console.error(`[init] failed to create webview for ${account.id}:`, err);
      }
    }, i * STAGGER_MS);
  }

  state.startupHubVisible = true;
  if (state.startupHubTimeoutId) {
    clearTimeout(state.startupHubTimeoutId);
    state.startupHubTimeoutId = null;
  }

  // Стартуем всегда в хабе без активного WhatsApp.
  setActiveAccount('');
  updatePanelVisibility();
  applySettingsToForm({ renderWeather: true });
  WaDeckScheduleModule.renderAttachmentsDraft();
  WaDeckScheduleModule.renderScheduleTarget();
  els.crmContactName.value = '';
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
      // Notify the settings palette whenever templates change so that
      // newly-added categories show up in the library list immediately
      // (without needing an app restart).
      onChange: () => {
        try { refreshSettingsMenuSubtitles(); } catch (e) { console.warn('[tmpl:onChange]', e); }
      },
    });
    await templateController.init(state.templates);
  }

  els.scheduleAt.value = nextSendAtLocal(0);
  /* renderScheduled() already called via setActiveAccount → _setActiveAccountInner */

  bindActions();
  WaDeckWeatherModule.startWeatherRefreshLoop();
  WaDeckWeatherModule.refreshWeather().catch((e) => console.warn('[weather]', e));
  WaDeckScheduleModule.startScheduleRunner();
  WaDeckUnreadModule.startUnreadPolling();
  WaDeckUnreadModule.scheduleDockBadgeSync();
  // Idle-suspend disabled: destroying inactive webviews after 15 min forced
  // users to re-click every account to reload WhatsApp Web, which in turn
  // missed incoming messages while suspended. Keeping all webviews alive for
  // the lifetime of the app is the correct trade-off for the 10–20 account
  // use case. The original memory optimisation target (30+ accounts on
  // low-RAM machines) can be re-introduced behind a settings toggle if
  // needed — see startIdleWebviewSweeper() which remains as dead code.
  // startIdleWebviewSweeper();
  renderClocksSettings();
  // Toolbar clock — update immediately and every 15s
  updateToolbarClock();
  // Hub clock auto-refresh every 30s
  if (!state._hubClockTimer) {
    state._hubClockTimer = setInterval(() => {
      updateToolbarClock();
      const hs = document.getElementById('hub-screen');
      if (hs && !hs.classList.contains('hidden')) updateHubClocks();
    }, 30000);
  }
  WaDeckAutoUpdateModule.maybeShowReleaseNotes().catch(console.error);

  setStatus('');
}

/* ── Toolbar "Шаблоны" button and Ctrl+T → open the settings drawer on
   the Templates section. The old full-screen tq-overlay palette has been
   removed in favour of the unified right-drawer UX. ── */
(function setupTemplatesShortcut() {
  function openTemplatesDrawer() {
    if (state.panelHidden) openSettingsPanel();
    showSettingsSection('templates');
  }

  if (els.openTemplateQuick) {
    els.openTemplateQuick.addEventListener('click', openTemplatesDrawer);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T') && !e.shiftKey && !e.altKey) {
      const active = document.activeElement;
      const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (inInput) return;
      e.preventDefault();
      openTemplatesDrawer();
    }
  });
})();

init().catch((error) => {
  setStatus(`Ошибка запуска: ${String(error?.message || error)}`);
});
