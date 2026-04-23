# Changelog

## 0.7.0

**Первый polished-релиз** — серия аудитов дизайна, кросс-платформенного ревью и hardening-фиксов привела к существенной переделке UX, улучшению производительности на слабых машинах и укреплению security-модели.

### Переделка интерфейса
- Единый drawer-паттерн для всех настроек (шаблоны, отложенные сообщения, мировые часы, погода, интерфейс) с back-навигацией и иконкой в header. Убраны полноэкранные оверлеи шаблонов и floating schedule-popover — всё в правой панели.
- Редактирование шаблона теперь inline в том же drawer'е (раньше открывалось отдельное окно). В header'е формы: заголовок `Новый шаблон / Редактирование · <имя>` + кнопка закрытия.
- Список шаблонов рендерится lazy: категории свёрнуты по умолчанию, items появляются только при expand. Для 500 шаблонов — ~20 DOM-узлов на старте вместо 500+.
- Отложенные сообщения: chunked render (первые 30 + кнопка «Показать ещё (N)») — не виснет при 200+ записях.
- Chat picker в отложенной отправке показывает только чаты **активного** аккаунта (убрано переключение между аккаунтами внутри модала). Время отправки теперь всегда свежее при открытии drawer'а.
- Footer дашборда: `Добавить WhatsApp` (filled primary зелёный) / `Добавить Telegram` (outline) / шестерёнка (icon-only) — выстроена иерархия действий.
- Toolbar: компактные часы (убран лишний chip `MSK·KYIV·BER·LON`, зоны остались в hover-popover). Status-pill — теперь оформлен с border/background и auto-clear через 3с; debug-инфо (Electron/Chromium версии) убрана.
- Темы: dark и light объединены единым визуальным языком. Фон дашборда — subtle dot-grid вместо гор/солнца/звёзд/облаков. Новая палитра account-цветов (8 различимых оттенков без дубликатов красного).
- Семантические signal-токены: `--signal-error`, `--signal-warn`, `--signal-info`, `--signal-ok`. Красная точка «Нет активного WhatsApp» заменена на amber warn, unread-индикатор в toolbar — на accent вместо red.

### Доступность
- Глобальный `prefers-reduced-motion: reduce` — все анимации схлопываются при системной настройке «Уменьшить движение».
- Focus-visible fallback для всех interactive-элементов (2px green ring).
- Hit-area 32×32 у всех close-кнопок (× в панелях, модалах).
- Контраст toolbar-меток повышен (10px → 11-12px, темнее серый).

### Производительность
- **Lazy-load webviews:** при старте приложения webview'ы создаются с задержкой 400мс между каждым — UI отзывчив сразу, unread-счётчики заполняются в фоне. Для 30 аккаунтов стартовая загрузка быстрее и плавнее.
- **Idle-suspend webviews:** при бездействии >15 минут webview уничтожается, сохраняя session-cache (login остаётся). При повторной активации — мгновенная reload. Экономия памяти для power-users: ~2GB+ при 30-аккаунтном сетапе.
- Translator MutationObserver: batched flush через 120мс вместо fire-on-every-mutation — снижение CPU на слабых GPU.
- Cache-limits: CRM hover cache LRU-200, translator translation cache LRU-500.
- Single-entry chatPickerCache (Map → одна запись для активного аккаунта).

### Исправления багов
- Иконка удалённого аккаунта больше не висит в sidebar до рестарта — `renderAccounts()` + `updateHubDashboard()` вызываются всегда после удаления.
- Время в «Отложенная отправка» по умолчанию = текущее системное при каждом открытии раздела (раньше отставало на несколько минут).
- Toggle Переводчика/CRM hover больше не сбрасывает температуру погоды в toolbar.
- CRM hover popover теперь flip'ается влево если не помещается справа, z-index выше WhatsApp webview content, transition на позицию.
- Hero-card на дашборде не растягивается в пустое пространство при малом числе аккаунтов (`height: fit-content`).
- Sidebar `+` кнопка добавления аккаунта — sticky bottom, не исчезает при длинном списке.
- Sidebar и hub: счётчик непрочитанных не слипается с именем, цветная полоса карточки убрана (цвет только в chip-аватаре).

### Security & Data integrity
- **Path traversal защита:** иконки аккаунтов копируются в `userData/icons/<id>_<hash>.ext` с size-limit 10MB; вложения отложенных сообщений проверяются по whitelist (только внутри `$HOME`, блок на `.ssh/.gnupg/.aws/.docker/Keychains`), case-insensitive на Windows/macOS.
- **Validation IPC:** централизованные `LIMITS.*` для всех user-supplied строк (`ACCOUNT_NAME:60`, `TEMPLATE_TEXT:50000`, `MESSAGE_TEXT:65000`, `TRANSLATE_TEXT:20000` и т.п.); quota-limits (`TEMPLATES_PER_USER:5000`, `SCHEDULED_PER_USER:2000`).
- **Color validation:** `set-account-color` принимает только hex (`^#[0-9a-f]{3-8}$`).
- **Auto-update:** `autoInstallOnAppQuit=false` — обновление только по явной команде пользователя. Supply-chain risk (compromised GitHub) снижен.
- **Store safety:** `STORE_MAX_SIZE=50MB` против OOM при corrupt JSON; atomic save через `.backup` — recovery при power-loss.

