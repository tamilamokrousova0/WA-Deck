# Changelog

## 0.4.5

### Bug Fixes
- Windows: отложенная отправка теперь работает при Режиме эффективности — webview автоматически пробуждается.
- Scheduler: добавлен retry с reload при `search_input_not_found` вместо немедленного падения.

## 0.4.4

### Bug Fixes
- Telegram: исправлен статус «загрузка» — SPA-навигация больше не сбрасывает ready-состояние.
- Telegram: уведомления о непрочитанных сообщениях теперь работают.
- Шаблоны и перевод: восстановлена критическая функция `encodeBase64Utf8`, ошибочно удалённая при аудите.

## 0.4.3

### New Features
- Telegram support expanded alongside WhatsApp with dedicated account type handling.
- Type selector popover on `+`: add WhatsApp or Telegram via icon choice.
- Separate Telegram webviews with own session partition and navigation guards.
- WhatsApp-specific scripts are no longer injected into Telegram webviews.
- Type badges on account cards: green `WA` / blue `TG`.
- 50-color palette in account management modal.
- CRM hover popover improved with mouse wheel scrolling and adaptive height.

### Bug Fixes
- Fixed Telegram account type being lost after app restart by preserving `type` in `sanitizeStore`.
- Fixed `will-navigate` guard incorrectly blocking Telegram navigation.
- Fixed WhatsApp user-agent being forced on Telegram webviews.
- Fixed sidebar resize handle `z-index` overlapping modals.
- Fixed duplicate `type="button"` attributes on 7 buttons.
- Added missing `-webkit-backdrop-filter` prefixes in 3 places.
- Hub fixed on Windows with 12+ accounts.

### Windows
- Added `disable-renderer-backgrounding` to prevent Windows Efficiency Mode from suspending webview processes.

### Performance
- CPU usage reduced by roughly 40-60% in background through adaptive polling and batched DOM updates.
- Telegram navigation slowdowns removed.
- Sidebar now appears immediately on startup: `renderAccounts` runs before creating webviews.
- Account switching no longer flickers: only `.active` class toggles.

### Code Quality
- Removed dead CSS: `.sidebar-group*`, `.translation-*` orphaned selectors.
- Removed dead JS: `encodeBase64Utf8`, `collapsedGroups` orphan state.
- Added missing `hostEscapeUnsubscribe` state declaration.
- Removed noisy `console.log` calls from dock badge and unread polling.
- Toolbar now auto-hides freeze/CRM buttons for Telegram accounts.
- Hub dashboard now has separate `+ WhatsApp` / `+ Telegram` buttons.
- Includes 20+ fixes from triple production audit across CSS / JS / HTML.

## 0.4.1

### Windows hotfix
- Исправлен CI workflow релиза: Windows installer и `latest.yml` теперь публикуются корректно вместе с macOS артефактами.
- Убран конфликт двойной публикации release между build jobs и release job.

## 0.4.0

### New Features
- **Telegram support**: можно добавлять Telegram Web аккаунты наряду с WhatsApp.
- При нажатии `+` открывается выбор типа аккаунта с иконками WhatsApp / Telegram.
- Для Telegram используется отдельный webview со своей session partition и navigation guards.
- В Telegram webview не инжектируются WhatsApp-специфичные скрипты.
- На карточках аккаунтов отображаются type-badges: зелёный `WA` / синий `TG`.
- В управлении аккаунтом добавлена палитра из 50 цветов.
- CRM hover popover улучшен: скролл колёсиком и адаптивная высота.

### Bug Fixes
- Исправлена потеря типа Telegram-аккаунта после рестарта приложения: `type` добавлен в `sanitizeStore`.
- Исправлен `will-navigate` guard, блокировавший Telegram webview navigation.
- Исправлен forced WhatsApp user-agent для Telegram webviews.
- Исправлен `z-index` у sidebar resize handle, перекрывавший модальные окна.
- Исправлены 7 кнопок с дублирующимся `type=\"button\"`.
- Добавлены недостающие `-webkit-backdrop-filter` префиксы в 3 местах.

### Windows
- Добавлен флаг `disable-renderer-backgrounding`, чтобы Windows Efficiency Mode не усыплял webview-процессы.

### Code Quality
- Удалён мёртвый CSS: `.sidebar-group*`, `.translation-*` orphaned selectors.
- Удалён мёртвый JS: `encodeBase64Utf8`, `collapsedGroups` orphan state.
- Добавлено недостающее состояние `hostEscapeUnsubscribe`.
- Убраны шумные `console.log` из dock-badge и unread polling.
- В toolbar для Telegram-аккаунтов автоматически скрываются freeze/CRM buttons.
- В hub dashboard раздельные кнопки `+ WhatsApp` / `+ Telegram`.

## 0.3.2

### UI / UX
- CRM hover popover расширен: теперь во всплывающем окне показывается полный объём информации без агрессивного обрезания.

## 0.3.1

### Bug Fixes
- Исправлен скролл sidebar при 20+ аккаунтах: панель больше не клипует содержимое и корректно прокручивается при большом числе WhatsApp.

## 0.3.0

