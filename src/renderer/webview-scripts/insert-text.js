/* Requires encodeBase64Utf8() from renderer.js (global scope) */
function insertTextScript(text) {
  const textB64 = encodeBase64Utf8(String(text || ''));
  return `(async () => {
    try {
      const binary = atob('${textB64}');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const message = new TextDecoder().decode(bytes);

      const composer =
        document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('footer div[contenteditable="true"][data-tab]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]');
      if (!composer) return { ok: false, error: 'composer_not_found' };

      composer.focus();
      let inserted = false;
      try { inserted = document.execCommand('insertText', false, message); } catch { inserted = false; }

      if (!inserted) {
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', message);
          composer.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
        } catch {
          composer.textContent = message;
          composer.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e?.message || e || 'insert_failed') };
    }
  })();`;
}
