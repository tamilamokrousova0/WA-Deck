function collectRecentIncomingMessagesScript(limit = 3) {
  const safeLimit = WaDeckAiModule.normalizeAiContextCount(limit);
  return `(() => {
    const limit = ${safeLimit};
    if (!limit) return [];

    const normalize = typeof window.__waDeckNormalizeText === 'function'
      ? window.__waDeckNormalizeText
      : ((value) => String(value || '').replace(/\\u200e|\\u200f/g, '').replace(/\\s+/g, ' ').trim());
    const extract = typeof window.__waDeckExtractMessageFromRow === 'function'
      ? window.__waDeckExtractMessageFromRow
      : ((row) => normalize(row?.innerText || ''));

    const rows = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
    const out = [];

    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (!row || !row.closest('.message-in')) continue;
      const text = normalize(extract(row) || '');
      if (!text) continue;
      out.push(text);
      if (out.length >= limit) break;
    }

    return out.reverse();
  })();`;
}
