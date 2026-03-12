function selectedTextScript() {
  return `(() => {
    const normalize = typeof window.__waDeckNormalizeText === 'function'
      ? window.__waDeckNormalizeText
      : ((value) => String(value || '')
          .replace(/\\u200e|\\u200f/g, '')
          .replace(/\\u00a0/g, ' ')
          .replace(/\\r/g, '')
          .replace(/[ \\t]+\\n/g, '\\n')
          .replace(/\\n[ \\t]+/g, '\\n')
          .replace(/[ \\t]{2,}/g, ' ')
          .trim());
    const stripWhatsappPrefix = (line) =>
      String(line || '')
        .replace(/^\\[\\d{1,2}:\\d{2}(?:,\\s*[^\\]]+)?\\]\\s*[^:]{1,80}:\\s*/u, '')
        .replace(/^\\d{1,2}:\\d{2}\\s*[-–—]\\s*[^:]{1,80}:\\s*/u, '');
    const cleanupMeta = (value) => {
      if (!value) return '';
      const lines = String(value)
        .split('\\n')
        .map((line) => normalize(stripWhatsappPrefix(line)))
        .filter(Boolean)
        .filter((line) => !/^\\d{1,2}:\\d{2}$/.test(line))
        .filter((line) => !/^\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}$/.test(line));
      return normalize(lines.join('\\n'));
    };

    const selection = window.getSelection();
    const selected = cleanupMeta(selection?.toString() || '');
    const findRow = (node) => (node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest?.('[data-pre-plain-text]') || null;

    if (selection && selected) {
      const anchorRow = findRow(selection.anchorNode);
      const focusRow = findRow(selection.focusNode);
      if (anchorRow && anchorRow === focusRow && typeof window.__waDeckExtractMessageFromRow === 'function') {
        const full = cleanupMeta(window.__waDeckExtractMessageFromRow(anchorRow) || '');
        if (full) return full;
      }
      return selected;
    }

    const lastClicked = cleanupMeta(window.__waDeckLastClickedText || '');
    return lastClicked || '';
  })();`;
}
