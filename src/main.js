const { app, BrowserWindow, dialog, ipcMain, shell, clipboard, session, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const APP_ID = 'com.local.wadeck';
const APP_TITLE = 'WA Deck';
const FALLBACK_CHROME_VERSION = '146.0.7680.166';
const APP_ICON_PNG_PATH = path.join(__dirname, '..', 'assets', 'icon', 'wadeck-icon-512.png');
const RELEASES_LATEST_URL = 'https://github.com/tamilamokrousova0/WA-Deck/releases/latest';

const DEFAULT_SETTINGS = {
  uiTheme: 'dark',
  weatherCity: 'Moscow',
  weatherUnit: 'celsius',
  lastSeenReleaseNotesVersion: '',
  worldClocks: [
    { label: 'Москва', tz: 'Europe/Moscow' },
    { label: 'Киев', tz: 'Europe/Kiev' },
    { label: 'Берлин', tz: 'Europe/Berlin' },
  ],
};

function normalizeWeatherUnit(value) {
  return String(value || '').toLowerCase() === 'fahrenheit' ? 'fahrenheit' : 'celsius';
}

function buildWhatsAppUserAgent() {
  const chromeVersion = process.versions.chrome || FALLBACK_CHROME_VERSION;
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

const WA_USER_AGENT = buildWhatsAppUserAgent();
app.userAgentFallback = WA_USER_AGENT;

const COLOR_PALETTE = ['#22c55e', '#0ea5e9', '#f97316', '#e11d48', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'];

const state = {
  paths: {
    userData: '',
    storePath: '',
    crmDir: '',
  },
  store: {
    accounts: [],
    settings: { ...DEFAULT_SETTINGS },
    templates: [],
    scheduled: [],
  },
};

let mainWindow;
let lastUpdateProgressPercent = -1;
let autoUpdaterConfigured = false;
let macDeveloperIdSignatureCache = null;

function setDockBadge(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  if (safeCount > 0) {
    // badge set silently
  }
  if (process.platform === 'darwin') {
    const badge = safeCount > 0 ? String(safeCount) : '';
    try {
      if (app.dock) {
        app.dock.setBadge(badge);
      }
    } catch (e) {
      console.warn('[dock-badge] dock.setBadge error:', e?.message);
    }
    try {
      app.setBadgeCount(safeCount);
    } catch (e) {
      console.warn('[dock-badge] setBadgeCount error:', e?.message);
    }
    return { ok: true, count: safeCount };
  }
  try {
    app.setBadgeCount(safeCount);
  } catch (e) {
    console.warn('[dock-badge] setBadgeCount error:', e?.message);
  }
  return { ok: true, count: safeCount };
}

function ensurePaths() {
  const userData = app.getPath('userData');
  state.paths.userData = userData;
  state.paths.storePath = path.join(userData, 'wa-deck-store.json');
  state.paths.crmDir = path.join(userData, 'crm-contacts');

  if (!fsSync.existsSync(userData)) {
    fsSync.mkdirSync(userData, { recursive: true });
  }
  if (!fsSync.existsSync(state.paths.crmDir)) {
    fsSync.mkdirSync(state.paths.crmDir, { recursive: true });
  }

  migrateLegacyStoreIfNeeded();
}

function legacyUserDataCandidates(currentUserData) {
  const appData = app.getPath('appData');
  const normalizedCurrent = path.resolve(currentUserData);
  const candidates = new Set();

  const knownNames = ['WA Deck', 'wa-deck', 'WA-Deck', 'wa_deck', 'wadeck', 'wa deck'];
  for (const name of knownNames) {
    const candidate = path.join(appData, name);
    if (path.resolve(candidate) !== normalizedCurrent) {
      candidates.add(candidate);
    }
  }

  try {
    const entries = fsSync.readdirSync(appData, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!/wa|deck/i.test(entry.name)) continue;
      const candidate = path.join(appData, entry.name);
      if (path.resolve(candidate) !== normalizedCurrent) {
        candidates.add(candidate);
      }
    }
  } catch {
    // ignore scan errors
  }

  return Array.from(candidates).filter((candidate) => fsSync.existsSync(candidate));
}

function migrateLegacyStoreIfNeeded() {
  if (fsSync.existsSync(state.paths.storePath)) {
    return;
  }

  const candidates = legacyUserDataCandidates(state.paths.userData);
  let best = null;

  for (const candidateDir of candidates) {
    const candidateStore = path.join(candidateDir, 'wa-deck-store.json');
    if (!fsSync.existsSync(candidateStore)) continue;
    try {
      const stat = fsSync.statSync(candidateStore);
      const mtimeMs = Number(stat.mtimeMs || 0);
      if (!best || mtimeMs > best.mtimeMs) {
        best = {
          dir: candidateDir,
          storePath: candidateStore,
          mtimeMs,
        };
      }
    } catch {
      // ignore stat errors
    }
  }

  if (!best) {
    return;
  }

  try {
    fsSync.copyFileSync(best.storePath, state.paths.storePath);

    const legacyCrmDir = path.join(best.dir, 'crm-contacts');
    const targetCrmEmpty =
      !fsSync.existsSync(state.paths.crmDir) ||
      (() => {
        try {
          return fsSync.readdirSync(state.paths.crmDir).length === 0;
        } catch {
          return true;
        }
      })();
    if (fsSync.existsSync(legacyCrmDir) && targetCrmEmpty) {
      fsSync.cpSync(legacyCrmDir, state.paths.crmDir, { recursive: true });
    }
  } catch {
    // ignore migration errors
  }
}

function pickColor(index) {
  return COLOR_PALETTE[Math.abs(index) % COLOR_PALETTE.length];
}

function sanitizeStore(raw) {
  const clean = {
    accounts: Array.isArray(raw?.accounts) ? raw.accounts : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(raw?.settings || {}),
    },
    templates: Array.isArray(raw?.templates) ? raw.templates : [],
    scheduled: Array.isArray(raw?.scheduled) ? raw.scheduled : [],
  };

  clean.settings.uiTheme = String(clean.settings.uiTheme || 'dark').toLowerCase() === 'light' ? 'light' : 'dark';
  clean.settings.lastSeenReleaseNotesVersion = String(
    clean.settings.lastSeenReleaseNotesVersion || DEFAULT_SETTINGS.lastSeenReleaseNotesVersion,
  ).trim();
  clean.settings.weatherCity = String(clean.settings.weatherCity || DEFAULT_SETTINGS.weatherCity).trim() || DEFAULT_SETTINGS.weatherCity;
  clean.settings.weatherUnit = normalizeWeatherUnit(clean.settings.weatherUnit);

  clean.accounts = clean.accounts
    .map((item, index) => ({
      id: String(item?.id || `wa_${Date.now()}_${index}`),
      type: item?.type === 'telegram' ? 'telegram' : 'whatsapp',
      name: String(item?.name || `WP_${index + 1}`),
      color: String(item?.color || pickColor(index + 1)),
      iconPath: String(item?.iconPath || '').trim(),
      frozen: Boolean(item?.frozen),
      order: Math.max(1, Number(item?.order) || index + 1),
      createdAt: String(item?.createdAt || new Date().toISOString()),
    }))
    .sort((a, b) => {
      const orderDiff = Number(a.order || 0) - Number(b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    })
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));

  clean.templates = clean.templates
    .map((item, index) => {
      const text = String(item?.text || '').replace(/\r/g, '');
      const title = String(item?.title || '').trim();
      const createdAt = String(item?.createdAt || new Date().toISOString());
      const updatedAt = String(item?.updatedAt || createdAt);
      return {
        id: String(item?.id || `tpl_${Date.now()}_${index}_${crypto.randomBytes(2).toString('hex')}`),
        title: title || `Шаблон ${index + 1}`,
        text,
        createdAt,
        updatedAt,
      };
    })
    .filter((item) => String(item.text || '').trim() || String(item.title || '').trim())
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  clean.scheduled = clean.scheduled
    .map((item) => ({
      id: String(item?.id || ''),
      accountId: String(item?.accountId || ''),
      chatName: String(item?.chatName || '').trim(),
      text: String(item?.text || ''),
      attachments: Array.isArray(item?.attachments)
        ? item.attachments
            .map((att) => ({
              path: String(att?.path || ''),
              name: String(att?.name || path.basename(String(att?.path || ''))),
            }))
            .filter((att) => att.path)
        : [],
      sendAt: String(item?.sendAt || ''),
      status: ['pending', 'processing', 'sent', 'failed', 'canceled'].includes(String(item?.status || ''))
        ? String(item.status)
        : 'pending',
      createdAt: String(item?.createdAt || new Date().toISOString()),
      updatedAt: String(item?.updatedAt || new Date().toISOString()),
      errorText: String(item?.errorText || ''),
    }))
    .filter((item) => item.id && item.accountId && item.chatName && item.sendAt);

  return clean;
}

