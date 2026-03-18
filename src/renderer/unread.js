(function setupUnreadModule() {
  let state, els, renderAccounts, isWebviewReady, safeExecuteInWebview, updateHubDashboard;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    renderAccounts = ctx.renderAccounts;
    isWebviewReady = ctx.isWebviewReady;
    safeExecuteInWebview = ctx.safeExecuteInWebview;
    updateHubDashboard = ctx.updateHubDashboard;
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
    if (!els.activeUnread || !els.activeUnreadCount) return;
    let total = 0;
    for (const count of state.unreadByAccount.values()) {
      total += Math.max(0, Number(count) || 0);
    }
    if (total > 0) {
      els.activeUnread.classList.remove('hidden');
      els.activeUnreadCount.textContent = total > 99 ? '99+' : String(total);
    } else {
      els.activeUnread.classList.add('hidden');
      els.activeUnreadCount.textContent = '0';
    }
  }

  function findAccountCard(accountId) {
    const safeId = String(accountId || '').trim();
    if (!safeId || !els.accountsList) return null;
    return Array.from(els.accountsList.children || []).find((node) => node.dataset?.accountId === safeId) || null;
  }

  function patchAccountUnreadBadge(accountId) {
    const card = findAccountCard(accountId);
    if (!card) return false;

    const unread = Number(state.unreadByAccount.get(accountId) || 0);
    let badge = card.querySelector('.account-unread');

    if (unread > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'account-unread';
        card.appendChild(badge);
      }
      badge.textContent = unread > 99 ? '99+' : String(unread);
    } else if (badge) {
      badge.remove();
    }

    return true;
  }

  function setUnreadCount(accountId, count) {
    const safeId = String(accountId || '');
    if (!safeId) return;
    const safeCount = Math.max(0, Number(count) || 0);
    const prev = Number(state.unreadByAccount.get(safeId) || 0);
    if (prev === safeCount) return;
    state.unreadByAccount.set(safeId, safeCount);
    if (!patchAccountUnreadBadge(safeId)) {
      renderAccounts();
    }
    updateActiveUnreadIndicator();
    scheduleDockBadgeSync();
    if (typeof updateHubDashboard === 'function') {
      updateHubDashboard();
    }
  }

  async function pollUnreadCounts() {
    if (state.unreadPollBusy) return;
    state.unreadPollBusy = true;
    try {
      const tasks = state.accounts.map(async (account) => {
        if (account.frozen) {
          setUnreadCount(account.id, 0);
          return;
        }
        const webview = state.webviews.get(account.id);
        if (!isWebviewReady(webview)) return;
        let count = 0;
        try {
          const raw = await safeExecuteInWebview(webview, collectUnreadCountScript(), true);
          count = Number(raw || 0) || 0;
        } catch {
          count = Number(state.unreadByAccount.get(account.id) || 0);
        }
        setUnreadCount(account.id, count);
      });
      await Promise.allSettled(tasks);
    } finally {
      state.unreadPollBusy = false;
    }
  }

  function startUnreadPolling() {
    if (state.unreadPollTimer) {
      clearInterval(state.unreadPollTimer);
      state.unreadPollTimer = null;
    }
    state.unreadPollTimer = setInterval(() => {
      pollUnreadCounts().catch(() => {});
    }, 3000);
    setTimeout(() => pollUnreadCounts().catch(() => {}), 800);
  }

  window.WaDeckUnreadModule = {
    init,
    parseUnreadFromTitle,
    updateActiveUnreadIndicator,
    setUnreadCount,
    scheduleDockBadgeSync,
    startUnreadPolling,
  };
})();