### UI / UX
- Полный редизайн интерфейса в стиле Lovable: аккаунты, модалы и настройки.
- Светлая тема хаба: голубое небо с солнцем и анимированными облаками.
- Тёмная тема: мерцающие звёзды на фоне ночного леса.
- Размер сайдбара теперь регулируется перетаскиванием.
- Виджет погоды получил кнопку закрытия и обновлённый стиль.
- Модалы обновления, релиза и подтверждения приведены к единому hero-дизайну.
- CRM-модал переделан в секционную форму с полями контакта и заметок.

### Code Quality
- Выполнен production-аудит: удалён мёртвый CSS, исправлены конфликтующие анимации, на все кнопки добавлен `type="button"`.

## 0.2.4

### Windows hotfix
- Исправлен релизный CI/CD workflow: Windows hotfix теперь публикуется корректно в GitHub Releases.
- Обновление предназначено для Windows-клиентов через `electron-updater`.
- macOS для этого hotfix не пересобирается.

## 0.2.3

### Windows hotfix
- Исправлена ошибка Windows-сборки/установки в ветке `0.2.2`.
- Обновление предназначено в первую очередь для Windows-клиентов через `electron-updater`.
- macOS-пакет для этого hotfix не пересобирается в CI.

## 0.2.2

### New Features
- **Hub network icon**: New minimalist hub-network app icon for Dock, taskbar and sidebar branding
- **Animated sidebar brand**: Hub network SVG in top-left corner with pulse-on-click animation
- **Hub screen animation**: Animated network visualization on the hub dashboard
- **YouTube mini-player**: Play button next to YouTube links; opens video in a draggable always-on-top window

### Bug Fixes
- **Atomic store writes**: saveStore now uses a write queue + atomic rename to prevent data corruption from concurrent IPC handlers
- **Scheduled message recovery**: Messages stuck in 'processing' (e.g. after crash) are auto-recovered to 'pending' on startup
- **Hover-translate deduplication**: Fixed text appearing multiple times when translating image messages with captions
- **Image caption extraction**: Caption extracted directly from media messages to avoid duplicate text
- **Webview init resilience**: One failed webview no longer prevents other accounts from loading

### Code Quality
- **Security**: Replaced string interpolation with JSON.stringify in webview script injection
- **Dead code removal**: Removed unused unread-details.js, stale event listeners, and obsolete frog icon code
- **Listener leak fix**: onHostEscape subscription now properly stores unsubscribe function

## 0.2.1

### Core
- Улучшена отложенная отправка текста и работа с webview в локальной версии.
- Усилен hover-перевод, поведение popover и извлечение текста из сообщений.
- Улучшена работа с аккаунтами, unread-индикаторами и хабом.

### UI / UX
- Доработаны боковая панель, хаб, стрелки прокрутки и управление аккаунтами.
- Улучшены модальные окна, погодный виджет и поведение перевода по наведению.

### Stability
- Добавлены защитные проверки для добавления аккаунта, кэшей, поллинга unread и планировщика.
- Улучшена кроссплатформенная вставка текста и валидация времени отложенной отправки.

## 0.1.14

### UI / UX
- **Settings panel redesign**: SVG icons for theme toggle (moon/sun) and close button (X) with hover animations (wobble, spin, pop)
- **Scrollable settings panel**: Panel body now scrolls independently with thin custom scrollbar and bottom fade gradient
- **Card animations**: Collapsible cards reveal content with smooth fade+slide animation; chevron replaced with CSS border arrow
- **Button hover effects**: All buttons lift on hover with subtle shadow; primary buttons get green glow
- **Form focus states**: Inputs, selects, and textareas highlight with green border and glow on focus
- **Update available popup**: New in-app modal shows download progress and install button when update is available
- **Modernized toolbar icons**: All toolbar buttons replaced with SVG icons (refresh, snowflake, CRM users, gear) with hover animations
- **Tooltip on accounts**: Custom CSS tooltip on hover instead of native title attribute
- **Context menu**: Right-click menu on account cards (Refresh, Freeze, CRM, Manage, Delete)
- **Hub dashboard**: Summary of accounts with status and unread counts on hub screen
- **CRM note history**: "+ Note" button prepends timestamped entry to notes field

### Bug Fixes
- **Startup status**: Accounts show green (connected) status after webview loads, not stuck on yellow/loading
- **CRM modal overflow**: Save/Copy buttons always visible even with long content (max-height + scroll)
- **Unread detection**: Improved 3-tier detection (numbered badges, WhatsApp filter button text, page title fallback)
- **Removed unread popover**: Removed unreliable unread details popover feature

### Code Quality
- **Production code review**: Null guards on all DOM element accesses, JS injection prevention with JSON.stringify
- **Promise leak fix**: showConfirm resolves previous pending promise before creating new one
- **Stale closure fix**: Account listeners use ID lookup instead of capturing object reference
- **Debounced DOM helpers**: bindDomHelpers debounced with 300ms timeout to prevent excessive re-renders
- **Dead code removal**: Removed unused copy button code from hover-translate-bridge

### Platform
- **Windows compatibility**: Keyboard shortcuts use platform-aware modifier (Cmd on macOS, Ctrl on Windows)
- **Native dialog replaced**: Update-downloaded native dialog replaced with in-app renderer popup
