# Changelog

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
