const { app, BrowserWindow, dialog, ipcMain, shell, clipboard, session } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const crypto = require('crypto');

const APP_ID = 'com.local.wadeck.v2';
const APP_TITLE = 'WA Deck';
const FALLBACK_CHROME_VERSION = '136.0.0.0';
const APP_ICON_PNG_PATH = path.join(__dirname, '..', 'assets', 'icon', 'wadeck-icon-512.png');
const DEEPL_FREE_API_URL = 'https://api-free.deepl.com/v2/translate';
const LIBRETRANSLATE_DEFAULT_URL = 'https://libretranslate.com/translate';
const AIMLAPI_CHAT_COMPLETIONS_URL = 'https://api.aimlapi.com/v1/chat/completions';
const AIMLAPI_MODELS_URL = 'https://api.aimlapi.com/models';
const DEFAULT_AI_MODEL = 'google/gemma-3-4b-it';
const AIML_MODELS_CACHE_TTL_MS = 10 * 60 * 1000;

const DEFAULT_SETTINGS = {
  uiTheme: 'dark',
  translateProvider: 'deepl',
  deeplApiKey: '',
  libreTranslateApiKey: '',
  libreTranslateUrl: LIBRETRANSLATE_DEFAULT_URL,
  aiApiKey: '',
  aiModel: DEFAULT_AI_MODEL,
  aiRolePrompt:
    'Ты помощник в переписке WhatsApp. Пиши короткий, естественный и вежливый вариант ответа по контексту сообщения. Без лишних объяснений.',
};

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
let aiModelsCache = {
  at: 0,
  models: [],
};

