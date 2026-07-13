/* voice-message.js — Inject into WhatsApp webview to send audio file as PTT voice message */
/* eslint-disable no-unused-vars */

/**
 * Phase 1: Setup — decode audio, override getUserMedia, locate PTT button.
 * Returns { ok, x, y, duration } or { ok: false, error }.
 * Coordinates (x, y) are used by renderer to send a trusted sendInputEvent.
 */
function voiceMessageSetupScript(audioBase64, mimeType) {
  const safeB64 = String(audioBase64 || '');
  const safeMime = String(mimeType || 'audio/ogg');

  return `(async () => {
    /* Re-entrancy guard: a second run while a voice flow is in progress would
       capture the already-overridden getUserMedia as "original" and later
       "restore" the fake, killing the real mic until webview reload. */
    if (window.__waDeckVoice) return { ok: false, error: 'voice_in_progress' };
    /* Save the NATIVE getUserMedia exactly once, globally. Every restore goes
       through this reference, so a fake can never be re-saved as "real". */
    window.__waDeckRealGUM = window.__waDeckRealGUM
      || navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const _origGUM = window.__waDeckRealGUM;
    try {
      /* ── 1. Decode base64 → ArrayBuffer ──
         fetch of a data: URL instead of atob + per-char loop: the synchronous
         decode froze the WhatsApp UI for hundreds of ms on files near the
         16MB cap (~21MB of base64). */
      const b64 = ${JSON.stringify(safeB64)};
      const resp = await fetch('data:application/octet-stream;base64,' + b64);
      const rawBuffer = await resp.arrayBuffer();

      /* ── 2. Decode audio → get duration ── */
      const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
      let audioBuffer;
      try {
        audioBuffer = await decodeCtx.decodeAudioData(rawBuffer.slice(0));
      } catch (decErr) {
        decodeCtx.close().catch(() => {});
        return { ok: false, error: 'audio_decode_failed', detail: String(decErr?.message || decErr) };
      }
      const duration = audioBuffer.duration;
      if (duration < 0.3) {
        decodeCtx.close().catch(() => {});
        return { ok: false, error: 'audio_too_short' };
      }
      decodeCtx.close().catch(() => {});

      /* ── 3. Render with 200ms silence padding ── */
      const paddingSec = 0.2;
      const totalSec = duration + paddingSec + 0.3;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      const offCtx = new OfflineAudioContext(channels, Math.ceil(totalSec * sampleRate), sampleRate);
      const offSrc = offCtx.createBufferSource();
      offSrc.buffer = audioBuffer;
      offSrc.connect(offCtx.destination);
      offSrc.start(paddingSec);
      const renderedBuffer = await offCtx.startRendering();

      /* ── 4. Create realtime stream from rendered buffer ── */
      const streamCtx = new (window.AudioContext || window.webkitAudioContext)();
      const streamSrc = streamCtx.createBufferSource();
      streamSrc.buffer = renderedBuffer;
      const dest = streamCtx.createMediaStreamDestination();
      streamSrc.connect(dest);
      const fakeStream = dest.stream;

      /* ── 5. One-time getUserMedia override ── */
      let gumResolve = null;
      const gumPromise = new Promise((r) => { gumResolve = r; });

      /* Safety net: if WhatsApp never calls getUserMedia (aborted send) and the
         renderer never runs Phase 3 cleanup, auto-restore the real getUserMedia
         so a stale override can't poison later real mic capture. Held in a
         mutable holder so the gUM interception below can re-arm it: 15s is
         right for "recording never started", but once capture IS running the
         deadline must cover the full audio duration — a fixed 15s would close
         streamCtx mid-recording and truncate any voice message longer than
         ~14s. */
      const safety = { timer: null };
      const armSafetyRestore = (ms) => {
        if (safety.timer) { try { clearTimeout(safety.timer); } catch (_) {} }
        safety.timer = setTimeout(() => {
          try {
            if (navigator.mediaDevices.getUserMedia !== _origGUM) {
              navigator.mediaDevices.getUserMedia = _origGUM;
            }
          } catch (_) {}
          /* Full cleanup, mirroring Phase 3: close the AudioContext (Chromium
             caps ~6 live contexts — leaking one per aborted send soon makes
             every later voice message fail) and drop the state object so the
             re-entrancy guard does not stay latched forever. */
          try { streamCtx.close().catch(() => {}); } catch (_) {}
          try { delete window.__waDeckVoice; } catch (_) {}
        }, ms);
      };

      /* The fake stream is handed out exactly ONCE: the real getUserMedia is
         restored synchronously before returning the fake, so anything else
         calling gUM afterwards (e.g. an incoming WhatsApp call) gets the real
         microphone, not our fake. */
      let fakeDelivered = false;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints?.audio && !fakeDelivered) {
          fakeDelivered = true;
          navigator.mediaDevices.getUserMedia = _origGUM;
          streamSrc.start(0);
          /* Recording started — extend the safety deadline past the hold time
             (duration + padding + Phase-2 margin) plus 10s slack. */
          armSafetyRestore(Math.ceil((duration + paddingSec + 0.3) * 1000) + 10000);
          if (gumResolve) gumResolve(true);
          return fakeStream;
        }
        return _origGUM(constraints);
      };

      armSafetyRestore(15000);

      /* ── 6. Find PTT (mic) button ── */
      const findPttBtn = () => {
        const selectors = [
          '[data-testid="ptt-btn"]',
          'button[aria-label*="Голосовое"]',
          'button[aria-label*="голосовое"]',
          'button[aria-label*="Voice message"]',
          'button[aria-label*="voice message"]',
          'button[aria-label*="Voice"]',
          'button[aria-label*="Record"]',
          'button[aria-label*="Запис"]',
          'button[aria-label*="Микрофон"]',
          'button[aria-label*="микрофон"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        const footer = document.querySelector('footer');
        if (footer) {
          /* data-icon survives WhatsApp redesigns better than testid/aria-label */
          const icon = footer.querySelector('span[data-icon*="ptt"], span[data-icon*="mic"]');
          if (icon) {
            const iconBtn = icon.closest('button') || icon.closest('[role="button"]');
            if (iconBtn) return iconBtn;
          }
          /* Last-button fallback is only safe when the composer is EMPTY:
             with a draft present the rightmost footer button is Send, and
             clicking it would send the draft instead of recording. */
          const composerEl = footer.querySelector('[contenteditable="true"]');
          const draft = composerEl
            ? String(composerEl.innerText || composerEl.textContent || '').trim()
            : '';
          if (draft) return 'composer_not_empty';
          const buttons = [...footer.querySelectorAll('button')];
          if (buttons.length) return buttons[buttons.length - 1];
        }
        return null;
      };

      const pttBtn = findPttBtn();
      if (!pttBtn || typeof pttBtn === 'string') {
        navigator.mediaDevices.getUserMedia = _origGUM;
        streamCtx.close().catch(() => {});
        return { ok: false, error: typeof pttBtn === 'string' ? pttBtn : 'ptt_button_not_found' };
      }

      /* ── 7. Get button center coordinates for trusted sendInputEvent ── */
      const rect = pttBtn.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);

      /* Store state on window so Phase 2 & 3 can access it */
      window.__waDeckVoice = {
        gumPromise,
        streamCtx,
        duration,
        paddingSec,
        _origGUM,
        safety,
      };

      return { ok: true, x: x, y: y, duration: duration };
    } catch (err) {
      try { navigator.mediaDevices.getUserMedia = _origGUM; } catch (_) {}
      return { ok: false, error: String(err?.message || err || 'setup_error') };
    }
  })();`;
}

