/* Session preload for WhatsApp/Telegram webview partitions.
 *
 * Exposes a single guest→host send function backed by ipcRenderer.sendToHost.
 * Unlike the legacy console.log marker channel, contextBridge properties are
 * non-writable and non-configurable in the main world: page code can neither
 * replace nor wrap this function, so it cannot observe the arguments — the
 * host-issued token our injected scripts pass with every message stays
 * unstealable even from a compromised WhatsApp Web page. (Page code CAN call
 * the function with forged data, but without the token the host drops it —
 * the same validation the console channel always had.)
 *
 * Registered via session.registerPreloadScript in main.js setupWebviewGuards;
 * the console.log channel remains as a fallback for the rare case the preload
 * did not run (e.g. a load that raced session configuration).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__waDeckGuestSend', (token, kind, json) => {
  try {
    ipcRenderer.sendToHost('wadeck-guest', String(token || ''), String(kind || ''), String(json || ''));
  } catch {
    /* host webContents gone — nothing to do */
  }
});