function setDockBadge(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  if (process.platform === 'darwin') {
    const badge = safeCount > 0 ? String(safeCount) : '';
    try {
      app.dock?.setBadge(badge);
    } catch {
      // ignore dock badge errors
    }
    try {
      app.setBadgeCount(safeCount);
    } catch {
      // ignore badge count errors
    }
    return { ok: true, count: safeCount };
  }
  try {
    app.setBadgeCount(safeCount);
  } catch {
    // ignore badge count errors
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

  // миграция: перенос legacy ключей во второй переводчик (LibreTranslate)
  const legacyGoogleKey = String(clean.settings.googleApiKey || '').trim();
  if (!clean.settings.libreTranslateApiKey && legacyGoogleKey) {
    clean.settings.libreTranslateApiKey = legacyGoogleKey;
  }
  const legacyGoogleTranslateApiKey = String(clean.settings.googleTranslateApiKey || '').trim();
  if (!clean.settings.libreTranslateApiKey && legacyGoogleTranslateApiKey) {
    clean.settings.libreTranslateApiKey = legacyGoogleTranslateApiKey;
  }
  clean.settings.translateProvider =
    ['deepl', 'libre'].includes(String(clean.settings.translateProvider || '').toLowerCase())
      ? String(clean.settings.translateProvider || '').toLowerCase()
      : 'deepl';
  clean.settings.uiTheme = String(clean.settings.uiTheme || 'dark').toLowerCase() === 'light' ? 'light' : 'dark';
  clean.settings.deeplApiKey = String(clean.settings.deeplApiKey || '').trim();
  clean.settings.libreTranslateApiKey = String(clean.settings.libreTranslateApiKey || '').trim();
  clean.settings.libreTranslateUrl = normalizeLibreTranslateUrl(clean.settings.libreTranslateUrl);
  clean.settings.aiApiKey = String(clean.settings.aiApiKey || '').trim();
  clean.settings.aiModel = String(clean.settings.aiModel || DEFAULT_AI_MODEL).trim() || DEFAULT_AI_MODEL;
  clean.settings.aiRolePrompt = String(clean.settings.aiRolePrompt || DEFAULT_SETTINGS.aiRolePrompt).trim();

  clean.accounts = clean.accounts
    .map((item, index) => ({
      id: String(item?.id || `wa_${Date.now()}_${index}`),
      name: String(item?.name || `WP_${index + 1}`),
      color: String(item?.color || pickColor(index + 1)),
      frozen: Boolean(item?.frozen),
      createdAt: String(item?.createdAt || new Date().toISOString()),
    }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

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

async function saveStore() {
  const payload = JSON.stringify(state.store, null, 2);
  await fs.writeFile(state.paths.storePath, payload, 'utf8');
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

function partitionForAccount(accountId) {
  return `persist:wa_${accountId}`;
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
    frozen: false,
    createdAt: new Date().toISOString(),
  });
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
  return { ok: true, account };
}

async function setAccountFrozen(accountId, frozen) {
  const id = String(accountId || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };
  const account = state.store.accounts.find((acc) => acc.id === id);
  if (!account) return { ok: false, error: 'account_not_found' };

  account.frozen = Boolean(frozen);
  await saveStore();
  return { ok: true, account };
}

async function removeAccount(accountId) {
  const id = String(accountId || '').trim();
  if (!id) return { ok: false, error: 'account_not_found' };

  const idx = state.store.accounts.findIndex((acc) => acc.id === id);
  if (idx < 0) return { ok: false, error: 'account_not_found' };

  state.store.accounts.splice(idx, 1);
  state.store.scheduled = state.store.scheduled.filter((item) => item.accountId !== id);
  await saveStore();

  try {
    const partition = partitionForAccount(id);
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
  return {
    accounts: state.store.accounts.map((acc) => ({
      ...acc,
      partition: partitionForAccount(acc.id),
      url: 'https://web.whatsapp.com/',
    })),
    settings: { ...state.store.settings },
    templates: state.store.templates.map((tpl) => ({ ...tpl })),
    appVersion: app.getVersion(),
    runtime: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
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
  return 'application/octet-stream';
}

async function loadAttachmentPayload(filePath) {
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

function mapDeepLError(status, data) {
  const full = String(data?.message || data?.detail || data?.error || '').trim() || `HTTP_${status}`;

  if (status === 403 || /auth|authorization|forbidden|key/i.test(full)) {
    return { errorCode: 'deepl_api_key_invalid', error: full };
  }
  if (status === 429 || /too many requests|rate/i.test(full)) {
    return { errorCode: 'deepl_rate_limited', error: full };
  }
  if (status === 456 || /quota|limit/i.test(full)) {
    return { errorCode: 'deepl_quota_exceeded', error: full };
  }
  if (status >= 500) {
    return { errorCode: 'deepl_server_error', error: full };
  }

  return { errorCode: 'deepl_api_request_failed', error: full };
}

function mapLibreTranslateError(status, data) {
  const full = String(data?.error || data?.message || '').trim() || `HTTP_${status}`;
  if (status === 401 || status === 403 || /api[_ -]?key|auth|forbidden|unauthorized/i.test(full)) {
    return { errorCode: 'libre_api_key_invalid', error: full };
  }
  if (status === 429 || /rate|too many requests/i.test(full)) {
    return { errorCode: 'libre_rate_limited', error: full };
  }
  if (status === 400 || /invalid|bad request|missing|required/i.test(full)) {
    return { errorCode: 'libre_bad_request', error: full };
  }
  if (status >= 500) {
    return { errorCode: 'libre_server_error', error: full };
  }
  return { errorCode: 'libre_api_request_failed', error: full };
}

const DEEPL_SOURCE_LANGS = new Set([
  'AUTO',
  'BG',
  'CS',
  'DA',
  'DE',
  'EL',
  'EN',
  'ES',
  'ET',
  'FI',
  'FR',
  'HU',
  'ID',
  'IT',
  'JA',
  'KO',
  'LT',
  'LV',
  'NB',
  'NL',
  'PL',
  'PT',
  'RO',
  'RU',
  'SK',
  'SL',
  'SV',
  'TR',
  'UK',
  'ZH',
]);

const DEEPL_TARGET_LANGS = new Set([
  'BG',
  'CS',
  'DA',
  'DE',
  'EL',
  'EN-GB',
  'EN-US',
  'ES',
  'ET',
  'FI',
  'FR',
  'HU',
  'ID',
  'IT',
  'JA',
  'KO',
  'LT',
  'LV',
  'NB',
  'NL',
  'PL',
  'PT-BR',
  'PT-PT',
  'RO',
  'RU',
  'SK',
  'SL',
  'SV',
  'TR',
  'UK',
  'ZH',
]);

async function translateViaDeepL(text, sourceLang = 'AUTO', targetLang = 'RU') {
  const apiKey = String(state.store.settings.deeplApiKey || '').trim();
  if (!apiKey) {
    return { ok: false, errorCode: 'deepl_api_key_required', error: 'deepl_api_key_required' };
  }

  const source = String(sourceLang || 'AUTO').toUpperCase();
  const target = String(targetLang || 'RU').toUpperCase();
  const safeSource = DEEPL_SOURCE_LANGS.has(source) ? source : 'AUTO';
  const safeTarget = DEEPL_TARGET_LANGS.has(target) ? target : 'RU';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const body = new URLSearchParams();
    body.append('text', String(text || ''));
    body.append('target_lang', safeTarget);
    if (safeSource !== 'AUTO') {
      body.append('source_lang', safeSource);
    }

    const response = await fetch(DEEPL_FREE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, ...mapDeepLError(response.status, data) };
    }

    const row = data?.translations?.[0];
    const translated = String(row?.text || '').trim();
    const detectedSourceLanguage = String(row?.detected_source_language || '').trim();

    if (!translated) {
      return { ok: false, errorCode: 'empty_translation', error: 'empty_translation' };
    }

    return {
      ok: true,
      translatedText: translated,
      detectedSourceLanguage,
      targetLanguage: safeTarget.toLowerCase(),
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, errorCode: 'deepl_api_timeout', error: 'deepl_api_timeout' };
    }
    return { ok: false, errorCode: 'deepl_api_network_error', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'libre' ? 'libre' : 'deepl';
}

function toLibreLangCode(value, fallback = 'ru') {
  const v = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (!v) return fallback;
  if (v === 'auto') return 'auto';
  if (v.startsWith('en-')) return 'en';
  if (v.startsWith('pt-')) return 'pt';
  if (v.startsWith('zh-')) return 'zh';
  return v;
}

function normalizeLibreTranslateUrl(value) {
  const raw = String(value || '').trim();
  const base = raw || LIBRETRANSLATE_DEFAULT_URL;
  try {
    const parsed = new URL(base);
    let pathname = parsed.pathname || '/';
    pathname = pathname.replace(/\/+$/, '');
    if (!pathname || pathname === '') {
      pathname = '/translate';
    } else if (!pathname.endsWith('/translate')) {
      pathname = `${pathname}/translate`;
    }
    parsed.pathname = pathname;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return LIBRETRANSLATE_DEFAULT_URL;
  }
}

async function translateViaLibreTranslate(text, sourceLang = 'AUTO', targetLang = 'RU') {
  const apiKey = String(state.store.settings.libreTranslateApiKey || '').trim();
  const endpoint = normalizeLibreTranslateUrl(state.store.settings.libreTranslateUrl);
  const source = toLibreLangCode(sourceLang, 'auto');
  const target = toLibreLangCode(targetLang, 'ru');
  const payload = {
    q: String(text || ''),
    source,
    target: target === 'auto' ? 'ru' : target,
    format: 'text',
  };
  if (apiKey) {
    payload.api_key = apiKey;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, ...mapLibreTranslateError(response.status, data) };
    }

    const translated = String(data?.translatedText || '').trim();
    const detectedSourceLanguage = String(data?.detectedLanguage?.language || source).trim();
    if (!translated) {
      return { ok: false, errorCode: 'empty_translation', error: 'empty_translation' };
    }

    return {
      ok: true,
      translatedText: translated,
      detectedSourceLanguage,
      targetLanguage: payload.target,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, errorCode: 'libre_api_timeout', error: 'libre_api_timeout' };
    }
    return { ok: false, errorCode: 'libre_api_network_error', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

async function translateByProvider(provider, text, sourceLang = 'AUTO', targetLang = 'RU') {
  const safeProvider = normalizeProvider(provider);
  if (safeProvider === 'libre') {
    return translateViaLibreTranslate(text, sourceLang, targetLang);
  }
  return translateViaDeepL(text, sourceLang, targetLang);
}

async function generateAiReply(messageText, rolePrompt = '', model = '', options = {}) {
  const apiKey = String(state.store.settings.aiApiKey || '').trim();
  if (!apiKey) {
    return { ok: false, errorCode: 'ai_api_key_required', error: 'ai_api_key_required' };
  }

  const text = String(messageText || '').trim();
  if (!text) {
    return { ok: false, errorCode: 'ai_message_required', error: 'ai_message_required' };
  }

  const role = String(rolePrompt || state.store.settings.aiRolePrompt || DEFAULT_SETTINGS.aiRolePrompt).trim();
  const selectedModel = String(model || state.store.settings.aiModel || DEFAULT_AI_MODEL).trim();
  if (!selectedModel) {
    return { ok: false, errorCode: 'ai_model_required', error: 'ai_model_required' };
  }
  const mode = ['short', 'warm', 'business', 'flirt'].includes(String(options?.mode || ''))
    ? String(options.mode)
    : 'warm';
  const contextMessages = Array.isArray(options?.contextMessages)
    ? options.contextMessages.map((line) => String(line || '').trim()).filter(Boolean).slice(-10)
    : [];
  const replyInSourceLang = options?.replyInSourceLang !== false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const modePromptMap = {
      short: 'Стиль ответа: очень коротко, 1-2 предложения, по сути.',
      warm: 'Стиль ответа: теплый, поддерживающий, естественный.',
      business: 'Стиль ответа: деловой, четкий, без лишних эмоций.',
      flirt: 'Стиль ответа: легкий флирт, уважительно, без пошлости.',
    };
    const contextBlock = contextMessages.length
      ? ['КОНТЕКСТ (последние входящие сообщения):', ...contextMessages.map((line, idx) => `${idx + 1}. ${line}`), ''].join('\n')
      : 'КОНТЕКСТ: нет\n';

    const userPrompt = [
      'Ты помощник для ответа в чате WhatsApp.',
      'Строго следуй роли ниже и отвечай только на основе сообщения.',
      'Не выдумывай факты и детали, которых нет в сообщении и контексте.',
      replyInSourceLang
        ? 'Отвечай на языке собеседника из исходного сообщения.'
        : 'Отвечай на русском языке.',
      modePromptMap[mode],
      'Если контекста недостаточно, верни один короткий уточняющий вопрос.',
      'Верни только текст ответа, без пояснений и без кавычек.',
      '',
      `РОЛЬ:\n${role}`,
      '',
      contextBlock,
      'СООБЩЕНИЕ ДЛЯ ОТВЕТА:',
      '<<<BEGIN_MESSAGE>>>',
      text,
      '<<<END_MESSAGE>>>',
    ].join('\n');

    const response = await fetch(AIMLAPI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiErr =
        String(data?.error?.code || '').trim() ||
        String(data?.error?.message || '').trim() ||
        `HTTP_${response.status}`;
      if (response.status === 401 || /invalid_api_key/i.test(apiErr)) {
        return { ok: false, errorCode: 'ai_api_key_invalid', error: apiErr };
      }
      if (response.status === 429) {
        return { ok: false, errorCode: 'ai_rate_limited', error: apiErr };
      }
      if (response.status === 400) {
        return { ok: false, errorCode: 'ai_bad_request', error: apiErr };
      }
      if (response.status >= 500) {
        return { ok: false, errorCode: 'ai_server_error', error: apiErr };
      }
      return { ok: false, errorCode: 'ai_api_request_failed', error: apiErr };
    }

    const reply = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!reply) {
      return { ok: false, errorCode: 'ai_empty_response', error: 'ai_empty_response' };
    }

    return {
      ok: true,
      replyText: reply,
      model: String(data?.model || selectedModel),
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, errorCode: 'ai_timeout', error: 'ai_timeout' };
    }
    return { ok: false, errorCode: 'ai_network_error', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

async function listAimlChatModels(force = false) {
  const now = Date.now();
  if (!force && aiModelsCache.models.length && now - aiModelsCache.at < AIML_MODELS_CACHE_TTL_MS) {
    return { ok: true, models: aiModelsCache.models };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const apiKey = String(state.store.settings.aiApiKey || '').trim();
    const headers = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(AIMLAPI_MODELS_URL, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, errorCode: 'aiml_models_http_error', error: String(data?.error || `HTTP_${response.status}`) };
    }

    const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    const models = rawList
      .filter((row) => String(row?.type || '').toLowerCase() === 'chat-completion')
      .filter((row) => {
        const hasEndpoint = Array.isArray(row?.endpoints) && row.endpoints.includes('/v1/chat/completions');
        const hasFeature = Array.isArray(row?.features) && row.features.includes('openai/chat-completion');
        return hasEndpoint || hasFeature;
      })
      .map((row) => String(row?.id || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (!models.length) {
      return { ok: false, errorCode: 'aiml_models_empty', error: 'Модели не найдены' };
    }

    aiModelsCache = {
      at: now,
      models,
    };

    return { ok: true, models };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, errorCode: 'aiml_models_timeout', error: 'Запрос списка моделей превысил время ожидания' };
    }
    return { ok: false, errorCode: 'aiml_models_fetch_failed', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
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
      webviewTag: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.platform === 'darwin' && fsSync.existsSync(APP_ICON_PNG_PATH)) {
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

    contents.setUserAgent(WA_USER_AGENT);
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event, url) => {
      if (!String(url || '').startsWith('https://web.whatsapp.com')) {
        event.preventDefault();
      }
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

  if (!text.trim()) {
    return { ok: false, error: 'template_text_required' };
  }

  if (id) {
    const existing = state.store.templates.find((tpl) => tpl.id === id);
    if (!existing) return { ok: false, error: 'template_not_found' };

    existing.title = title.slice(0, 120);
    existing.text = text;
    existing.updatedAt = new Date().toISOString();
    await saveStore();
    return { ok: true, template: { ...existing }, templates: state.store.templates.map((tpl) => ({ ...tpl })) };
  }

  const template = {
    id: `tpl_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    title: title.slice(0, 120),
    text,
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

  ipcMain.handle('add-account', async () => {
    const idx = nextWpIndex();
    const account = {
      id: `wa_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      name: `WP_${idx}`,
      color: pickColor(idx),
      frozen: false,
      createdAt: new Date().toISOString(),
    };

    state.store.accounts.push(account);
    await saveStore();

    return {
      ...account,
      partition: partitionForAccount(account.id),
      url: 'https://web.whatsapp.com/',
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

  ipcMain.handle('save-settings', async (_event, payload) => {
    const current = state.store.settings || {};
    const next = {
      uiTheme: String(payload?.uiTheme ?? current.uiTheme ?? DEFAULT_SETTINGS.uiTheme).toLowerCase() === 'light' ? 'light' : 'dark',
      translateProvider: normalizeProvider(payload?.translateProvider ?? current.translateProvider),
      deeplApiKey: String(payload?.deeplApiKey ?? current.deeplApiKey ?? '').trim(),
      libreTranslateApiKey: String(payload?.libreTranslateApiKey ?? payload?.googleApiKey ?? current.libreTranslateApiKey ?? '').trim(),
      libreTranslateUrl: normalizeLibreTranslateUrl(payload?.libreTranslateUrl ?? current.libreTranslateUrl),
      aiApiKey: String(payload?.aiApiKey ?? current.aiApiKey ?? '').trim(),
      aiModel: String(payload?.aiModel ?? current.aiModel ?? DEFAULT_AI_MODEL).trim() || DEFAULT_AI_MODEL,
      aiRolePrompt: String(payload?.aiRolePrompt ?? current.aiRolePrompt ?? DEFAULT_SETTINGS.aiRolePrompt).trim(),
    };

    state.store.settings = next;
    await saveStore();
    return { ...state.store.settings };
  });

  ipcMain.handle('translate-text', async (_event, payload) => {
    const text = String(payload?.text || '').trim();
    if (!text) return { ok: false, error: 'text_required' };
    const provider = normalizeProvider(payload?.provider || state.store.settings.translateProvider);
    const sourceLang = String(payload?.sourceLang || 'AUTO');
    const targetLang = String(payload?.targetLang || 'RU');
    return translateByProvider(provider, text, sourceLang, targetLang);
  });

  ipcMain.handle('test-translate-api', async (_event, payload) => {
    const provider = normalizeProvider(payload?.provider || state.store.settings.translateProvider);
    const probe = await translateByProvider(provider, 'Hello, this is a test message', 'AUTO', 'RU');
    if (!probe?.ok) return probe;
    return {
      ok: true,
      provider,
      translatedText: probe.translatedText,
      detectedSourceLanguage: probe.detectedSourceLanguage,
      targetLanguage: probe.targetLanguage,
    };
  });

  ipcMain.handle('generate-ai-reply', async (_event, payload) => {
    return generateAiReply(payload?.messageText, payload?.rolePrompt, payload?.model, {
      mode: payload?.mode,
      contextMessages: payload?.contextMessages,
      replyInSourceLang: payload?.replyInSourceLang,
    });
  });

  ipcMain.handle('crm-load-contact', async (_event, payload) => {
    return loadCrmContact(payload?.accountId, payload?.accountName, payload?.contactName);
  });

  ipcMain.handle('crm-save-contact', async (_event, payload) => {
    return saveCrmContact(payload || {});
  });

  ipcMain.handle('list-ai-models', async (_event, payload) => {
    const force = Boolean(payload?.force);
    return listAimlChatModels(force);
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
}

async function bootstrap() {
  ensurePaths();
  await loadStore();
  ensureDefaultAccount();
  await saveStore();

  setupWebviewGuards();
  registerIpc();
  createWindow();
}

if (addSingleInstanceGuard()) {
  app.whenReady().then(bootstrap).catch((error) => {
    console.error('[bootstrap]', error);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
