function bridgeScript(token) {
  const tokenJs = JSON.stringify(typeof token === 'string' ? token : '');
  return `(() => {
    if (window.__waDeckBridgeBound) return true;
    window.__waDeckBridgeBound = true;
    window.__waDeckLastClickedText = '';

    /* Host-issued token kept in the closure (never on window) */
    const __WADECK_TOKEN = ${tokenJs};

    /* Health marker, throttled to at most one per minute */
    let healthLastSent = 0;
    const emitHealth = (detail) => {
      const now = Date.now();
      if (now - healthLastSent < 60000) return;
      healthLastSent = now;
      try {
        console.log('__WADECK_HEALTH__' + __WADECK_TOKEN + ':' + JSON.stringify({ script: 'bridge', ok: false, detail: detail }));
      } catch {}
    };

    const normalize = (value) =>
      String(value || '')
        .replace(/\\u200e|\\u200f/g, '')
        .replace(/\\u00a0/g, ' ')
        .replace(/\\r/g, '')
        .replace(/[ \\t]+\\n/g, '\\n')
        .replace(/\\n[ \\t]+/g, '\\n')
        .replace(/[ \\t]{2,}/g, ' ')
        .trim();

    const extractTextFromNode = (node) => {
      if (!node) return '';
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const element = node;
      const tag = String(element.tagName || '').toUpperCase();

      if (tag === 'BR') return '\\n';
      if (tag === 'IMG') {
        const alt = normalize(element.getAttribute('alt') || '');
        const looksLikeEmoji = /[\\p{Extended_Pictographic}\\u2600-\\u27BF]/u.test(alt);
        const hasLetters = /[A-Za-zА-яа-я]/u.test(alt);
        return looksLikeEmoji || (!hasLetters && alt.length <= 4) ? alt : '';
      }
      if (tag === 'SPAN' && element.getAttribute('data-icon') === 'reaction') {
        return '';
      }

      let out = '';
      for (const child of Array.from(element.childNodes || [])) {
        out += extractTextFromNode(child);
      }
      return out;
    };

    const selectNodeText = (node) => {
      if (!node) return '';
      const selection = window.getSelection();
      if (!selection) return '';
      // Never clobber an active user selection — bail out and let the
      // caller's other fallbacks handle this row instead.
      if (selection.rangeCount > 0 && !selection.isCollapsed) return '';
      const saved = [];
      for (let i = 0; i < selection.rangeCount; i += 1) {
        saved.push(selection.getRangeAt(i).cloneRange());
      }
      let text = '';
      try {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
        text = selection.toString() || '';
      } catch {
        text = '';
      } finally {
        selection.removeAllRanges();
        for (const range of saved) {
          try {
            selection.addRange(range);
          } catch {
            // ignore restore failures
          }
        }
      }
      return text;
    };

    const extractMessageFromRow = (row) => {
      if (!row) return '';
      const stripWhatsappPrefix = (line) =>
        String(line || '')
          .replace(/^\\[\\d{1,2}:\\d{2}(?:,\\s*[^\\]]+)?\\]\\s*[^:]{1,80}:\\s*/u, '')
          .replace(/^\\d{1,2}:\\d{2}\\s*[-–—]\\s*[^:]{1,80}:\\s*/u, '');
      // Locale-independent trailing-meta cleanup: tick glyphs and HH:MM(:SS)
      // (optionally with AM/PM) instead of EN/RU-only word lists.
      const stripTrailingMeta = (line) =>
        String(line || '')
          .replace(/[\\u2713\\u2714]+/gu, '')
          .replace(/[ \\t]+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[APap]\\.?[Mm]\\.?)?$/u, '')
          .replace(/[ \\t]+(?:вчера|сегодня)$/iu, '')
          .trim();
      const dedupeLines = (lines) => {
        const seen = new Set();
        const out = [];
        for (const line of lines) {
          const normalizedLine = normalize(line);
          if (!normalizedLine) continue;
          if (seen.has(normalizedLine)) continue;
          seen.add(normalizedLine);
          out.push(normalizedLine);
        }
        return out;
      };
      const collapseRepeatedText = (value) => {
        const text = normalize(value);
        if (!text) return '';
        const lines = dedupeLines(
          text
            .split('\\n')
            .map((line) => stripTrailingMeta(stripWhatsappPrefix(line)))
            .filter(Boolean),
        );
        const joined = normalize(lines.join('\\n'));
        if (!joined) return '';

        for (let parts = 2; parts <= 6; parts += 1) {
          if (joined.length % parts !== 0) continue;
          const chunkLength = joined.length / parts;
          if (chunkLength < 8) continue;
          const chunk = joined.slice(0, chunkLength);
          if (chunk.repeat(parts) === joined) {
            return normalize(chunk);
          }
        }
        return joined;
      };
      const cleanupMeta = (value) => {
        if (!value) return '';
        const lines = String(value)
          .split('\\n')
          .map((line) => normalize(stripTrailingMeta(stripWhatsappPrefix(line))))
          .filter(Boolean)
          .filter((line) => !/^\\d{1,2}:\\d{2}$/.test(line))
          .filter((line) => !/^\\d{1,2}:\\d{2}:\\d{2}$/.test(line))
          .filter((line) => !/^\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}$/.test(line));
        return collapseRepeatedText(lines.join('\\n'));
      };

      const anchor = (row.matches && row.matches('[data-pre-plain-text]'))
        ? row
        : (row.querySelector ? row.querySelector('[data-pre-plain-text]') : null);
      const prefixRaw = String((anchor || row).getAttribute('data-pre-plain-text') || '').trim();

      let best = '';

      /* 1. Primary: the [data-pre-plain-text] anchor — the only stable hook
         that survived the mid-2026 redesign. Its text minus known meta is
         the message body. */
      if (anchor) {
        best = cleanupMeta(extractTextFromNode(anchor));
      }

      /* 2. Clone fallback with locale-independent meta removal: drop <time>
         and status-icon spans, then run the regex-based cleanup (times, tick
         glyphs) — no dependence on EN/RU aria-labels or dead testids. */
      if (!best && row.cloneNode) {
        const clone = row.cloneNode(true);
        clone.querySelectorAll('time, span[data-icon]').forEach((node) => node.remove());
        best = cleanupMeta(extractTextFromNode(clone));
      }

      /* 3. Selection hack (skipped when the user holds a selection). */
      if (!best) {
        best = cleanupMeta(selectNodeText(row));
      }

      if (!best && prefixRaw) {
        best = cleanupMeta(prefixRaw);
      }

      if (!best) emitHealth('extract_failed_all_branches');

      return best;
    };

    window.__waDeckNormalizeText = normalize;
    window.__waDeckExtractMessageFromRow = extractMessageFromRow;

    document.addEventListener('click', (event) => {
      const row = event.target && event.target.closest ? event.target.closest('[data-pre-plain-text]') : null;
      if (!row) return;
      const text = extractMessageFromRow(row);
      if (text) window.__waDeckLastClickedText = text;
    }, true);

    return true;
  })();`;
}