/**
 * Phase 2: Wait — called AFTER renderer sends a trusted mouseDown via sendInputEvent.
 * Waits for getUserMedia to be called, then waits for audio duration, returns ok.
 */
function voiceMessageWaitScript() {
  return `(async () => {
    try {
      const vs = window.__waDeckVoice;
      if (!vs) return { ok: false, error: 'no_voice_state' };

      /* Wait for WhatsApp to call getUserMedia (timeout 5s) */
      const gumOk = await Promise.race([
        vs.gumPromise.then(() => true),
        new Promise((r) => setTimeout(() => r(false), 5000)),
      ]);

      if (!gumOk) {
        return { ok: false, error: 'getUserMedia_not_called' };
      }

      /* Hold for audio duration + padding so MediaRecorder captures everything */
      const holdMs = Math.ceil((vs.duration + vs.paddingSec + 0.3) * 1000) + 400;
      await new Promise((r) => setTimeout(r, holdMs));

      return { ok: true, duration: vs.duration };
    } catch (err) {
      return { ok: false, error: String(err?.message || err || 'wait_error') };
    }
  })();`;
}

/**
 * Phase 3: Cleanup — restore getUserMedia, close AudioContext, remove state.
 */
function voiceMessageCleanupScript() {
  return `(async () => {
    try {
      const vs = window.__waDeckVoice;
      if (vs) {
        if (vs.safety && vs.safety.timer) { try { clearTimeout(vs.safety.timer); } catch (_) {} }
        /* Restore original getUserMedia — always from the global native
           reference so we can never re-install a stale fake. */
        const realGUM = window.__waDeckRealGUM || vs._origGUM;
        if (realGUM && navigator.mediaDevices.getUserMedia !== realGUM) {
          navigator.mediaDevices.getUserMedia = realGUM;
        }
        /* Close audio context */
        if (vs.streamCtx) vs.streamCtx.close().catch(() => {});
        delete window.__waDeckVoice;
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err?.message || err || 'cleanup_error') };
    }
  })();`;
}

export { voiceMessageSetupScript, voiceMessageWaitScript, voiceMessageCleanupScript };
