(function setupAutoUpdateModule() {
  const RELEASE_NOTES = {
    '0.5.1': [
      'UX: активный аккаунт — белая полоса + масштаб, CRM popover перетаскивается.',
      'UX: разделители toolbar, иконка отложенной отправки, контекст в шаблонах.',
      'UX: подтверждение отмены расписания, безопасное редактирование.',
      'UX: loading spinner на кнопках, backdrop модалок, focus management.',
      'UX: light theme badges, unread badge пульсация, hub type icons.',
      'Fix: дубликат «Активных сообщений нет» при загрузке.',
    ],
    '0.5.0': [
      'Безопасность: Content-Security-Policy, фильтрация URL, sandbox.',
      'Стабильность: обработка падения webview, flush при закрытии, global error handler.',
      'Производительность: опрос непрочитанных батчами по 6, debounce hub dashboard.',
      'Удалён disable-renderer-backgrounding (экономия 60-80% CPU при 20+ аккаунтах).',
      'Иконка отложенной отправки в верхней панели с анимацией.',
      'Удалены: переводчик, YouTube мини-плеер. Electron 41.1.1.',
    ],
    '0.4.5': [
      'Windows: исправлен сломанный layout sidebar (карточки по центру) — защита от NaN в --sidebar-width.',
      'Windows: отложенная отправка работает при Режиме эффективности — автопробуждение webview.',
      'Авто-сброс повреждённого sidebar width при запуске вместо ручного удаления настроек.',
    ],
    '0.4.4': [
      'Telegram: исправлен статус «загрузка» — SPA-навигация больше не сбрасывает ready-состояние.',
      'Telegram: уведомления о непрочитанных сообщениях теперь работают (page-title-updated).',
      'Шаблоны и перевод: восстановлена функция encodeBase64Utf8, ошибочно удалённая при аудите.',
    ],
    '0.4.3': [
      'Telegram support: отдельные Telegram Web аккаунты, type badges WA/TG, корректные partition и guards.',
      'Performance: CPU в фоне снижен, sidebar появляется мгновенно, переключение аккаунтов без миганий.',
      'Windows: добавлен disable-renderer-backgrounding против Efficiency Mode.',
      'CRM hover popover: прокрутка колёсиком и адаптивная высота.',
      'Production hardening: Telegram fixes, XSS-fix, z-index, accessibility и удаление мёртвого кода.',
    ],
    '0.4.2': [
      'Оптимизация ресурсов: снижение CPU на 40-60% в фоновом режиме.',
      'Telegram: устранены подтормаживания при SPA-навигации (did-navigate-in-page).',
      'Полная очистка event listeners при удалении/заморозке webview — без утечек памяти.',
      'Unread polling: адаптивный интервал (5с активно / 15с в фоне).',
      'Batch DOM: renderAccounts через DocumentFragment — один reflow вместо N.',
      'Hub: safe center позиционирование, прокрутка при 12+ аккаунтах (фикс Windows).',
      'Безопасность: XSS-фикс в CRM hover labels, z-index нормализация.',
      'Accessibility: статичный focus ring (убрана бесконечная анимация), prefers-reduced-motion.',
      'CSS: удалены дублирующие правила, паузируются hub-анимации при скрытии.',
      'Продакшн-аудит: 3 параллельных агента (CSS/JS/HTML), 20+ исправлений.',
    ],
    '0.4.1': [
      'Windows hotfix: исправлен CI workflow релиза, exe и latest.yml теперь публикуются корректно.',
      'Убран конфликт двойной публикации release между build jobs и release job.',
    ],
    '0.4.0': [
      'Поддержка Telegram: добавление Telegram-аккаунтов наряду с WhatsApp.',
      'Выбор типа аккаунта при нажатии «+» — иконки WhatsApp и Telegram.',
      'Значки типа (WA/TG) на карточках аккаунтов в sidebar.',
      'Палитра из 50 цветов для кастомизации аккаунтов.',
      'CRM hover popover: полная прокрутка колёсиком, адаптивная высота.',
      'Windows: защита от Режима эффективности (disable-renderer-backgrounding).',
      'Продакшн-аудит: исправлены навигационные guards для Telegram, удалён мёртвый код.',
    ],
    '0.3.2': [
      'CRM hover popover расширен: теперь показывает полный объём информации.',
    ],
    '0.3.1': [
      'Исправлен скролл sidebar при 20+ аккаунтах.',
    ],
    '0.3.0': [
      'Полный редизайн интерфейса в стиле Lovable: аккаунты, модалы, настройки.',
      'Светлая тема хаба: голубое небо с солнцем и анимированными облаками.',
      'Тёмная тема: мерцающие звёзды на фоне ночного леса.',
      'Размер сайдбара теперь регулируется перетаскиванием.',
      'Виджет погоды: кнопка закрытия, обновлённый стиль.',
      'Модалы обновления, релиза и подтверждения приведены к единому hero-дизайну.',
      'CRM-модал: секционная разметка с полями контакта и заметок.',
      'Продакшн-аудит: удалён мёртвый CSS, исправлены конфликтующие анимации, type=button на всех кнопках.',
    ],
    '0.2.4': [
      'Windows hotfix: исправлен CI/CD релизный pipeline для публикации Windows-обновления.',
      'Обновление предназначено для Windows-клиентов через автообновление.',
    ],
    '0.2.3': [
      'Windows hotfix: исправлена ошибка Windows-сборки/установки из ветки 0.2.2.',
      'Обновление предназначено в первую очередь для Windows-клиентов через автообновление.',
    ],
    '0.2.2': [
      'Новая иконка приложения: минималистичный хаб-дизайн для Dock и боковой панели.',
      'Анимированная хаб-иконка в сайдбаре с эффектом пульса при клике.',
      'Хаб-экран: анимированная сетевая визуализация, прокрутка при большом количестве аккаунтов.',
      'Исправлено дублирование текста hover-перевода для сообщений с картинками.',
      'Атомарная запись хранилища (защита от повреждения данных).',
      'Восстановление зависших запланированных сообщений при перезапуске.',
    ],
    '0.2.1': [
      'Исправлен crash на старте: версия приложения приведена к валидному semver для electron-updater.',
      'Следующая сборка должна публиковаться как 0.2.1+, а не 0.2.00.',
    ],
    '0.1.14': [
      'Настройки переделаны: SVG-иконки темы и закрытия, анимации hover, скроллируемая панель.',
      'Добавлен popup при доступности обновления с прогрессом загрузки.',
      'Кнопки с эффектом подъёма при наведении, фокус-подсветка полей ввода.',
      'Chevron карточек заменён на CSS-стрелку с плавной анимацией.',
      'Исправлена совместимость горячих клавиш с Windows.',
    ],
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
      showUpdateModal(version);
      return;
    }
    if (status === 'downloading') {
      setStatus(`Обновление: загрузка ${Math.max(0, Math.min(100, percent))}%`);
      updateDownloadProgress(percent);
      return;
    }
    if (status === 'downloaded') {
      setStatus(`Обновление ${version || ''} загружено`);
      showUpdateReady(version);
      if (version && RELEASE_NOTES[version]) {
        els.releaseNotesTitle.textContent = 'Что нового в обновлении';
        els.releaseNotesVersion.textContent = `Версия ${version}`;
        renderReleaseNotes([version]);
      }
      return;
    }
    if (status === 'not-available') {
      setStatus(`Обновление: ${message}`);
      return;
    }
    if (status === 'error') {
      setStatus(`Обновление: ${message}`);
      updateError(message);
    }
  }

  /* ── Update Available Popup ── */

  function showUpdateModal(version) {
    if (!els.updateAvailableModal) return;
    if (els.updateVersionText) {
      els.updateVersionText.textContent = version ? `Версия ${version}` : 'Новая версия';
    }
    if (els.updateStatusText) {
      els.updateStatusText.textContent = 'Загрузка обновления...';
    }
    if (els.updateProgressBar) {
      els.updateProgressBar.classList.remove('hidden');
    }
    if (els.updateProgressFill) {
      els.updateProgressFill.style.width = '0%';
    }
    if (els.updateInstallBtn) {
      els.updateInstallBtn.classList.add('hidden');
    }
    els.updateAvailableModal.classList.remove('hidden');
  }

  function updateDownloadProgress(percent) {
    const safePct = Math.max(0, Math.min(100, percent));
    if (els.updateProgressFill) {
      els.updateProgressFill.style.width = `${safePct}%`;
    }
    if (els.updateStatusText) {
      els.updateStatusText.textContent = `Загрузка: ${safePct}%`;
    }
  }

  function showUpdateReady(version) {
    if (els.updateStatusText) {
      els.updateStatusText.textContent = version
        ? `Версия ${version} готова к установке`
        : 'Обновление готово к установке';
    }
    if (els.updateProgressBar) {
      els.updateProgressBar.classList.add('hidden');
    }
    if (els.updateInstallBtn) {
      els.updateInstallBtn.classList.remove('hidden');
    }
    if (els.updateAvailableModal) {
      els.updateAvailableModal.classList.remove('hidden');
    }
  }

  function updateError(message) {
    if (els.updateStatusText) {
      els.updateStatusText.textContent = message || 'Ошибка обновления';
    }
    if (els.updateProgressBar) {
      els.updateProgressBar.classList.add('hidden');
    }
  }

  function closeUpdateModal() {
    if (els.updateAvailableModal) {
      els.updateAvailableModal.classList.add('hidden');
    }
  }

  async function installUpdate() {
    if (!window.waDeck?.installDownloadedUpdate) {
      setStatus('Установка обновления недоступна');
      return;
    }
    if (els.updateInstallBtn) {
      els.updateInstallBtn.classList.add('is-busy');
      els.updateInstallBtn.disabled = true;
    }
    const result = await window.waDeck.installDownloadedUpdate().catch(() => null);
    if (!result?.ok) {
      setStatus('Не удалось установить обновление');
      if (els.updateInstallBtn) {
        els.updateInstallBtn.classList.remove('is-busy');
        els.updateInstallBtn.disabled = false;
      }
    }
  }

  /* ── Release Notes ── */

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

    if (!els.releaseNotesTitle || !els.releaseNotesVersion || !els.releaseNotesModal) return;
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
    closeUpdateModal,
    installUpdate,
  };
})();
