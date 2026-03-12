(function setupAutoUpdateModule() {
  const RELEASE_NOTES = {
    '0.1.13': [
      'Скрыта системная полоса прокрутки в левой панели WhatsApp-аккаунтов.',
      'Добавлены стрелки вверх и вниз для прокрутки списка аккаунтов без перекрытия иконок.',
    ],
    '0.1.12': [
      'Упрощён hover-перевод: убран выбор языка из popover.',
      'Окно hover-перевода перенесено в фиксированную левую зону чата и сделано полупрозрачным.',
      'Вертикальное положение hover-перевода сглажено, чтобы окно не прыгало резко между сообщениями.',
    ],
    '0.1.11': [
      'Исправлено растягивание карточек WhatsApp в левой панели при малом количестве аккаунтов.',
      'Карточки аккаунтов теперь всегда держат компактную высоту по содержимому.',
    ],
    '0.1.10': [
      'Исправлен запуск приложения: webview больше не получает executeJavaScript до dom-ready.',
      'Восстановлена корректная инициализация кнопок и виджетов после старта.',
    ],
    '0.1.9': [
      'Исправлен hover-перевод сообщений: удалены дубли текста и хвосты со временем.',
      'Для hover-перевода добавлен выбор языка прямо в popover сообщения.',
      'В hover-перевод добавлена кнопка копирования результата.',
    ],
    '0.1.8': [
      'Усилено извлечение текста: DOM + emoji alt + data-pre-plain-text + fallback через выделение строки.',
      'Исправлен скролл списка WhatsApp в левой панели при большом количестве аккаунтов.',
      'Модальные окна больше не закрываются по клику в пустое место — только через крестик.',
      'Убрана функция экспорта чатов из интерфейса.',
    ],
    '0.1.7': [
      'Добавлен hover-перевод сообщений через выбранный API-переводчик.',
      'Добавлено правое меню в WhatsApp Web для копирования текста, ссылок и изображений.',
      'Добавлено окно «Что нового» после обновления приложения.',
    ],
    '0.1.6': [
      'Добавлен хаб-экран при запуске и переход по Esc.',
      'Добавлено свободное перетаскивание WhatsApp в левой панели.',
      'Улучшены погодный виджет и отображение непрочитанных сообщений.',
    ],
    '0.1.5': [
      'Исправлена логика выбора чата для отложенной отправки.',
      'Улучшен интерфейс панели и настройки обновления.',
    ],
  };

  let state, els, setStatus;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
  }

  function handleAutoUpdateStatus(payload = {}) {
    const status = String(payload?.status || '').trim();
    const message = String(payload?.message || '').trim() || 'временно недоступно';
    const version = String(payload?.version || '').trim();
    const percent = Number(payload?.percent || 0);

    if (status === 'disabled') {
      setStatus('Обновление доступно только в собранной версии');
      return;
    }
    if (status === 'checking') {
      setStatus('Обновление: проверка...');
      return;
    }
    if (status === 'available') {
      setStatus(`Обновление: доступна версия ${version || 'новая'}`);
      return;
    }
    if (status === 'downloading') {
      setStatus(`Обновление: загрузка ${Math.max(0, Math.min(100, percent))}%`);
      return;
    }
    if (status === 'downloaded') {
      setStatus(`Обновление ${version || ''} загружено`);
      if (version && RELEASE_NOTES[version]) {
        els.releaseNotesTitle.textContent = 'Что нового в обновлении';
        els.releaseNotesVersion.textContent = `Версия ${version}`;
        renderReleaseNotes([version]);
        els.releaseNotesModal.classList.remove('hidden');
      }
      return;
    }
    if (status === 'not-available') {
      setStatus(`Обновление: ${message}`);
      return;
    }
    if (status === 'error') {
      setStatus(`Обновление: ${message}`);
    }
  }

  function compareVersions(a, b) {
    const pa = String(a || '')
      .replace(/^v/i, '')
      .split('.')
      .map((part) => Number(part) || 0);
    const pb = String(b || '')
      .replace(/^v/i, '')
      .split('.')
      .map((part) => Number(part) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i += 1) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function renderReleaseNotes(versions = []) {
    if (!els.releaseNotesList) return;
    els.releaseNotesList.innerHTML = '';
    for (const version of versions) {
      const card = document.createElement('div');
      card.className = 'release-notes-version-block';

      const title = document.createElement('div');
      title.className = 'release-notes-version-title';
      title.textContent = `Версия ${version}`;

      const list = document.createElement('ul');
      for (const line of RELEASE_NOTES[version] || []) {
        const item = document.createElement('li');
        item.textContent = line;
        list.appendChild(item);
      }

      card.append(title, list);
      els.releaseNotesList.appendChild(card);
    }
  }

  async function markReleaseNotesSeen(version) {
    const safeVersion = String(version || '').trim();
    if (!safeVersion) return;
    const next = await window.waDeck.saveSettings({
      lastSeenReleaseNotesVersion: safeVersion,
    });
    state.settings = {
      ...(state.settings || {}),
      ...(next || {}),
    };
  }

  async function maybeShowReleaseNotes() {
    const currentVersion = String(state.runtime?.appVersion || '').trim();
    const lastSeen = String(state.settings?.lastSeenReleaseNotesVersion || '').trim();
    if (!currentVersion || compareVersions(currentVersion, lastSeen) <= 0) return;

    const versions = Object.keys(RELEASE_NOTES)
      .filter((version) => compareVersions(version, lastSeen || '0.0.0') > 0 && compareVersions(version, currentVersion) <= 0)
      .sort(compareVersions)
      .reverse();
    if (!versions.length) {
      await markReleaseNotesSeen(currentVersion);
      return;
    }

    els.releaseNotesTitle.textContent = 'Что нового';
    els.releaseNotesVersion.textContent = `Обновление до версии ${currentVersion}`;
    renderReleaseNotes(versions);
    els.releaseNotesModal.classList.remove('hidden');
  }

  async function closeReleaseNotesModal() {
    els.releaseNotesModal.classList.add('hidden');
    await markReleaseNotesSeen(String(state.runtime?.appVersion || '').trim());
  }

  async function requestManualUpdate() {
    if (!window.waDeck?.checkForUpdates) {
      setStatus('Обновление недоступно');
      return;
    }
    els.manualUpdate?.classList.add('is-loading');
    const response = await window.waDeck.checkForUpdates({ source: 'manual_button' });
    if (response?.ok) {
      setStatus('Обновление: запрос отправлен');
    } else if (response?.error === 'not_packaged') {
      setStatus('Обновление доступно только в .dmg/.exe сборке');
    } else if (response?.error === 'mac_signature_required') {
      setStatus('Для macOS: обновление вручную через GitHub Releases');
    } else if (response?.error) {
      setStatus(`Обновление: ${response.error}`);
    }
    setTimeout(() => {
      els.manualUpdate?.classList.remove('is-loading');
    }, 520);
  }

  window.WaDeckAutoUpdateModule = {
    init,
    handleAutoUpdateStatus,
    maybeShowReleaseNotes,
    closeReleaseNotesModal,
    requestManualUpdate,
  };
})();
