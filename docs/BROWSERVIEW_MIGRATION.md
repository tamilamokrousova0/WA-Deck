# BrowserView Migration — Roadmap

## Why migrate

Current architecture: каждый аккаунт — `<webview>` тег внутри renderer DOM. Все 10–20 webview-ов живут в одном rendering tree, переключение управляется CSS classList. Все «инжекторные» скрипты (bridge.js, keep-alive.js, translator-bar.js, …) вкладываются через `webview.executeJavaScript(...)` после `dom-ready`.

Boundary problems этой модели:

1. **Switch lag** — при `setActiveAccount` renderer всегда делает работу пропорциональную числу webview (classList toggle, refreshWebviewVisibility, scheduleDockBadgeSync, …).
2. **Тяжёлый renderer.js** — 6000+ строк, потому что он одновременно «host UI» и «контроллер контента 20 вкладок».
3. **Listeners на webview** живут в renderer-side и должны вручную сниматься (cleanupWebview).
4. **Compositor pressure** — 20 hidden webview всё равно учитываются в layout/paint passes Chromium.
5. **Process model** — все webview прицеплены к одному hostWebContents, что ограничивает изоляцию: краш одного может задеть параллельные вкладки на уровне scheduler.

`BrowserView` устраняет всё это: каждая «вкладка» — отдельный WebContents в main процессе, привязанный к окну через `addBrowserView`/`setTopBrowserView`, со своим preload-скриптом и lifecycle.

## Target architecture (по образцу Franz)

```
main.js
 └── ServiceManager          (state.services: BrowserView[])
      ├── createService(account) → BrowserView с partition + preload
      ├── activateService(id)    → setTopBrowserView + focus
      ├── hibernateService(id)   → window.removeBrowserView (НЕ destroy)
      ├── destroyService(id)     → forcefullyCrashRenderer + remove
      └── resizeAll(bounds)      → setBounds для всех видимых

renderer/renderer.js
 └── только host UI: sidebar, settings, schedule, hub. НЕ управляет контентом.
     ResizeObserver на контейнере → IPC RESIZE_SERVICE_VIEWS → main.

src/preload-service.js (новый)        ← preload для каждого BrowserView
 └── window.WaDeck = { setBadge, sendCRMHover, requestTranslate, ... }
     поглощает функционал текущих webview-scripts/*.js

src/services/recipes/whatsapp.js      (опционально, по аналогии с Franz recipe)
 └── overrideUserAgent, knownCertificateHosts, modifyRequestHeaders
```

## Phasing — 6 фаз, ~2-3 недели одного разработчика

### Phase 0 — подготовка (½ дня)

- Скопировать `src/main.js`, `src/preload.js`, `src/renderer/renderer.js` в `legacy/` для отката.
- Завести feature-флаг `BROWSER_VIEW_MIGRATION` в env, чтобы можно было запускать обе модели параллельно во время разработки.
- Добавить debug-логи `console.time`/`console.timeEnd` в горячие пути (setActiveAccount, ensureWebview), зафиксировать baseline на webview-модели.

### Phase 1 — ServiceManager skeleton + preload (2-3 дня)

- Создать `src/services/ServiceManager.js`:
  ```
  class ServiceManager {
    constructor({ window, store }) { this.views = new Map(); ... }
    create(account) { /* new BrowserView({ webPreferences: { partition, preload, contextIsolation: true, sandbox: true } }) */ }
    activate(id)   { this.window.setTopBrowserView(view); view.webContents.focus(); }
    detach(id)     { this.window.removeBrowserView(view); }
    destroy(id)    { try { view.webContents.forcefullyCrashRenderer(); } catch {} this.window.removeBrowserView(view); }
    resizeAll(b)   { for (const v of this.views.values()) v.setBounds(b); }
  }
  ```
