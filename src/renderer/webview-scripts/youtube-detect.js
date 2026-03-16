function youtubeDetectScript() {
  return `(() => {
    if (window.__waDeckYoutubeDetectBound) return true;
    window.__waDeckYoutubeDetectBound = true;

    const YT_REGEX = /(?:https?:\\/\\/)?(?:www\\.)?(?:youtube\\.com\\/(?:watch\\?v=|shorts\\/|embed\\/)|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/;

    if (!document.getElementById('waDeckYoutubeStyle')) {
      const style = document.createElement('style');
      style.id = 'waDeckYoutubeStyle';
      style.textContent = \`
        .waDeck-yt-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          margin: 2px 0;
          border-radius: 6px;
          background: rgba(255, 0, 0, 0.12);
          border: 1px solid rgba(255, 0, 0, 0.25);
          color: #ff4444;
          font: 600 10px/1.2 "Segoe UI", sans-serif;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          vertical-align: middle;
        }
        .waDeck-yt-play-btn:hover {
          background: rgba(255, 0, 0, 0.22);
          transform: scale(1.04);
        }
        .waDeck-yt-play-btn svg {
          width: 12px;
          height: 12px;
          fill: currentColor;
        }
      \`;
      document.head.appendChild(style);
    }

    const processedLinks = new WeakSet();

    function addPlayButtons() {
      const links = document.querySelectorAll('#main a[href]');
      for (const link of links) {
        if (processedLinks.has(link)) continue;
        const href = String(link.href || link.getAttribute('href') || '');
        const match = href.match(YT_REGEX);
        if (!match) continue;
        processedLinks.add(link);
        const videoId = match[1];

        // Check if button already exists next to this link
        if (link.parentElement?.querySelector('.waDeck-yt-play-btn')) continue;

        const btn = document.createElement('button');
        btn.className = 'waDeck-yt-play-btn';
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play';
        btn.title = 'Открыть мини-плеер YouTube';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('__WADECK_YOUTUBE_PLAY__' + JSON.stringify({ videoId, url: href }));
        });

        // Insert button after the link
        if (link.nextSibling) {
          link.parentElement.insertBefore(btn, link.nextSibling);
        } else {
          link.parentElement.appendChild(btn);
        }
      }
    }

    // Use MutationObserver instead of setInterval to avoid leaks
    const observer = new MutationObserver(() => { addPlayButtons(); });
    const mainEl = document.getElementById('main');
    if (mainEl) {
      observer.observe(mainEl, { childList: true, subtree: true });
    } else {
      // Fallback: wait for #main to appear, then observe
      const waitForMain = new MutationObserver(() => {
        const m = document.getElementById('main');
        if (m) {
          waitForMain.disconnect();
          observer.observe(m, { childList: true, subtree: true });
          addPlayButtons();
        }
      });
      waitForMain.observe(document.body, { childList: true, subtree: true });
    }
    setTimeout(addPlayButtons, 1000);

    return true;
  })();`;
}
