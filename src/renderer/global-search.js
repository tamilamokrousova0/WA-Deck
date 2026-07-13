/* Global contact search (Cmd/Ctrl+K) — "in which of my 30 accounts is the
 * chat with X?".
 *
 * Sources, from instant to slow:
 *   1. favorites / important (already in state) — appear immediately;
 *   2. per-account sidebar chat lists collected via collectChatsFromSidebarScript,
 *      swept sequentially in the background while the palette is open and
 *      cached for 10 minutes (the collector hijacks the sidebar scroll for a
 *      few seconds per account, so accounts are swept one at a time and the
 *      ACTIVE account is swept last to keep its visible scroll untouched
 *      while the user is looking at it).
 *
 * Enter / click switches to the account and opens the chat through
 * WaDeckScheduleModule.openChatInWebview (WhatsApp's own search box), so a
 * contact missing from a partially-collected list still opens fine — the
 * palette only needs a name to hand over.
 */
import { WADECK_WV_TOKEN } from './core/state.js';
import { setStatus } from './core/helpers.js';
import { setActiveAccount } from './core/accounts.js';
import { collectChatsFromSidebarScript } from './webview-scripts/collect-chats.js';

  let state = null;
  let isWebviewReady = null;
  let safeExecuteInWebview = null;

  const _cache = new Map(); // accountId → { t, chats: [name] }
  const CACHE_TTL_MS = 10 * 60000;
  let _sweepBusy = false;
  let _sweepDone = 0;
  let _sweepTotal = 0;
  let _open = false;
  let _selIndex = 0;
  let _lastResults = [];

  function init(ctx) {
    state = ctx.state;
    isWebviewReady = ctx.isWebviewReady;
    safeExecuteInWebview = ctx.safeExecuteInWebview;
  }

  const overlayEl = () => document.getElementById('global-search');
  const inputEl = () => document.getElementById('global-search-input');
  const listEl = () => document.getElementById('global-search-list');
  const statusEl = () => document.getElementById('global-search-status');

  function accountName(accountId) {
    return state?.accounts?.find((a) => a.id === accountId)?.name || accountId;
  }

  function waAccounts() {
    return (state?.accounts || []).filter((a) => a.type !== 'telegram' && !a.frozen);
  }

  /* ── Background sweep ── */

  async function sweep() {
    if (_sweepBusy || !state) return;
    _sweepBusy = true;
    try {
      const now = Date.now();
      // Active account last — its sidebar scroll is visible to the user.
      const targets = waAccounts()
        .filter((a) => {
          const c = _cache.get(a.id);
          return !c || (now - c.t) > CACHE_TTL_MS;
        })
        .sort((a, b) => (a.id === state.activeAccountId ? 1 : 0) - (b.id === state.activeAccountId ? 1 : 0));
      _sweepTotal = waAccounts().length;
      _sweepDone = _sweepTotal - targets.length;
      renderResults();
      for (const account of targets) {
        if (!_open) return; // palette closed — stop burning webview time
        const webview = state.webviews.get(account.id);
        if (!isWebviewReady?.(webview)) { _sweepDone++; continue; }
        const token = typeof WADECK_WV_TOKEN !== 'undefined' ? WADECK_WV_TOKEN : '';
        let chats = null;
        try {
          chats = await safeExecuteInWebview(webview, collectChatsFromSidebarScript(token), true);
        } catch { chats = null; }
        const normalized = Array.isArray(chats)
          ? chats.map((c) => String(c || '').trim()).filter(Boolean)
          : [];
        if (normalized.length) _cache.set(account.id, { t: Date.now(), chats: normalized });
        _sweepDone++;
        renderResults();
      }
    } finally {
      _sweepBusy = false;
      renderResults();
    }
  }

  /* ── Matching ── */

  function collectMatches(query) {
    const q = String(query || '').trim().toLowerCase();
    const out = [];
    const seen = new Set();
    const push = (accountId, name, source) => {
      if (q && !String(name).toLowerCase().includes(q)) return;
      const key = accountId + '::' + String(name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ accountId, name, source });
    };
    // Instant sources first (favorites/important carry accountId + name)
    for (const f of state?.important || []) push(f.accountId, f.name, 'imp');
    for (const f of state?.favorites || []) push(f.accountId, f.name, 'fav');
    for (const [accountId, entry] of _cache) {
      for (const name of entry.chats) push(accountId, name, 'chat');
    }
    return out.slice(0, 50);
  }

  /* ── Rendering ── */

  function renderResults() {
    if (!_open) return;
    const list = listEl();
    const status = statusEl();
    if (!list) return;
    const query = String(inputEl()?.value || '');
    _lastResults = collectMatches(query);
    if (_selIndex >= _lastResults.length) _selIndex = Math.max(0, _lastResults.length - 1);

    list.innerHTML = '';
    const frag = document.createDocumentFragment();
    _lastResults.forEach((item, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'gs-row' + (idx === _selIndex ? ' is-active' : '');
      const who = document.createElement('span');
      who.className = 'gs-row-who';
      who.textContent = item.name;
      const sub = document.createElement('span');
      sub.className = 'gs-row-sub';
      const badge = item.source === 'imp' ? '⚑ ' : item.source === 'fav' ? '★ ' : '';
      sub.textContent = badge + accountName(item.accountId);
      row.append(who, sub);
      row.addEventListener('click', () => jumpTo(item));
      row.addEventListener('mousemove', () => {
        if (_selIndex !== idx) { _selIndex = idx; renderResults(); }
      });
      frag.appendChild(row);
    });
    list.appendChild(frag);

    if (status) {
      if (_sweepBusy) {
        status.textContent = `Собираю чаты: ${_sweepDone}/${_sweepTotal} аккаунтов…`;
      } else if (!_lastResults.length) {
        status.textContent = query ? 'Ничего не найдено' : 'Начните вводить имя контакта';
      } else {
        status.textContent = `Найдено: ${_lastResults.length}${_lastResults.length === 50 ? '+' : ''}`;
      }
    }
  }

  /* ── Navigation ── */

  async function jumpTo(item) {
    if (!item) return;
    close();
    if (typeof setActiveAccount === 'function') setActiveAccount(item.accountId);
    const webview = state.webviews.get(item.accountId);
    if (webview && window.WaDeckScheduleModule?.openChatInWebview) {
      const res = await window.WaDeckScheduleModule.openChatInWebview(webview, item.name).catch(() => null);
      if (!res?.ok && typeof setStatus === 'function') {
        setStatus(`Не удалось открыть чат «${item.name}» (${res?.error || 'ошибка'})`);
      }
    }
  }

  function onInputKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selIndex = Math.min(_selIndex + 1, Math.max(0, _lastResults.length - 1));
      renderResults();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selIndex = Math.max(0, _selIndex - 1);
      renderResults();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      jumpTo(_lastResults[_selIndex]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  let _bound = false;
  function bind() {
    if (_bound) return;
    const overlay = overlayEl();
    const input = inputEl();
    if (!overlay || !input) return;
    _bound = true;
    input.addEventListener('input', () => { _selIndex = 0; renderResults(); });
    input.addEventListener('keydown', onInputKeydown);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close();
    });
  }

  function open() {
    const overlay = overlayEl();
    const input = inputEl();
    if (!overlay || !input || !state) return;
    bind();
    _open = true;
    _selIndex = 0;
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    renderResults();
    sweep().catch(() => {});
  }

  function close() {
    _open = false;
    overlayEl()?.classList.add('hidden');
  }

  function toggle() {
    if (_open) close(); else open();
  }

  export const WaDeckGlobalSearch = { init, open, close, toggle, isOpen: () => _open };
  window.WaDeckGlobalSearch = WaDeckGlobalSearch;
