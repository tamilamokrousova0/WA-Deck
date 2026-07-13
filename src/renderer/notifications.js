/* System notifications for favorite/important contacts.
 *
 * Hooked into the priority-feed pipeline: pin-feed calls observe() with the
 * same unread list it renders (favorites + important, per-contact counts).
 * A notification fires only when a contact's count INCREASES, the window is
 * not focused, and the per-contact throttle allows it — so background noise
 * stays low even with 30 accounts polling every 6 seconds. Clicking the
 * notification focuses the app window and jumps straight into the chat via
 * the owning module's jump().
 */
  let state = null;

  function init(ctx) {
    state = ctx.state;
  }

  const isEnabled = () => state?.settings?.notificationsEnabled !== false;

  const _lastCounts = new Map();   // key → last seen unread count
  const _lastNotified = new Map(); // key → ts of last notification
  const THROTTLE_MS = 120000;      // per-contact: at most once per 2 min

  function itemKey(item) {
    return `${item.category}::${item.accountId || ''}::${item.name || ''}`;
  }

  /* Called by pin-feed on every render with the CURRENT unread list (may be
     empty — that clears baselines so a later message notifies again). */
  function observe(unreadItems) {
    if (!state) return;
    const items = Array.isArray(unreadItems) ? unreadItems : [];
    const seen = new Set();

    for (const item of items) {
      const key = itemKey(item);
      seen.add(key);
      const prev = Number(_lastCounts.get(key) || 0);
      const count = Number(item.count) || 0;
      _lastCounts.set(key, count);

      if (count <= prev) continue;
      if (!isEnabled()) continue;
      if (document.hasFocus()) continue; // окно и так перед глазами
      const last = Number(_lastNotified.get(key) || 0);
      if (Date.now() - last < THROTTLE_MS) continue;
      _lastNotified.set(key, Date.now());
      show(item, count);
    }

    // Contact left the feed (read/unpinned) — drop its baseline so the next
    // new message notifies instead of comparing against a stale high count.
    for (const key of Array.from(_lastCounts.keys())) {
      if (!seen.has(key)) {
        _lastCounts.delete(key);
        _lastNotified.delete(key);
      }
    }
  }

  function show(item, count) {
    try {
      if (typeof Notification === 'undefined' || Notification.permission === 'denied') return;
      const label = item.category === 'imp' ? 'Важный контакт' : 'Избранный контакт';
      const cnt = count > 99 ? '99+' : String(count);
      const notification = new Notification(String(item.name || 'Новое сообщение'), {
        body: `${item.accountName || 'WA Deck'} · ${label} · новых: ${cnt}`,
        tag: itemKey(item), // replaces the previous toast for the same contact
        silent: false,
      });
      notification.onclick = () => {
        try { window.waDeck?.focusMainWindow?.().catch(() => {}); } catch { /* ignore */ }
        const mod = item.category === 'imp' ? window.WaDeckImportantModule : window.WaDeckFavoritesModule;
        try { mod?.jump?.(item); } catch { /* ignore */ }
        try { notification.close(); } catch { /* ignore */ }
      };
    } catch (e) {
      console.warn('[notifications]', e);
    }
  }

  export const WaDeckNotifications = { init, observe };
  window.WaDeckNotifications = WaDeckNotifications;
