function bridgeScript() {
  return `(() => {
    if (window.__waDeckBridgeBound) return true;
    window.__waDeckBridgeBound = true;
    window.__waDeckLastClickedText = '';

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
        const looksLikeEmoji = /[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(alt);
        const hasLetters = /[A-Za-z\u0410-\u044F\u0430-\u044F]/u.test(alt);
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
          .replace(/^\\d{1,2}:\\d{2}\\s*[-\u2013\u2014]\\s*[^:]{1,80}:\\s*/u, '');
      const stripTrailingMeta = (line) =>
        String(line || '')
          .replace(/[ \\t]+(?:\\d{1,2}:\\d{2}(?::\\d{2})?)$/u, '')
          .replace(/[ \\t]+(?:\u0432\u0447\u0435\u0440\u0430|\u0441\u0435\u0433\u043e\u0434\u043d\u044f)$/iu, '')
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
      const prefixInfo = (() => {
        const raw = String(row.getAttribute('data-pre-plain-text') || '').trim();
        const match = raw.match(/^\\[(.+?)\\]\\s*([^:]+):\\s*$/u);
        return {
          raw,
          timestamp: normalize(match?.[1] || ''),
          author: normalize(match?.[2] || ''),
        };
      })();

      // For image/video messages: prefer caption-only to avoid text duplication
      const mediaCaptions = Array.from(row.querySelectorAll('[data-testid="media-caption"], [data-testid="caption"]'));
      if (mediaCaptions.length > 0) {
        const captionTexts = mediaCaptions
          .map((el) => cleanupMeta(extractTextFromNode(el)))
          .filter(Boolean);
        const uniqueCaptions = [...new Set(captionTexts)];
        if (uniqueCaptions.length > 0) {
          return uniqueCaptions[0];
        }
      }

      const containerCandidates = Array.from(row.querySelectorAll('[data-testid="msg-text"]'));
      const candidates = [
        ...containerCandidates,
        ...Array.from(
          row.querySelectorAll(
            'span.selectable-text.copyable-text, span.selectable-text, div.selectable-text.copyable-text'
          ),
        ),
      ];

      const primaryTexts = [];
      const uniqueTexts = [];
      const pushPrimaryText = (value) => {
        const text = cleanupMeta(value);
        if (!text) return;
        if (primaryTexts.includes(text)) return;
        primaryTexts.push(text);
      };
      const pushUniqueText = (value) => {
        const text = cleanupMeta(value);
        if (!text) return;
        if (uniqueTexts.includes(text)) return;
        uniqueTexts.push(text);
      };

      let best = '';
      for (const candidate of containerCandidates) {
        const text = extractTextFromNode(candidate);
        pushPrimaryText(text);
        pushUniqueText(text);
      }
      for (const candidate of candidates) {
        pushUniqueText(extractTextFromNode(candidate));
      }

      if (primaryTexts.length) {
        primaryTexts.sort((a, b) => a.length - b.length);
        best = primaryTexts[0];
      } else if (uniqueTexts.length) {
        uniqueTexts.sort((a, b) => a.length - b.length);
        best = uniqueTexts[0];
      }

      if (!best) {
        const clone = row.cloneNode(true);
        const metaNodes = clone.querySelectorAll(
          '[data-testid="msg-meta"], [data-testid="msg-time"], time, [aria-label*="Delivered"], [aria-label*="Read"], [aria-label*="\u041e\u0442\u043f\u0440\u0430\u0432"], [aria-label*="\u041f\u0440\u043e\u0447\u0438\u0442"], [aria-label*="opened"], [aria-label*="\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440"], [aria-label*="Open"], [data-testid="media-viewer-caption"]'
        );
        metaNodes.forEach((node) => node.remove());
        best = cleanupMeta(extractTextFromNode(clone));
      }

      if (!best) {
        best = cleanupMeta(selectNodeText(row));
      }

      if (!best && prefixInfo.raw) {
        best = cleanupMeta(prefixInfo.raw);
      }

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
