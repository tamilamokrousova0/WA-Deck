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

      const normWs = (v) => String(v || '').replace(/\\s+/g, ' ').trim();
      const wantProbe = normWs(message).slice(0, 64);
      const isInserted = () => {
        if (!wantProbe) return true;
        return normWs(composer.innerText || composer.textContent || '').indexOf(wantProbe) !== -1;
      };

      let method = 'none';
      let claimed = false;

      /* 1. execCommand — cleanest path when the editor honours it */
      try { claimed = document.execCommand('insertText', false, message); } catch { claimed = false; }
      if (claimed) method = 'execCommand';

      /* 2. Synthetic paste event */
      if (!claimed) {
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', message);
          composer.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
          if (isInserted()) { method = 'paste'; claimed = true; }
        } catch {}
      }

      /* 3. beforeinput — Lexical (WA composer) listens to beforeinput/insertText */
      if (!claimed) {
        try {
          composer.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: message, bubbles: true, cancelable: true }));
          if (isInserted()) { method = 'beforeinput'; claimed = true; }
        } catch {}
      }

      /* 4. Raw textContent — last resort (may bypass editor state) */
      if (!claimed) {
        try {
          composer.textContent = message;
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          if (isInserted()) { method = 'textContent'; claimed = true; }
        } catch {}
      }

      const verified = isInserted();
      return { ok: claimed || verified, method: method, verified: verified };
    } catch (e) {
      return { ok: false, error: String(e?.message || e || 'insert_failed') };
    }
  })();`;
}
