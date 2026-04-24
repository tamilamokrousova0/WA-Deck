const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waDeck', {
  bootstrap: () => ipcRenderer.invoke('bootstrap'),
  addAccount: (type) => ipcRenderer.invoke('add-account', type),
  removeAccount: (accountId) => ipcRenderer.invoke('remove-account', accountId),
  renameAccount: (payload) => ipcRenderer.invoke('rename-account', payload),
  setAccountFrozen: (payload) => ipcRenderer.invoke('set-account-frozen', payload),
  setAccountPinned: (payload) => ipcRenderer.invoke('set-account-pinned', payload),
  moveAccount: (payload) => ipcRenderer.invoke('move-account', payload),
  pickAccountIcon: () => ipcRenderer.invoke('pick-account-icon'),
  setAccountIcon: (payload) => ipcRenderer.invoke('set-account-icon', payload),
  setAccountColor: (payload) => ipcRenderer.invoke('set-account-color', payload),
  saveSettings: (payload) => ipcRenderer.invoke('save-settings', payload),
  crmLoadContact: (payload) => ipcRenderer.invoke('crm-load-contact', payload),
  crmSaveContact: (payload) => ipcRenderer.invoke('crm-save-contact', payload),
  listTemplates: () => ipcRenderer.invoke('list-templates'),
  saveTemplate: (payload) => ipcRenderer.invoke('save-template', payload),
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),
  pickAttachments: () => ipcRenderer.invoke('pick-attachments'),
  pickAudioFile: () => ipcRenderer.invoke('pick-audio-file'),
  scheduleMessage: (payload) => ipcRenderer.invoke('schedule-message', payload),
  listScheduled: (payload) => ipcRenderer.invoke('list-scheduled', payload),
  claimDueScheduled: (payload) => ipcRenderer.invoke('claim-due-scheduled', payload),
  completeScheduled: (payload) => ipcRenderer.invoke('complete-scheduled', payload),
  cancelScheduled: (id) => ipcRenderer.invoke('cancel-scheduled', id),
  sendAttachmentsViaCDP: (payload) => ipcRenderer.invoke('send-attachments-via-cdp', payload),
  openDataDir: () => ipcRenderer.invoke('open-data-dir'),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text) => ipcRenderer.invoke('set-clipboard-text', text),
  setDockBadge: (payload) => ipcRenderer.invoke('set-dock-badge', payload),
  checkForUpdates: (payload) => ipcRenderer.invoke('check-for-updates', payload),
  installDownloadedUpdate: () => ipcRenderer.invoke('install-downloaded-update'),
  translateText: (payload) => ipcRenderer.invoke('translate-text', payload),
  onAutoUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('auto-update-status', listener);
    return () => ipcRenderer.removeListener('auto-update-status', listener);
  },
  onHostEscape: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('host-escape-pressed', listener);
    return () => ipcRenderer.removeListener('host-escape-pressed', listener);
  },
  onWebviewCrashed: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('webview-crashed', listener);
    return () => ipcRenderer.removeListener('webview-crashed', listener);
  },
});
