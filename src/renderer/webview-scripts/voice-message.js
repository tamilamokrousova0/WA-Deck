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
    const _origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    try {
      /* ── 1. Decode base64 → ArrayBuffer ── */
      const b64 = ${JSON.stringify(safeB64)};
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const rawBuffer = bytes.buffer;

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

      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints?.audio) {
          navigator.mediaDevices.getUserMedia = _origGUM;
          streamSrc.start(0);
          if (gumResolve) gumResolve(true);
          return fakeStream;
        }
        return _origGUM(constraints);
      };

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
        /* Fallback: scan footer for the LAST button (mic is rightmost) */
        const footer = document.querySelector('footer');
        if (footer) {
          const buttons = [...footer.querySelectorAll('button')];
          if (buttons.length) return buttons[buttons.length - 1];
        }
        return null;
      };

      const pttBtn = findPttBtn();
      if (!pttBtn) {
        navigator.mediaDevices.getUserMedia = _origGUM;
        streamCtx.close().catch(() => {});
        return { ok: false, error: 'ptt_button_not_found' };
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
        /* Restore original getUserMedia if override is still in place */
        if (vs._origGUM && navigator.mediaDevices.getUserMedia !== vs._origGUM) {
          navigator.mediaDevices.getUserMedia = vs._origGUM;
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