### Кросс-платформа
- Windows NSIS: `oneClick: false`, `allowToChangeInstallationDirectory: true` — install без admin, с выбором папки и созданием shortcuts.
- **Windows portable** target добавлен — `.exe` без install, для restricted-окружений.
- Electron **41.2.0 → 41.2.2** (+23 CVE backports, fix PDF save, AudioWorklet nodeIntegration, always-on-top events). Chromium 146.0.7680.188.
- `npm audit fix` — обновлены транзитивные уязвимости (lodash, brace-expansion, picomatch).
- Удалён дубликат CI workflow (`build-windows.yml`) — race на артефактах устранён.

### Техдолг / cleanup
- Удалено ~900 строк dead-кода: `.hub-clouds/.hub-star/.hub-cloud-drift`, `.tq-*` (~17KB CSS), fullscreen template-edit модал, schedule-popover, mountain SVG фоны, `Playground-Beta/` каталог (~600MB).
- Устаревшие memory/cache Map'ы упрощены до single-entry.

## 0.6.5

### Исправления ошибок
- Переводчик: пузыри перевода входящих больше не наслаиваются друг на друга и не уходят под исходящие (зелёные) сообщения. Высота ряда теперь растягивается под длину перевода, поэтому оверлей всегда помещается в пределах своего сообщения. При закрытии пузыря и смене чата высота корректно сбрасывается.
- CRM: чекбокс «Hover» теперь гарантированно отключается после сохранения. Устранена гонка, при которой in-flight запрос на прогрузку карточки (запущенный hover'ом до сохранения) мог перезаписать свежее значение устаревшим. Видимый hover-попап принудительно скрывается, если Hover был выключен.

## 0.6.4

### Исправления ошибок
- Переводчик: панель больше не пропадает в некоторых чатах. `getChatId()` использует 6 fallback-селекторов вместо одного, фильтрует статусы ("online", "typing"), grace period увеличен до 5 секунд.
- Переводчик: кэш переводов очищается при смене чата — устранены «призрачные» оверлеи от предыдущего чата.
- Переводчик: ошибки в tick-цикле логируются вместо молчаливого проглатывания.
- CSS: удалены дубликаты `@keyframes` (panelSlideIn, modalBackdropIn), устранены конфликты анимаций (unreadPop vs badgePop).
- CSS: `backdrop-filter` убран из keyframe-анимации (не анимируется в браузерах).
- Производительность: `activeGlow` и `badgePulse` ограничены конечным числом итераций вместо infinite.
- Производительность: sweep входящих сообщений для авто-перевода запускается каждые 3с вместо 1с.

### Новые возможности
- CRM: чекбокс «Hover» — включение/выключение hover-попапа для каждого контакта отдельно. Настройка сохраняется в CRM-файле и переживает перезапуск.

### Улучшения интерфейса
- Типографика: контраст muted-текста повышен по всему приложению (#7e8ea0 → #95a0b4), hardcoded цвета заменены на CSS-переменные.
- Кнопки: упругий bounce при клике (scale 0.97), primary кнопки с gradient shine при hover.
- Карточки аккаунтов: glow при hover, пульсирующая зелёная рамка на активном, bounce-анимация unread-бейджа.
- Модалки: spring-анимация при открытии, усиленный backdrop blur (8px), многослойные тени.
- Поповеры (погода, расписание, шаблоны): glassmorphism (blur 12-16px + saturate), slide-in анимация.
- Settings panel: slide-in при открытии, секции подсвечиваются при hover, открытые секции с зелёным оттенком.
- Скроллбары: единые по всему приложению (5px, скруглённые, полупрозрачные), кросс-платформенные.
- Сайдбар: scroll-кнопки крупнее с зелёной подсветкой, статус-точки и unread-бейджи увеличены.
- Hub: часы 26px, подписи контрастнее, таблица аккаунтов крупнее, кнопки внизу увеличены.
- Шаблоны: палитра шире (440px) с glassmorphism, категории и элементы крупнее, поиск 14px.
- Переводчик: панель выше (38px), кнопки языков шире (82px), toggle switch увеличен.
- Windows: расширен font stack (system-ui, -apple-system) для корректного отображения шрифтов.

## 0.6.3

### Новые возможности
- Переводчик: автоперевод входящих сообщений WhatsApp с overlay поверх бабла (direction: `auto → русский`, фиксировано). Включается тумблером «Авто вх. → Русский» в баре.
- Панель переводчика разделена на две независимые секции: слева — тумблер автоперевода входящих на русский, справа — дропдауны `from → to` с кнопкой «Перевести» для исходящих (как в 0.6.2). Настройки обеих секций работают «в моменте» — живут в рамках сессии webview, без запоминания per-contact, чтобы избежать путаницы между двумя независимыми потоками перевода.
- Панель переводчика теперь всегда видна при открытом чате. Кнопка ✕ справа скрывает её до следующего переключения чата.

### Исправления ошибок
- Переводчик: бар переводчика исходящих сообщений больше не пропадает после SPA-перестройки WhatsApp (раньше помогала только перезагрузка аккаунта). Переинъекция при каждом такте, проверка `isConnected`.
- Переводчик: исправлено накопление input-listener'ов на composer WhatsApp (вызывало зависание и невозможность загрузить WhatsApp Web). Все наблюдатели (#main, composer) работают с dedup-флагами и единственной retry-цепочкой.

### Улучшения интерфейса
- CRM: убраны поля «Имя фамилия» и «Страна город» — их содержимое автоматически переносится в начало поля «О контакте» при первом открытии существующего контакта.
- CRM: временная метка кнопки «+ Запись» упрощена до даты без времени (формат `[DD.MM] `).
- Удаление аккаунта теперь каскадно чистит локальные данные: файлы CRM этого аккаунта + localStorage webview (включая настройки переводчика per-contact).

## 0.6.2

### Новые возможности
- Переводчик текста (Translator Bar) — встроенная интеграция Google Translate для выделенного текста в composer.
- Внешние ссылки из WhatsApp теперь открываются в системном браузере.

### Исправления ошибок
- Translator Bar надёжно появляется после перезагрузки аккаунта WhatsApp.
- Устранена проблема «Повтор» при установке обновления на Windows: корректный flush данных и предотвращение двойной установки.
- Добавлена иконка .ico для корректного отображения в таскбаре и на рабочем столе Windows.

## 0.6.1

### Обновление платформы
- Electron 41.2.0 (Chromium 146.0.7680.179, Node.js 24.14.0)

### Исправления ошибок
- Категории шаблонов теперь сохраняются при перезапуске приложения.
- Исправлена миграция CRM-контактов: инвертированная логика больше не пропускает валидные записи.
- Устранена утечка event listener'ов в контекстном меню.
- Исправлен кеш CRM popover: корректная эвикция через `trimMapSize`.
- Добавлена защита от двойного вызова закрытия модалок.
- Debounce сохранения состояния категорий шаблонов.
- Замена приватного `app._quitting` на стабильный модульный флаг.
- Добавлено логирование критических ошибок: загрузка store, dock badge.

### Улучшения интерфейса
- Анимация закрытия модальных окон: fade-out + scale-down.
- `focus-visible` состояния для всех интерактивных элементов.
- Светлая тема: исправлены стили фокуса, primary-кнопки и hover карточек.
- Глобальные placeholder-стили для полей ввода.
- Hover-эффект на элементах списка запланированных сообщений.
- Унифицированные скроллбары во всех панелях и модалках.
- Около 40 hardcoded-цветов заменены на CSS-переменные.
- Систематизированы `z-index` через CSS-переменные.
- Увеличена видимость resize-ручки сайдбара.
- Удалены дублирующиеся CSS-правила.

## 0.5.1

### UX Improvements
- Активный аккаунт: белая левая полоса и scale-индикатор.
- Toolbar: разделители между группами и новая иконка отложенной отправки.
- CRM hover popover: перетаскивание за header и задержка скрытия 600ms.
- Палитра шаблонов показывает целевой аккаунт и блокирует вставку без активного чата.
- Sidebar unread badges увеличены, добавлена пульсация.
- Hub dashboard: WA/TG иконки типа аккаунта и ghost-style action buttons.
- Scheduled send: UI разделён на форму и список карточек со счётчиком.
- Усилен backdrop модалок, улучшен focus management.
- Кнопки async-сценариев получили spinner и более заметный disabled-state.
- Отмена scheduled send теперь требует подтверждения, редактирование сохраняет старый текст.
- Light theme: улучшен контраст badge и readonly input styling.
- Для icon-buttons автоматически проставляются aria-label.

### Security and Stability
- Добавлен Content-Security-Policy в renderer.
- shell.openExternal ограничен только http/https.
- BrowserWindow переведён в sandbox: true.
- Восстановление webview после render-process-gone через auto-reload.
- Глобальные обработчики ошибок и flush store перед before-quit.

### Performance
- Удалён disable-renderer-backgrounding: экономия 60-80% idle CPU при 20+ аккаунтах.
- Опрос непрочитанных разбит на батчи по 6 webview с паузой 500ms.
- Hub dashboard теперь debounce-ится вместо 30 rebuild за цикл.

### Removed
- Удалён переводчик DeepL/LibreTranslate.
- Удалён нерабочий YouTube mini-player.
- Electron обновлён с 40.8 до 41.1.1 (Chromium 146.0.7680.166).

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
