/* Requires encodeBase64Utf8() from renderer.js (global scope) */
function applyHoverTranslationResultScript(payload = {}) {
  const encoded = encodeBase64Utf8(JSON.stringify(payload || {}));
  return `(() => {
    try {
      const binary = atob('${encoded}');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof window.__waDeckApplyHoverTranslation !== 'function') return false;
      return window.__waDeckApplyHoverTranslation(payload);
    } catch {
      return false;
    }
  })();`;
}
