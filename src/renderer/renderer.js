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
  chatPickerCache: new Map(),
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
  panelStatus: document.getElementById('panel-status'),

  saveSettings: document.getElementById('save-settings'),
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

  tqOverlay: document.getElementById('template-quick-overlay'),
  tqSearch: document.getElementById('tq-search'),
  tqList: document.getElementById('tq-list'),
  tqEmpty: document.getElementById('tq-empty'),
  tqClose: document.getElementById('tq-close'),
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
let _crmHoverTimer = null;
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

function hideCrmHoverPopover() {
  const el = document.getElementById('crm-hover-popover');
  if (!el) return;
  /* Don't hide if mouse is over the popover or user is dragging it */
  if (el.matches(':hover') || el._dragging) return;
  el.classList.add('hidden');
  _crmHoverVisible = false;
}

function showCrmHoverPopover(contactName, record, webview, rect) {
  const popover = getCrmHoverPopover();
  const nameEl = popover.querySelector('.crm-hover-contact');
  const fieldsEl = popover.querySelector('.crm-hover-fields');
  nameEl.textContent = contactName;

  const fields = [];
  if (record.fullName) fields.push({ label: 'Имя', value: record.fullName });
  if (record.countryCity) fields.push({ label: 'Город', value: record.countryCity });
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
  const left = Math.round(wvRect.left + rect.right + 4);
  let top = Math.round(wvRect.top + rect.top);

  popover.style.width = popoverWidth + 'px';
  popover.classList.remove('hidden');

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
    try {
      const res = await window.waDeck.crmLoadContact({
        accountId: account.id,
        accountName: account.name,
        contactName,
      });
      if (!res?.ok) return;
      record = res.record || {};
      _crmHoverCache.set(cacheKey, { data: record, ts: now });
      // Limit cache size
      trimMapSize(_crmHoverCache, 50);
    } catch (err) {
      console.warn('[CRM Hover] Failed to load contact:', contactName, err);
      return;
    }
  }

  // Guard: if a hide arrived while we were loading, don't show
  if (_crmHoverShowName !== contactName) return;

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

  // Update status dot
  const dot = card.querySelector('.account-status-dot');
  if (dot) {
    dot.classList.remove('status-frozen', 'status-offline', 'status-ready', 'status-loading');
    if (account.frozen) {
      dot.classList.add('status-frozen');
      dot.title = 'Заморожен';
    } else {
      const wv = state.webviews.get(account.id);
      if (!wv) { dot.classList.add('status-offline'); dot.title = 'Не загружен'; }
      else if (wv.dataset?.waReady === '1') { dot.classList.add('status-ready'); dot.title = 'Подключён'; }
      else { dot.classList.add('status-loading'); dot.title = 'Загружается'; }
    }
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
function showAccountContextMenu(event, account) {
  closeAccountContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'account-context-menu';

  const isWa = account.type !== 'telegram';
  const items = [
    { label: 'Обновить', action: () => { setActiveAccount(account.id); requestAnimationFrame(() => refreshActiveWebview()); } },
    ...(isWa ? [{ label: account.frozen ? 'Разморозить' : 'Заморозить', action: () => { setAccountFrozenState(account.id, !account.frozen).catch(console.error); } }] : []),
    { divider: true },
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

// ── Toolbar Clock ──
function updateToolbarClock() {
  if (!els.toolbarClockTime) return;
  const now = new Date();
  els.toolbarClockTime.textContent = new Intl.DateTimeFormat('ru', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);

  // Update timezone popover
  if (!els.toolbarClockZones) return;
  const zones = (state.settings && state.settings.worldClocks) || [
    { label: 'Москва', tz: 'Europe/Moscow' },
    { label: 'Киев', tz: 'Europe/Kiev' },
    { label: 'Берлин', tz: 'Europe/Berlin' },
  ];
  if (!zones.length) return;
  els.toolbarClockZones.innerHTML = '';
  if (els.toolbarClockPopover) els.toolbarClockPopover.classList.remove('hidden');
  for (const zone of zones) {
    const row = document.createElement('div');
    row.className = 'toolbar-clock-zone-row';
    let time = '--:--';
    try {
      time = new Intl.DateTimeFormat('ru', {
        hour: '2-digit', minute: '2-digit',
        timeZone: zone.tz, hour12: false,
      }).format(now);
    } catch { /* invalid tz */ }
    const label = document.createElement('span');
    label.className = 'toolbar-clock-zone-label';
    label.textContent = zone.label;
    const timeEl = document.createElement('span');
    timeEl.className = 'toolbar-clock-zone-time';
    timeEl.textContent = time;
    row.append(label, timeEl);
    els.toolbarClockZones.appendChild(row);
  }
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

async function updateHubDashboard() {
  const hubScreen = document.getElementById('hub-screen');
  if (hubScreen && hubScreen.classList.contains('hidden')) return;
  updateHubClocks();
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

    const typeIcon = document.createElement('span');
    typeIcon.className = 'hub-stat-type';
    if (account.type === 'telegram') {
      typeIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="#2AABEE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else {
      typeIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

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

    row.append(dot, typeIcon, nameEl, badgeEl, statusEl);
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
  settingsBtn.className = 'btn hub-action-btn';
  settingsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Настройки';
  settingsBtn.addEventListener('click', () => { if (state.panelHidden) openSettingsPanel(); else closeSettingsPanel(); });

  const addWaBtn = document.createElement('button');
  addWaBtn.className = 'btn btn-ghost hub-action-btn hub-action-wa';
  addWaBtn.type = 'button';
  addWaBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> WhatsApp';
  addWaBtn.addEventListener('click', () => addAccount('whatsapp'));

  const addTgBtn = document.createElement('button');
  addTgBtn.className = 'btn btn-ghost hub-action-btn hub-action-tg';
  addTgBtn.type = 'button';
  addTgBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Telegram';
  addTgBtn.addEventListener('click', () => addAccount('telegram'));

  actions.append(settingsBtn, addWaBtn, addTgBtn);
  container.appendChild(actions);
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
  webview.setAttribute('webpreferences', 'contextIsolation=yes');
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
    // Re-inject translator bar after full page reload (account re-auth, manual reload)
    if (isWhatsApp && typeof translatorBarScript === 'function') {
      webview.executeJavaScript('window.__waDeckTranslatorBound = false;', true)
        .then(() => webview.executeJavaScript(translatorBarScript(), true))
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

    // WhatsApp-specific script injection
    if (isWhatsApp) {
      if (typeof webview.setUserAgent === 'function' && state.runtime?.waUserAgent) {
        webview.setUserAgent(state.runtime.waUserAgent);
      }

      webview
        .executeJavaScript(bridgeScript(), true)
        .catch((e) => console.warn('[bridge]', e));

      if (typeof crmHoverBridgeScript === 'function') {
        webview.executeJavaScript(crmHoverBridgeScript(), true).catch((e) => console.warn('[crm-hover]', e));
      }
      if (typeof translatorBarScript === 'function') {
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

    if (typeof crmHoverBridgeScript === 'function') {
      webview.executeJavaScript(crmHoverBridgeScript(), true).catch((e) => console.warn('[crm-hover]', e));
    }
    if (typeof translatorBarScript === 'function') {
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
}

function openHubMode() {
  state.startupHubVisible = false;
  setActiveAccount('');
}

function handleEscapeUiReset() {
  WaDeckWeatherModule.closeWeatherPopover();
  WaDeckScheduleModule.closeChatPicker();
  closeSettingsPanel();
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

function applySettingsToForm() {
  state.settings.uiTheme = normalizeTheme(state.settings.uiTheme);
  state.settings.weatherCity = WaDeckWeatherModule.normalizeWeatherCity(state.settings.weatherCity);
  state.settings.weatherUnit = WaDeckWeatherModule.normalizeWeatherUnit(state.settings.weatherUnit);
  applyTheme(state.settings.uiTheme);
  if (els.weatherCityInput) {
    els.weatherCityInput.value = state.settings.weatherCity;
  }
  WaDeckWeatherModule.renderWeatherSummary({
    city: state.settings.weatherCity,
    unit: state.settings.weatherUnit,
    loading: false,
  });
  renderClocksSettings();
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
    els.accountMenuFreeze.textContent = account.frozen ? 'Разморозить' : 'Заморозить';
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
  if (els.accountMenuIcon) {
    els.accountMenuIcon.style.borderColor = state.accountMenuDraftIconPath ? '#3dd68c' : '';
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
    openSettingsPanel();
  });
  els.themeToggle.addEventListener('click', () => toggleTheme().catch(console.error));
  els.closePanel.addEventListener('click', closeSettingsPanel);

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
  els.weatherToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    WaDeckWeatherModule.toggleWeatherPopover();
  });
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

  /* ── Schedule Popover ── */
  function openSchedulePopover() {
    if (!els.schedulePopover) return;
    els.schedulePopover.classList.remove('hidden');
    if (els.spAt) els.spAt.value = nextSendAtLocal(0);
    populateSpAccounts();
    const selectedAccount = els.spAccount?.value || '';
    if (selectedAccount) populateSpChats(selectedAccount);
    renderSchedulePopoverList();
  }

  function closeSchedulePopover() {
    if (!els.schedulePopover) return;
    els.schedulePopover.classList.add('hidden');
  }

  function toggleSchedulePopover() {
    if (!els.schedulePopover) return;
    if (els.schedulePopover.classList.contains('hidden')) {
      openSchedulePopover();
    } else {
      closeSchedulePopover();
    }
  }

  if (els.openScheduleToolbar) {
    els.openScheduleToolbar.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSchedulePopover();
    });
  }
  els.schedulePopoverClose?.addEventListener('click', closeSchedulePopover);

  /* Close popover on outside click */
  document.addEventListener('click', (e) => {
    if (els.schedulePopover && !els.schedulePopover.classList.contains('hidden')) {
      const widget = els.schedulePopover.closest('.schedule-widget');
      if (widget && !widget.contains(e.target)) {
        closeSchedulePopover();
      }
    }
  });

  /* Reset datetime when "Create" details expands */
  els.spCreateDetails?.addEventListener('toggle', () => {
    if (els.spCreateDetails.open && els.spAt) {
      els.spAt.value = nextSendAtLocal(0);
    }
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

    showToast('Сообщение запланировано', 'success');
    if (els.spText) els.spText.value = '';
    spAttachments = [];
    renderSpAttachments();
    if (els.spAt) els.spAt.value = nextSendAtLocal(0);
    await WaDeckScheduleModule.renderScheduled();
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

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-small sp-cancel';
      cancelBtn.dataset.id = String(item.id);
      cancelBtn.title = 'Отменить';
      cancelBtn.textContent = '\u2715';
      actionsDiv.appendChild(cancelBtn);

      row.appendChild(infoDiv);
      row.appendChild(textDiv);
      row.appendChild(actionsDiv);

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
  els.accountMenuDelete?.addEventListener('click', () => {
    const id = state.accountMenuAccountId;
    if (!id) return;
    closeAccountMenu();
    removeAccount(id).catch(console.error);
  });
  els.pickerApply?.addEventListener('click', () => {
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

  for (const account of state.accounts) {
    try {
      ensureWebview(account);
    } catch (err) {
      console.error(`[init] failed to create webview for ${account.id}:`, err);
    }
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

  els.scheduleAt.value = nextSendAtLocal(0);
  /* renderScheduled() already called via setActiveAccount → _setActiveAccountInner */

  bindActions();
  WaDeckWeatherModule.startWeatherRefreshLoop();
  WaDeckWeatherModule.refreshWeather().catch((e) => console.warn('[weather]', e));
  WaDeckScheduleModule.startScheduleRunner();
  WaDeckUnreadModule.startUnreadPolling();
  WaDeckUnreadModule.scheduleDockBadgeSync();
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

  setStatus(
    `Готово. Аккаунтов: ${state.accounts.length}, Electron ${state.runtime.electron || '?'}, Chromium ${state.runtime.chrome || '?'}`,
  );
}

/* ── Template Quick Access (Ctrl+T / toolbar button) ── */
(function setupTemplateQuickAccess() {
  const overlay = els.tqOverlay;
  const searchInput = els.tqSearch;
  const listEl = els.tqList;
  const emptyEl = els.tqEmpty;
  if (!overlay || !searchInput || !listEl) return;

  let activeIndex = -1;
  let visibleItems = [];
  /* Persist category expand/collapse state in localStorage */
  const TQ_CATEGORY_KEY = 'wa-deck-tq-category-state';
  const tqCategoryState = (() => {
    try {
      const raw = localStorage.getItem(TQ_CATEGORY_KEY);
      return raw ? new Map(JSON.parse(raw)) : new Map();
    } catch { return new Map(); }
  })();
  let _tqCategorySaveTimer = null;
  function saveTqCategoryState() {
    clearTimeout(_tqCategorySaveTimer);
    _tqCategorySaveTimer = setTimeout(() => {
      try { localStorage.setItem(TQ_CATEGORY_KEY, JSON.stringify([...tqCategoryState])); } catch {}
    }, 300);
  }

  function getTemplates() {
    return Array.isArray(state.templates) ? state.templates : [];
  }

  function truncate(str, len) {
    const s = String(str || '');
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  function renderList(filter) {
    const q = String(filter || '').trim().toLowerCase();
    const templates = getTemplates();
    const filtered = q
      ? templates.filter(t => {
          const title = String(t.title || '').toLowerCase();
          const text = String(t.text || '').toLowerCase();
          const category = String(t.category || '').toLowerCase();
          return title.includes(q) || text.includes(q) || category.includes(q);
        })
      : templates;

    listEl.innerHTML = '';
    visibleItems = [];
    activeIndex = -1;

    if (!filtered.length) {
      if (emptyEl) {
        emptyEl.classList.remove('hidden');
        emptyEl.textContent = q
          ? `Ничего не найдено по «${truncate(q, 30)}»`
          : 'Нет шаблонов. Создайте в Настройках → Общие шаблоны';
      }
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    /* Group by category */
    const groups = new Map();
    for (const tpl of filtered) {
      const cat = String(tpl.category || '').trim() || '';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(tpl);
    }

    /* Sort categories alphabetically, empty ("Без категории") last */
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, 'ru');
    });

    /* Sort templates within each group alphabetically */
    for (const [, list] of groups) {
      list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'));
    }

    for (const cat of sortedKeys) {
      const catTemplates = groups.get(cat);
      const details = document.createElement('details');
      details.className = 'tq-category';
      if (q) {
        details.open = true;
      } else {
        const savedState = tqCategoryState.get(cat);
        details.open = savedState !== undefined ? savedState : false;
      }

      details.addEventListener('toggle', () => {
        tqCategoryState.set(cat, details.open);
        saveTqCategoryState();
      });

      const summary = document.createElement('summary');
      summary.className = 'tq-category-title';
      summary.textContent = cat || 'Без категории';
      details.appendChild(summary);

      for (const tpl of catTemplates) {
        const item = document.createElement('div');
        item.className = 'tq-item';
        item.dataset.index = visibleItems.length;
        item.dataset.templateId = tpl.id;

        const icon = document.createElement('div');
        icon.className = 'tq-item-icon';
        icon.textContent = String(tpl.title || '?').slice(0, 1).toUpperCase();

        const body = document.createElement('div');
        body.className = 'tq-item-body';

        const title = document.createElement('div');
        title.className = 'tq-item-title';
        title.textContent = tpl.title || 'Без названия';

        const preview = document.createElement('div');
        preview.className = 'tq-item-preview';
        preview.textContent = truncate(tpl.text, 60);

        body.appendChild(title);
        body.appendChild(preview);
        item.appendChild(icon);
        item.appendChild(body);

        item.addEventListener('click', () => insertAndClose(tpl));
        details.appendChild(item);
        visibleItems.push({ el: item, tpl });
      }

      listEl.appendChild(details);
    }

    setActive(0);
  }

  function setActive(idx) {
    if (!visibleItems.length) return;
    if (activeIndex >= 0 && activeIndex < visibleItems.length) {
      visibleItems[activeIndex].el.classList.remove('tq-active');
    }
    activeIndex = Math.max(0, Math.min(idx, visibleItems.length - 1));
    const item = visibleItems[activeIndex];
    item.el.classList.add('tq-active');
    item.el.scrollIntoView({ block: 'nearest' });
  }

  async function insertAndClose(tpl) {
    const text = String(tpl.text || '').trim();
    if (!text) return;

    /* Block insert if no active WhatsApp/Telegram account */
    const account = state.accounts.find((a) => a.id === state.activeAccountId);
    if (!account) {
      setStatus('Шаблон: выберите аккаунт и откройте чат');
      return; /* keep palette open */
    }

    closePalette();
    const result = await insertTextIntoActiveChat(text);
    if (result?.ok) {
      setStatus(`Шаблон «${truncate(tpl.title, 20)}» вставлен`);
    } else {
      setStatus(`Шаблон: не удалось вставить (${result?.error || 'ошибка'})`);
    }
  }

  function openPalette() {
    overlay.classList.remove('hidden');
    searchInput.value = '';
    renderList('');
    searchInput.focus();

    /* Update context indicator */
    const ctxEl = document.getElementById('tq-context');
    if (ctxEl) {
      const account = state.accounts.find((a) => a.id === state.activeAccountId);
      if (account) {
        ctxEl.textContent = '→ ' + account.name;
        ctxEl.classList.remove('no-chat');
      } else {
        ctxEl.textContent = 'нет активного чата';
        ctxEl.classList.add('no-chat');
      }
    }
  }

  function closePalette() {
    overlay.classList.add('hidden');
    searchInput.value = '';
    listEl.innerHTML = '';
    activeIndex = -1;
    visibleItems = [];
  }

  // Event listeners
  searchInput.addEventListener('input', () => renderList(searchInput.value));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < visibleItems.length) {
        insertAndClose(visibleItems[activeIndex].tpl);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette();
  });

  if (els.tqClose) {
    els.tqClose.addEventListener('click', closePalette);
  }

  // Toolbar button
  if (els.openTemplateQuick) {
    els.openTemplateQuick.addEventListener('click', openPalette);
  }

})();

init().catch((error) => {
  setStatus(`Ошибка запуска: ${String(error?.message || error)}`);
});
