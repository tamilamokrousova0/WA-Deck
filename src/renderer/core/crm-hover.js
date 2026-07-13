/* CRM hover popover (read-only contact card on hover) + its cache.
   Extracted verbatim from renderer.js. */
import { escapeHtml } from './helpers.js';
import { isCrmHoverEnabled } from './settings.js';

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
      // Attach the document-level move/up listeners only for the duration of
      // a drag — permanent ones ran on every mouse move for the rest of the
      // session after the first hover popover.
      const onMove = (e) => {
        if (!dragging) return;
        popover.style.left = (origLeft + e.clientX - startX) + 'px';
        popover.style.top = (origTop + e.clientY - startY) + 'px';
      };
      const onUp = () => {
        dragging = false;
        popover._dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.crm-hover-badge')) return;
        dragging = true;
        popover._dragging = true;
        startX = e.clientX; startY = e.clientY;
        origLeft = parseInt(popover.style.left, 10) || 0;
        origTop = parseInt(popover.style.top, 10) || 0;
        if (_crmHoverTimer) { clearTimeout(_crmHoverTimer); _crmHoverTimer = null; }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    }
  }
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
        // _crmHoverCacheSet owns eviction (200-cap, deletes the matching gen
        // entry). The extra trimMapSize(…, 50) here fought that limit and
        // orphaned generation entries, growing _crmHoverGen unboundedly.
        _crmHoverCacheSet(cacheKey, { data: record, ts: Date.now() });
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

export { getCrmHoverPopover, hideCrmHoverPopover, showCrmHoverPopover, handleCrmHover };