async function loadStore() {
  try {
    if (!fsSync.existsSync(state.paths.storePath)) {
      state.store = sanitizeStore(null);
      return;
    }

    const content = await fs.readFile(state.paths.storePath, 'utf8');
    const parsed = JSON.parse(content);
    state.store = sanitizeStore(parsed);
  } catch {
    state.store = sanitizeStore(null);
  }
}

/* Recover scheduled messages stuck in 'processing' (e.g. after crash) */
function recoverStaleProcessingItems() {
  let recovered = 0;
  for (const item of state.store.scheduled) {
    if (item.status === 'processing') {
      item.status = 'pending';
      item.updatedAt = new Date().toISOString();
      recovered += 1;
    }
  }
  if (recovered > 0) {
    console.log(`[scheduled] recovered ${recovered} stuck item(s) back to pending`);
    saveStore().catch(() => {});
  }
}

/* Write queue prevents concurrent fs.writeFile calls that can corrupt the store */
let _saveStoreQueue = Promise.resolve();

async function saveStore() {
  _saveStoreQueue = _saveStoreQueue.then(async () => {
    const payload = JSON.stringify(state.store, null, 2);
    const tmpPath = state.paths.storePath + '.tmp';
    await fs.writeFile(tmpPath, payload, 'utf8');
    await fs.rename(tmpPath, state.paths.storePath);
  }).catch((err) => {
    console.error('[saveStore] write failed:', err);
  });
  return _saveStoreQueue;
}

function nextWpIndex() {
  let max = 0;
  for (const account of state.store.accounts) {
    const match = String(account.name).match(/^WP_(\d+)$/i);
    if (match) {
      max = Math.max(max, Number(match[1] || 0));
    }
  }
  return max + 1;
}

function nextTgIndex() {
  let max = 0;
  for (const account of state.store.accounts) {
    const match = String(account.name).match(/^TG_(\d+)$/i);
    if (match) {
      max = Math.max(max, Number(match[1] || 0));
    }
  }
  return max + 1;
}

function partitionForAccount(accountId, type) {
  const prefix = type === 'telegram' ? 'tg' : 'wa';
  return `persist:${prefix}_${accountId}`;
}