- `src/services/preload.js` — заменяет вложение webview-scripts/*.js. Через `contextBridge.exposeInMainWorld('waDeck', { ... })` экспонирует то же API, что сейчас инжектится через executeJavaScript.
- Один сервис в качестве смоук-теста: создаёт BrowserView, грузит web.whatsapp.com, видим его в окне.

### Phase 2 — IPC API для UI-host'а (2 дня)

- Перенести **handler-ы**, дёргавшиеся раньше из renderer через `webview.executeJavaScript(...)`, на IPC:
  - `service:exec-js` (для тех мест где правда нужен executeJavaScript — например, `collectChatsFromSidebarScript`)
  - `service:set-input` (sendInputEvent аналог)
  - `service:get-state` (загрузился? сколько unread?)
  - `service:reload`, `service:open-devtools`
- Все 10 webview-scripts (bridge, keep-alive, unread-count, crm-*, voice-message, translator-bar, …) — **переехать в preload-service.js или вызываться через `webContents.executeJavaScript` из main**, не из renderer.

### Phase 3 — UI host: ResizeObserver + state sync (2 дня)

- В renderer: компонент-плейсхолдер `<div class="services-container">`. ResizeObserver на нём → IPC `RESIZE_SERVICE_VIEWS` с `bounds` → main вызывает `serviceManager.resizeAll`.
- Заменить весь `setActiveAccount → refreshWebviewVisibility` на один IPC `service:activate` → main делает `setTopBrowserView`. **Это самый большой выигрыш.** Renderer больше не обходит N webview-ов на каждый switch.

### Phase 4 — модули (CRM/translator/unread/schedule) на новый API (3-4 дня)

- `unread.js` — сейчас polls renderer-side через `safeExecuteInWebview`. Переехать на: main process polls (`setInterval(2s)` per service), отправляет `'poll'` в preload, тот запускает recipe-side функцию (как в Franz `Franz.loop(getMessages)`).
- `crm.js` — IPC из preload в main, потом из main в host renderer.
- `translator-bar.js` — preload-script держит state, host renderer не видит DOM сообщений напрямую.
- `schedule.js` — `runScheduledSend` дёргает main `service:send`, main грузит attachments через `webContents.debugger.attach` уже сейчас, остаётся таким же.

### Phase 5 — параллельный запуск + миграция данных (1 день)

- Под флагом `BROWSER_VIEW_MIGRATION` запустить новую модель рядом со старой. Юзер может переключаться через скрытый toggle.
- Существующие partition-данные (`persist:wa_<id>`) **переносятся 1:1** — формат партиций один и тот же между webview и BrowserView.

### Phase 6 — снос старой модели (½ дня)

- Удалить `webviewTag: true` в BrowserWindow webPreferences.
- Удалить `setupWebviewGuards`, dead-code `startIdleWebviewSweeper`, `cleanupWebview`, `state.webviews` Map.
- Удалить директорию `webview-scripts/`.
- Релиз 0.8.0 (мажорный bump — подсетка изменилась).

## Trade-offs

**Что улучшится:**
- Switch между аккаунтами — мгновенный (`setTopBrowserView`).
- Каждая «вкладка» — отдельный изолированный процесс, краш одной не задевает остальные.
- Чистый разрыв host/content — renderer.js усохнет с 6k до ~3k строк.
- Hibernate (detach without destroy) — Franz-style, реальная экономия RAM без потери логина.
- Автоматический backgrounding неактивных BrowserView — они не учитываются в paint pipeline, GPU pressure уменьшится.
- Можно ввести process-per-service crash recovery без custom IPC.

**Что усложнится:**
- DevTools на каждый сервис — отдельная команда `service:open-devtools` (сейчас просто Cmd+Alt+Shift+I в webview).
- Drag&drop файлов на webview — нужен ручной IPC с `dragenter`/`drop` на renderer-овский placeholder + send-to-service. Сейчас работает «само» благодаря webview tag.
- Z-index трюки (наши overlays на сообщения) — overlay должен жить **внутри** preload-script (как сейчас translator-bar.js), потому что host-side overlay не может рисовать поверх BrowserView (он непрозрачный по архитектуре).

## Когда стартовать

Не раньше чем:
1. Текущие baseline-фиксы (этот спринт) проверены в живом 1-недельном использовании.
2. Все voice-message / CRM / scheduled-send потоки покрыты smoke-сценариями (хотя бы вручную) — иначе при миграции легко потерять что-то.
3. Свободный спринт без блокеров — миграция требует full attention, по кускам делать опасно (renderer.js слишком связный).

## Риски

- **#1 (high)** — voice messages используют CDP debugger через webview.getWebContentsId. После миграции у нас будет webContents.id у BrowserView напрямую — должно работать без изменений, но требует проверки.
- **#2 (med)** — `attach + DOM.setFileInputFiles` для send-attachments в schedule.js: уже работает через CDP в main, миграция тривиальна.
- **#3 (low)** — пользовательские пин-карточки и порядок в sidebar: state хранится в `state.store.accounts`, никак не привязан к webview-ам.

## Альтернатива: НЕ мигрировать

Если текущая стабильность после этого спринта всех устроит — миграцию можно отложить. webview-архитектура работает, и фиксы из последних релизов (powerMonitor resume, orphan partitions, hibernation opt-in) закрывают большую часть пользовательских жалоб без архитектурных изменений.

Стоит мигрировать тогда, когда:
- появляется потребность в реально настольной hibernate-стратегии для 30+ аккаунтов на скромном железе;
- появляются жалобы «один аккаунт грузит CPU и тормозит остальные» — process-per-service это решит;
- мы хотим расширяться на другие мессенджеры (Signal, Discord, Slack) — архитектура с recipe-mod как у Franz позволит добавлять их пакетно.