function sanitizeFsName(value, fallback = 'unknown') {
  const raw = String(value || '').trim();
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

function contactFileName(contactName) {
  const name = String(contactName || '').trim();
  const base = sanitizeFsName(name, 'contact');
  const hash = crypto.createHash('sha1').update(name || 'contact').digest('hex').slice(0, 8);
  return `${base}__${hash}.txt`;
}

function crmAccountDir(accountId) {
  return path.join(state.paths.crmDir, sanitizeFsName(accountId, 'account'));
}

function crmFilePath(accountId, contactName) {
  return path.join(crmAccountDir(accountId), contactFileName(contactName));
}

function normalizeCrmField(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

const CRM_BLOCKED_CONTACT_TITLES = new Set([
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

function normalizeCrmName(value) {
  return String(value || '')
    .replace(/\u200e|\u200f/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isBlockedCrmContactName(value) {
  const text = normalizeCrmName(value);
  if (!text) return true;
  if (CRM_BLOCKED_CONTACT_TITLES.has(text)) return true;
  if (/(сведени.*профил|информац.*профил|profile\s*info|contact\s*info|информац.*контакт|данные\s*контакта)/i.test(text)) return true;
  if (/^(online|в сети|typing|печатает|recording audio|записывает аудио|tap here|нажмите сюда)/i.test(text)) return true;
  if (/^(last seen|seen |был|была|был\(-а\)|был\(а\)|сегодня в|вчера в)/i.test(text)) return true;
  if (/^\d{1,2}:\d{2}$/.test(text)) return true;
  return false;
}

function formatCrmText(payload = {}) {
  const contactName = normalizeCrmField(payload.contactName);
  const accountName = normalizeCrmField(payload.accountName);
  const fullName = normalizeCrmField(payload.fullName);
  const countryCity = normalizeCrmField(payload.countryCity);
  const about = normalizeCrmField(payload.about);
  const myInfo = normalizeCrmField(payload.myInfo);

  return [
    `Контакт: ${contactName}`,
    `WhatsApp: ${accountName}`,
    '',
    `Имя фамилия: ${fullName}`,
    `Страна город: ${countryCity}`,
    '',
    'О нём:',
    about,
    '',
    'Моя информация:',
    myInfo,
    '',
  ].join('\n');
}

function parseCrmText(content = '') {
  const text = String(content || '').replace(/\r/g, '');

  const lineValue = (label) => {
    const re = new RegExp(`^${label}:\\s*(.*)$`, 'mi');
    const m = text.match(re);
    return m ? String(m[1] || '').trim() : '';
  };

  const blockValue = (startLabel, endLabel = '') => {
    const escapedStart = startLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEnd = endLabel ? endLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const re = endLabel
      ? new RegExp(`${escapedStart}:\\n([\\s\\S]*?)\\n${escapedEnd}:`, 'm')
      : new RegExp(`${escapedStart}:\\n([\\s\\S]*)$`, 'm');
    const m = text.match(re);
    return m ? String(m[1] || '').trim() : '';
  };

  return {
    contactName: lineValue('Контакт'),
    accountName: lineValue('WhatsApp'),
    fullName: lineValue('Имя фамилия'),
    countryCity: lineValue('Страна город'),
    about: blockValue('О нём', 'Моя информация'),
    myInfo: blockValue('Моя информация'),
  };
}

async function migrateLegacyCrmContactFile({
  accountId,
  accountName,
  targetContactName,
  targetFilePath,
}) {
  const dir = crmAccountDir(accountId);
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.txt')) continue;
    const sourcePath = path.join(dir, entry.name);
    if (sourcePath === targetFilePath) continue;

    let content = '';
    let stat = null;
    try {
      content = await fs.readFile(sourcePath, 'utf8');
      stat = await fs.stat(sourcePath);
    } catch {
      continue;
    }

    const parsed = parseCrmText(content);
    const sourceContact = String(parsed.contactName || '').trim();
    const sourceAccount = String(parsed.accountName || '').trim();
    if (!isBlockedCrmContactName(sourceContact)) continue;
    if (sourceAccount && accountName && sourceAccount !== accountName) continue;

    const payloadSize =
      String(parsed.fullName || '').trim().length +
      String(parsed.countryCity || '').trim().length +
      String(parsed.about || '').trim().length +
      String(parsed.myInfo || '').trim().length;

    candidates.push({
      sourcePath,
      parsed,
      score: payloadSize,
      mtime: stat ? Number(stat.mtimeMs || 0) : 0,
    });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  const best = candidates[0];
  const record = {
    contactName: targetContactName,
    accountName: accountName || String(best.parsed.accountName || '').trim(),
    fullName: String(best.parsed.fullName || '').trim(),
    countryCity: String(best.parsed.countryCity || '').trim(),
    about: String(best.parsed.about || '').trim(),
    myInfo: String(best.parsed.myInfo || '').trim(),
  };

  const text = formatCrmText(record);
  await fs.writeFile(targetFilePath, text, 'utf8');
  try {
    await fs.unlink(best.sourcePath);
  } catch {
    // ignore inability to remove legacy file
  }

  return {
    record,
    migratedFrom: best.sourcePath,
  };
}

async function loadCrmContact(accountId, accountName, contactName) {
  const safeAccountId = String(accountId || '').trim();
  const safeContactName = String(contactName || '').trim();
  const safeAccountName = String(accountName || '').trim();

  if (!safeAccountId) return { ok: false, error: 'account_required' };
  if (!safeContactName) return { ok: false, error: 'contact_required' };

  const account = state.store.accounts.find((row) => row.id === safeAccountId);
  if (!account) return { ok: false, error: 'account_not_found' };

  const dir = crmAccountDir(safeAccountId);
  const filePath = crmFilePath(safeAccountId, safeContactName);
  await fs.mkdir(dir, { recursive: true });

  let record = {
    contactName: safeContactName,
    accountName: safeAccountName || account.name,
    fullName: '',
    countryCity: '',
    about: '',
    myInfo: '',
  };
  let exists = false;
  let migrated = false;
  let migratedFrom = '';

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseCrmText(content);
    record = {
      ...record,
      ...parsed,
      contactName: parsed.contactName || safeContactName,
      accountName: parsed.accountName || safeAccountName || account.name,
    };
    exists = true;
  } catch {
    const migratedResult = await migrateLegacyCrmContactFile({
      accountId: safeAccountId,
      accountName: safeAccountName || account.name,
      targetContactName: safeContactName,
      targetFilePath: filePath,
    });

    if (migratedResult?.record) {
      record = {
        ...record,
        ...migratedResult.record,
        contactName: safeContactName,
        accountName: String(migratedResult.record.accountName || safeAccountName || account.name),
      };
      exists = true;
      migrated = true;
      migratedFrom = String(migratedResult.migratedFrom || '');
    } else {
      exists = false;
    }
  }

  return { ok: true, record, exists, filePath, migrated, migratedFrom };
}

async function saveCrmContact(payload = {}) {
  const safeAccountId = String(payload.accountId || '').trim();
  const safeContactName = String(payload.contactName || '').trim();
  const safeAccountName = String(payload.accountName || '').trim();
  if (!safeAccountId) return { ok: false, error: 'account_required' };
  if (!safeContactName) return { ok: false, error: 'contact_required' };

  const account = state.store.accounts.find((row) => row.id === safeAccountId);
  if (!account) return { ok: false, error: 'account_not_found' };

  const dir = crmAccountDir(safeAccountId);
  const filePath = crmFilePath(safeAccountId, safeContactName);
  await fs.mkdir(dir, { recursive: true });

  const record = {
    contactName: safeContactName,
    accountName: safeAccountName || account.name,
    fullName: String(payload.fullName || ''),
    countryCity: String(payload.countryCity || ''),
    about: String(payload.about || ''),
    myInfo: String(payload.myInfo || ''),
  };

  const text = formatCrmText(record);
  await fs.writeFile(filePath, text, 'utf8');

  return { ok: true, record, filePath, text };
}

function ensureDefaultAccount() {
  if (state.store.accounts.length) return;
  const idx = 1;
  state.store.accounts.push({
    id: `wa_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    name: `WP_${idx}`,
    color: pickColor(idx),
    iconPath: '',
    frozen: false,
    order: 1,
    createdAt: new Date().toISOString(),
  });
}

function normalizeAccountOrder() {
  state.store.accounts = state.store.accounts
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((account, index) => ({
      ...account,
      order: index + 1,
    }));
}

function accountToView(account = {}) {
  const iconPath = String(account.iconPath || '').trim();
  let iconUrl = '';
  if (iconPath && fsSync.existsSync(iconPath)) {
    try {
      iconUrl = pathToFileURL(iconPath).href;
    } catch {
      iconUrl = '';
    }
  }
  return {
    ...account,
    iconPath,
    iconUrl,
  };
}

function accountToRuntimePayload(account = {}) {
  const type = account.type || 'whatsapp';
  return {
    ...accountToView(account),
    type,
    partition: partitionForAccount(account.id, type),
    url: type === 'telegram' ? 'https://web.telegram.org/a/' : 'https://web.whatsapp.com/',
  };
}

async function renameAccount(accountId, name) {
  const id = String(accountId || '').trim();
  const nextName = String(name || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };
  if (!nextName) return { ok: false, error: 'name_required' };

  const account = state.store.accounts.find((acc) => acc.id === id);
  if (!account) return { ok: false, error: 'account_not_found' };

  account.name = nextName.slice(0, 60);
  await saveStore();
  return { ok: true, account: accountToView(account) };
}

async function setAccountFrozen(accountId, frozen) {
  const id = String(accountId || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };
  const account = state.store.accounts.find((acc) => acc.id === id);
  if (!account) return { ok: false, error: 'account_not_found' };

  account.frozen = Boolean(frozen);
  await saveStore();
  return { ok: true, account: accountToView(account) };
}

async function setAccountIcon(accountId, iconPath) {
  const id = String(accountId || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };
  const account = state.store.accounts.find((acc) => acc.id === id);
  if (!account) return { ok: false, error: 'account_not_found' };

  const nextPath = String(iconPath || '').trim();
  if (!nextPath) {
    account.iconPath = '';
    await saveStore();
    return { ok: true, account: accountToView(account) };
  }

  if (!fsSync.existsSync(nextPath)) {
    return { ok: false, error: 'icon_not_found' };
  }
  const ext = String(path.extname(nextPath) || '').toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    return { ok: false, error: 'icon_invalid_type' };
  }

  account.iconPath = nextPath;
  await saveStore();
  return { ok: true, account: accountToView(account) };
}

async function moveAccount(accountId, direction) {
  const id = String(accountId || '').trim();
  const dir = String(direction || '').toLowerCase();
  if (!id) return { ok: false, error: 'account_not_found' };
  if (!['up', 'down'].includes(dir)) return { ok: false, error: 'invalid_direction' };

  normalizeAccountOrder();
  const idx = state.store.accounts.findIndex((acc) => acc.id === id);
  if (idx < 0) return { ok: false, error: 'account_not_found' };

  const swapWith = dir === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= state.store.accounts.length) {
    return { ok: true, accounts: state.store.accounts.map((acc) => accountToRuntimePayload(acc)) };
  }

  const currentOrder = Number(state.store.accounts[idx].order || idx + 1);
  state.store.accounts[idx].order = Number(state.store.accounts[swapWith].order || swapWith + 1);
  state.store.accounts[swapWith].order = currentOrder;
  normalizeAccountOrder();
  await saveStore();
  return { ok: true, accounts: state.store.accounts.map((acc) => accountToRuntimePayload(acc)) };
}

async function removeAccount(accountId) {
  const id = String(accountId || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };

  const idx = state.store.accounts.findIndex((acc) => acc.id === id);
  if (idx < 0) return { ok: false, error: 'account_not_found' };

  const removedType = state.store.accounts[idx].type || 'whatsapp';
  state.store.accounts.splice(idx, 1);
  normalizeAccountOrder();
  state.store.scheduled = state.store.scheduled.filter((item) => item.accountId !== id);
  await saveStore();

  try {
    const partition = partitionForAccount(id, removedType);
    const partitionSession = session.fromPartition(partition);
    await partitionSession.clearStorageData();
    await partitionSession.clearCache();
  } catch {
    // ignore storage cleanup failures
  }

  const nextActiveAccountId = state.store.accounts[0]?.id || '';
  return {
    ok: true,
    removedAccountId: id,
    nextActiveAccountId,
  };
}

function buildBootstrap() {
  normalizeAccountOrder();
  return {
    accounts: state.store.accounts.map((acc) => accountToRuntimePayload(acc)),
    settings: { ...state.store.settings },
    templates: state.store.templates.map((tpl) => ({ ...tpl })),
    appVersion: app.getVersion(),
    runtime: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: process.platform,
      waUserAgent: WA_USER_AGENT,
    },
  };
}

function guessMime(filePath) {
  const ext = String(path.extname(filePath) || '').toLowerCase();
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic') return 'image/heic';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.xls') return 'application/vnd.ms-excel';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.zip') return 'application/zip';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.opus') return 'audio/opus';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.weba') return 'audio/webm';
  return 'application/octet-stream';
}

const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024; // 100 MB
async function loadAttachmentPayload(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_ATTACHMENT_SIZE) {
    throw new Error(`file_too_large: ${path.basename(filePath)} (${Math.round(stat.size / 1024 / 1024)} MB > 100 MB)`);
  }
  const buff = await fs.readFile(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    mime: guessMime(filePath),
    dataBase64: buff.toString('base64'),
  };
}

async function claimDueScheduled(limit = 5) {
  const now = Date.now();
  const due = state.store.scheduled
    .filter((item) => item.status === 'pending' && new Date(item.sendAt).getTime() <= now)
    .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 5)));

  if (!due.length) return [];

  for (const item of due) {
    item.status = 'processing';
    item.updatedAt = new Date().toISOString();
  }
  await saveStore();

  const out = [];
  for (const item of due) {
    const attachments = [];
    for (const att of item.attachments) {
      try {
        attachments.push(await loadAttachmentPayload(att.path));
      } catch {
        // пропускаем нечитабельные файлы, отправка текста все равно возможна
      }
    }

    out.push({
      ...item,
      attachments,
    });
  }

  return out;
}

async function markScheduledResult(payload = {}) {
  const id = String(payload.id || '');
  const item = state.store.scheduled.find((row) => row.id === id);
  if (!item) return { ok: false, error: 'not_found' };

  const ok = Boolean(payload.ok);
  item.status = ok ? 'sent' : 'failed';
  item.errorText = ok ? '' : String(payload.errorText || 'send_failed');
  item.updatedAt = new Date().toISOString();
  await saveStore();
  return { ok: true };
}

async function cancelScheduled(id) {
  const item = state.store.scheduled.find((row) => row.id === id);
  if (!item) return { ok: false, error: 'not_found' };
  if (!['pending', 'processing', 'failed'].includes(item.status)) return { ok: false, error: 'invalid_status' };
  item.status = 'canceled';
  item.updatedAt = new Date().toISOString();
  await saveStore();
  return { ok: true };
}

/* Security: only allow http/https URLs in shell.openExternal */
function safeOpenExternal(url) {
  const str = String(url || '').trim();
  if (/^https?:\/\//i.test(str)) {
    shell.openExternal(str).catch(() => {});
  }
}

function addSingleInstanceGuard() {
  const lock = app.requestSingleInstanceLock();
  if (!lock) {
    app.quit();
    return false;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 980,
    minWidth: 1220,
    minHeight: 760,
    title: APP_TITLE,
    icon: fsSync.existsSync(APP_ICON_PNG_PATH) ? APP_ICON_PNG_PATH : undefined,
    backgroundColor: '#080f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (String(input?.type || '').toLowerCase() !== 'keydown') return;
    if (String(input?.key || '') !== 'Escape') return;
    event.preventDefault();
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('host-escape-pressed');
      }
    } catch {
      // ignore channel send errors
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // On macOS in dev mode (not packaged), set dock icon from PNG.
  // In production, the .icns in the app bundle is used automatically.
  if (process.platform === 'darwin' && !app.isPackaged && fsSync.existsSync(APP_ICON_PNG_PATH)) {
    try {
      app.dock?.setIcon(APP_ICON_PNG_PATH);
    } catch {
      // ignore icon set errors
    }
  }
}

function setupWebviewGuards() {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return;

    // Determine webview type from partition (persist:tg_* = Telegram, persist:wa_* = WhatsApp)
    const isTelegram = () => {
      try {
        const partition = contents.session?.getStoragePath?.() || '';
        if (partition.includes('/tg_')) return true;
        // Fallback: check current URL
        const url = contents.getURL() || '';
        return url.includes('web.telegram.org');
      } catch { return false; }
    };

    // Only set WhatsApp user-agent for WhatsApp webviews
    if (!isTelegram()) {
      contents.setUserAgent(WA_USER_AGENT);
    }
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    contents.on('will-navigate', (event, url) => {
      const dest = String(url || '');
      if (isTelegram()) {
        if (!dest.startsWith('https://web.telegram.org')) {
          event.preventDefault();
        }
      } else {
        if (!dest.startsWith('https://web.whatsapp.com')) {
          event.preventDefault();
        }
      }
    });
    /* Webview crash recovery — notify renderer to show error and allow reload */
    contents.on('render-process-gone', (_event, details) => {
      console.error('[webview] render-process-gone:', details?.reason, 'exitCode:', details?.exitCode);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-crashed', {
          reason: String(details?.reason || 'unknown'),
          exitCode: details?.exitCode || 0,
        });
      }
    });

    contents.on('context-menu', (_event, params) => {
      const template = [];
      const selectionText = String(params?.selectionText || '').trim();
      const linkURL = String(params?.linkURL || '').trim();
      const srcURL = String(params?.srcURL || '').trim();
      const mediaType = String(params?.mediaType || '').trim().toLowerCase();

      if (selectionText) {
        template.push({ role: 'copy', label: 'Копировать' });
      }

      if (params?.isEditable) {
        template.push(
          { role: 'undo', label: 'Отменить' },
          { role: 'redo', label: 'Повторить' },
          { type: 'separator' },
          { role: 'cut', label: 'Вырезать' },
          { role: 'copy', label: 'Копировать' },
          { role: 'paste', label: 'Вставить' },
          { role: 'selectAll', label: 'Выделить всё' },
        );
      }

      if (mediaType === 'image') {
        template.push({
          label: 'Копировать изображение',
          click: () => {
            try {
              contents.copyImageAt(params.x, params.y);
            } catch {
              // ignore copy image errors
            }
          },
        });

        if (srcURL && !srcURL.startsWith('blob:') && !srcURL.startsWith('data:')) {
          template.push({
            label: 'Открыть изображение',
            click: () => safeOpenExternal(srcURL),
          });
        }
      }

      if (linkURL) {
        template.push(
          {
            label: 'Открыть ссылку',
            click: () => safeOpenExternal(linkURL),
          },
          {
            label: 'Копировать ссылку',
            click: () => clipboard.writeText(linkURL),
          },
        );
      }

      if (!template.length) {
        template.push({ role: 'copy', label: 'Копировать' });
      }

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: BrowserWindow.fromWebContents(contents.hostWebContents || contents) || mainWindow });
    });
  });
}

function sendAutoUpdateStatus(payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('auto-update-status', payload);
}

function normalizeUpdaterErrorMessage(error) {
  const raw = String(error?.message || error || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return 'Проверка обновлений временно недоступна';
  if (lower.includes('zip file not provided') || lower.includes('zip not provided')) {
    return 'В релизе отсутствует ZIP для автообновления macOS';
  }
  if (lower.includes('releases.atom') || lower.includes('404') || lower.includes('not found')) {
    return 'Обновления не найдены в GitHub Releases';
  }
  if (lower.includes('net::') || lower.includes('network') || lower.includes('econn') || lower.includes('timeout')) {
    return 'Ошибка сети при проверке обновлений';
  }
  if (lower.includes('token') || lower.includes('authentication') || lower.includes('unauthorized')) {
    return 'Ошибка доступа к GitHub Releases';
  }
  return 'Не удалось проверить обновления';
}

function hasMacDeveloperIdSignature() {
  if (process.platform !== 'darwin') return true;
  if (macDeveloperIdSignatureCache !== null) return macDeveloperIdSignatureCache;

  try {
    const result = spawnSync('/usr/bin/codesign', ['-dv', '--verbose=2', process.execPath], {
      encoding: 'utf8',
      timeout: 5000,
    });
    const output = `${String(result.stdout || '')}\n${String(result.stderr || '')}`;
    const hasDeveloperId = /Authority=Developer ID Application:/i.test(output);
    macDeveloperIdSignatureCache = hasDeveloperId;
    return hasDeveloperId;
  } catch {
    macDeveloperIdSignatureCache = false;
    return false;
  }
}

async function checkForUpdatesNow(source = 'manual') {
  if (!app.isPackaged) {
    return { ok: false, error: 'not_packaged', source };
  }
  if (process.platform === 'darwin' && !hasMacDeveloperIdSignature()) {
    const message = 'Для macOS эта сборка без Developer ID. Обновите вручную через Releases.';
    sendAutoUpdateStatus({ status: 'error', source, message });
    if (String(source || '').startsWith('manual')) {
      safeOpenExternal(RELEASES_LATEST_URL);
    }
    return { ok: false, error: 'mac_signature_required', source, message };
  }
  try {
    lastUpdateProgressPercent = -1;
    await autoUpdater.checkForUpdates();
    return { ok: true, source };
  } catch (error) {
    const message = normalizeUpdaterErrorMessage(error);
    sendAutoUpdateStatus({ status: 'error', source, message });
    return { ok: false, source, error: message };
  }
}

function setupAutoUpdater() {
  if (autoUpdaterConfigured) {
    return;
  }
  autoUpdaterConfigured = true;

  if (!app.isPackaged) {
    sendAutoUpdateStatus({
      status: 'disabled',
      source: 'manual',
      message: 'Обновление доступно только в собранной версии',
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // NSIS differential patches can be flaky on some Windows setups and cause integrity errors.
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    sendAutoUpdateStatus({ status: 'checking', source: 'manual', message: 'Проверка обновлений...' });
  });

  autoUpdater.on('update-available', (info) => {
    sendAutoUpdateStatus({
      status: 'available',
      source: 'manual',
      version: String(info?.version || ''),
      message: `Найдена новая версия ${String(info?.version || '')}`,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendAutoUpdateStatus({
      status: 'not-available',
      source: 'manual',
      version: String(info?.version || app.getVersion()),
      message: `Актуальная версия ${String(info?.version || app.getVersion())}`,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.floor(Number(progress?.percent || 0));
    if (percent === lastUpdateProgressPercent) return;
    lastUpdateProgressPercent = percent;
    sendAutoUpdateStatus({
      status: 'downloading',
      source: 'manual',
      percent,
      transferred: Number(progress?.transferred || 0),
      total: Number(progress?.total || 0),
      message: `Загрузка обновления: ${percent}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    lastUpdateProgressPercent = -1;
    sendAutoUpdateStatus({
      status: 'downloaded',
      source: 'manual',
      version: String(info?.version || ''),
      message: `Обновление ${String(info?.version || '')} загружено`,
    });
  });

  autoUpdater.on('error', (error) => {
    lastUpdateProgressPercent = -1;
    sendAutoUpdateStatus({
      status: 'error',
      source: 'manual',
      message: normalizeUpdaterErrorMessage(error),
    });
  });
}

function nextTemplateTitle() {
  let max = 0;
  for (const template of state.store.templates) {
    const match = String(template.title || '').match(/^Шаблон\s+(\d+)$/i);
    if (match) {
      max = Math.max(max, Number(match[1] || 0));
    }
  }
  return `Шаблон ${max + 1}`;
}

async function saveTemplate(payload = {}) {
  const id = String(payload?.id || '').trim();
  const title = String(payload?.title || '').trim() || nextTemplateTitle();
  const text = String(payload?.text || '').replace(/\r/g, '');
  const category = String(payload?.category || '').trim().slice(0, 60);

  if (!text.trim()) {
    return { ok: false, error: 'template_text_required' };
  }

  if (id) {
    const existing = state.store.templates.find((tpl) => tpl.id === id);
    if (!existing) return { ok: false, error: 'template_not_found' };

    existing.title = title.slice(0, 120);
    existing.text = text;
    existing.category = category;
    existing.updatedAt = new Date().toISOString();
    await saveStore();
    return { ok: true, template: { ...existing }, templates: state.store.templates.map((tpl) => ({ ...tpl })) };
  }

  const template = {
    id: `tpl_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    title: title.slice(0, 120),
    text,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.store.templates.push(template);
  await saveStore();
  return { ok: true, template: { ...template }, templates: state.store.templates.map((tpl) => ({ ...tpl })) };
}

async function deleteTemplate(id) {
  const safeId = String(id || '').trim();
  if (!safeId) return { ok: false, error: 'template_not_found' };
  const before = state.store.templates.length;
  state.store.templates = state.store.templates.filter((tpl) => tpl.id !== safeId);
  if (state.store.templates.length === before) {
    return { ok: false, error: 'template_not_found' };
  }
  await saveStore();
  return { ok: true, templates: state.store.templates.map((tpl) => ({ ...tpl })) };
}

function registerIpc() {
  ipcMain.handle('bootstrap', async () => buildBootstrap());

  ipcMain.handle('add-account', async (_event, type) => {
    const accountType = (type === 'telegram') ? 'telegram' : 'whatsapp';
    const isTg = accountType === 'telegram';
    const idx = isTg ? nextTgIndex() : nextWpIndex();
    const prefix = isTg ? 'tg' : 'wa';
    const maxOrder = state.store.accounts.reduce((max, acc) => Math.max(max, Number(acc.order || 0)), 0);
    const account = {
      id: `${prefix}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      type: accountType,
      name: isTg ? `TG_${idx}` : `WP_${idx}`,
      color: pickColor(idx),
      iconPath: '',
      frozen: false,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    state.store.accounts.push(account);
    normalizeAccountOrder();
    await saveStore();

    return {
      ...accountToRuntimePayload(account),
    };
  });

  ipcMain.handle('remove-account', async (_event, accountId) => {
    return removeAccount(accountId);
  });

  ipcMain.handle('rename-account', async (_event, payload) => {
    return renameAccount(payload?.accountId, payload?.name);
  });

  ipcMain.handle('set-account-frozen', async (_event, payload) => {
    return setAccountFrozen(payload?.accountId, payload?.frozen);
  });

  ipcMain.handle('move-account', async (_event, payload) => {
    return moveAccount(payload?.accountId, payload?.direction);
  });

  ipcMain.handle('pick-account-icon', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите иконку WhatsApp',
      properties: ['openFile'],
      filters: [
        { name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) {
      return { canceled: true };
    }
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('set-account-icon', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') return { ok: false, error: 'invalid_payload' };
    return setAccountIcon(payload.accountId, payload.iconPath);
  });

  ipcMain.handle('set-account-color', async (_event, payload) => {
    const id = String(payload?.accountId || '').trim();
    const color = String(payload?.color || '').trim();
    if (!id || !color) return { ok: false, error: 'invalid_params' };
    const account = state.store.accounts.find((a) => a.id === id);
    if (!account) return { ok: false, error: 'account_not_found' };
    account.color = color;
    await saveStore();
    return { ok: true, account: accountToRuntimePayload(account) };
  });

  ipcMain.handle('save-settings', async (_event, payload) => {
    const current = state.store.settings || {};
    const next = {
      uiTheme: String(payload?.uiTheme ?? current.uiTheme ?? DEFAULT_SETTINGS.uiTheme).toLowerCase() === 'light' ? 'light' : 'dark',
      weatherCity: String(payload?.weatherCity ?? current.weatherCity ?? DEFAULT_SETTINGS.weatherCity).trim() || DEFAULT_SETTINGS.weatherCity,
      weatherUnit: normalizeWeatherUnit(payload?.weatherUnit ?? current.weatherUnit ?? DEFAULT_SETTINGS.weatherUnit),
      lastSeenReleaseNotesVersion: String(
        payload?.lastSeenReleaseNotesVersion ?? current.lastSeenReleaseNotesVersion ?? DEFAULT_SETTINGS.lastSeenReleaseNotesVersion,
      ).trim(),
      worldClocks: Array.isArray(payload?.worldClocks)
        ? payload.worldClocks
            .slice(0, 10)
            .map((c) => ({ label: String(c?.label || '').trim().slice(0, 30), tz: String(c?.tz || '').trim() }))
            .filter((c) => c.label && c.tz)
        : (current.worldClocks || DEFAULT_SETTINGS.worldClocks),
    };

    state.store.settings = next;
    await saveStore();
    return { ...state.store.settings };
  });

  ipcMain.handle('crm-load-contact', async (_event, payload) => {
    return loadCrmContact(payload?.accountId, payload?.accountName, payload?.contactName);
  });

  ipcMain.handle('crm-save-contact', async (_event, payload) => {
    return saveCrmContact(payload || {});
  });

  ipcMain.handle('list-templates', async () => {
    return { ok: true, templates: state.store.templates.map((tpl) => ({ ...tpl })) };
  });

  ipcMain.handle('save-template', async (_event, payload) => {
    return saveTemplate(payload || {});
  });

  ipcMain.handle('delete-template', async (_event, id) => {
    return deleteTemplate(id);
  });

  ipcMain.handle('pick-attachments', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, files: [] };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите вложения',
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || !result.filePaths?.length) return { canceled: true, files: [] };

    return {
      canceled: false,
      files: result.filePaths.map((filePath) => ({
        path: filePath,
        name: path.basename(filePath),
      })),
    };
  });

  /* ── Pick audio file for voice message ── */
  const MAX_VOICE_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
  ipcMain.handle('pick-audio-file', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'no_window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите аудиофайл для голосового сообщения',
      properties: ['openFile'],
      filters: [
        { name: 'Audio', extensions: ['ogg', 'opus', 'mp3', 'wav', 'm4a', 'aac', 'weba'] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return { canceled: true };
    const filePath = result.filePaths[0];
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_VOICE_FILE_SIZE) {
        return { ok: false, error: 'file_too_large' };
      }
      const buff = await fs.readFile(filePath);
      return {
        ok: true,
        name: path.basename(filePath),
        size: stat.size,
        dataBase64: buff.toString('base64'),
        mime: guessMime(filePath),
      };
    } catch (err) {
      console.error('[pick-audio-file]', err);
      return { ok: false, error: 'read_failed' };
    }
  });

  ipcMain.handle('schedule-message', async (_event, payload) => {
    const accountId = String(payload?.accountId || '');
    const chatName = String(payload?.chatName || '').trim();
    const text = String(payload?.text || '');
    const sendAt = String(payload?.sendAt || '');
    const parsedDate = new Date(sendAt);
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments
          .map((att) => ({
            path: String(att?.path || ''),
            name: String(att?.name || path.basename(String(att?.path || ''))),
          }))
          .filter((att) => att.path)
      : [];

    if (!state.store.accounts.find((acc) => acc.id === accountId)) {
      return { ok: false, error: 'account_not_found' };
    }
    if (!chatName) return { ok: false, error: 'chat_required' };
    if (!text.trim() && !attachments.length) return { ok: false, error: 'text_or_attachment_required' };
    if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: 'invalid_sendAt' };
    if (parsedDate.getTime() < Date.now() + 3000) return { ok: false, error: 'sendAt_in_past' };

    const item = {
      id: `sched_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      accountId,
      chatName,
      text,
      attachments,
      sendAt: parsedDate.toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      errorText: '',
    };

    state.store.scheduled.push(item);
    await saveStore();
    return { ok: true, item };
  });

  ipcMain.handle('list-scheduled', async (_event, payload) => {
    const accountId = String(payload?.accountId || '').trim();
    const limit = Math.max(1, Math.min(300, Number(payload?.limit) || 100));

    let items = state.store.scheduled;
    if (accountId) {
      items = items.filter((item) => item.accountId === accountId);
    }

    items = items
      .filter((item) => ['pending', 'processing', 'failed'].includes(item.status))
      .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())
      .slice(0, limit);

    return { ok: true, items };
  });

  ipcMain.handle('claim-due-scheduled', async (_event, payload) => {
    const items = await claimDueScheduled(Number(payload?.limit) || 5);
    return { ok: true, items };
  });

  ipcMain.handle('complete-scheduled', async (_event, payload) => {
    return markScheduledResult(payload || {});
  });

  ipcMain.handle('cancel-scheduled', async (_event, id) => {
    return cancelScheduled(String(id || ''));
  });

  ipcMain.handle('open-data-dir', async () => {
    await shell.openPath(state.paths.userData);
    return { ok: true };
  });

  ipcMain.handle('get-clipboard-text', async () => {
    return { ok: true, text: clipboard.readText() };
  });

  ipcMain.handle('set-clipboard-text', async (_event, text) => {
    clipboard.writeText(String(text || ''));
    return { ok: true };
  });

  ipcMain.handle('set-dock-badge', async (_event, payload) => {
    return setDockBadge(payload?.count);
  });

  ipcMain.handle('check-for-updates', async (_event, payload) => {
    return checkForUpdatesNow(String(payload?.source || 'manual'));
  });

  ipcMain.handle('install-downloaded-update', async () => {
    if (!app.isPackaged) {
      return { ok: false, error: 'not_packaged' };
    }
    try {
      setImmediate(() => autoUpdater.quitAndInstall());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error || 'install_failed') };
    }
  });
}

async function bootstrap() {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
  }
  ensurePaths();
  await loadStore();
  recoverStaleProcessingItems();
  ensureDefaultAccount();
  await saveStore();

  setupWebviewGuards();
  registerIpc();
  createWindow();
  setupAutoUpdater();
}

// Note: disable-renderer-backgrounding removed for performance (30 processes = extreme CPU).
// Scheduled sends use targeted webview.reload() wake-up when needed (schedule.js).

/* Global error handlers — prevent silent crashes and data loss */
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED] promise rejection:', reason);
});

if (addSingleInstanceGuard()) {
  app.whenReady().then(bootstrap).catch((error) => {
    console.error('[bootstrap]', error);
    app.quit();
  });

  /* Flush pending store writes before exit */
  app.on('before-quit', async (event) => {
    if (app._quitting) return;
    app._quitting = true;
    event.preventDefault();
    try {
      await _saveStoreQueue;
    } catch (err) {
      console.error('[before-quit] save flush failed:', err);
    }
    app.exit(0);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
