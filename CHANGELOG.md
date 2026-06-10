# Журнал изменений

Все заметные правки пакета фиксируются здесь.

## 0.6.1 - 2026-06-10

- Added detailed Telegram transport logging: method, Telegram IP, attempt number, duration, curl rc and short error text.
- Added `debug_log`, `telegram_max_candidates` and `telegram_probe_interval` settings to keep diagnostics useful without blocking the daemon for minutes.
- Added `telegram_send_retries` so status/menu messages retry after transient Telegram transport timeouts.
- Added `telegram_resolve_ip=dns` mode to use normal DNS routing when direct Telegram IPs are unstable.
- Status panel delivery now falls back to a plain message if Telegram inline keyboard delivery times out.
- Added `telegram-status` CLI for testing the same status panel path used by `/status`.
- When `curl` is available, Telegram requests no longer fall through to slow `wget` retries after all curl candidates fail.
- The daemon now reaps duplicate `asic-watchdog daemon` processes that can keep old Telegram polling calls alive.
- LuCI now returns a real error when Telegram test delivery fails, and blocks duplicate miners with the same IP/API port.

## 0.6.0 - 2026-06-10

- Pool-test results are now sorted from best to worst by score.
- ASIC detail text now explains bad shares as `Битые шары 24ч: ср. / пик` instead of the shorter `bad ср.` label.

## 0.5.9 - 2026-06-10

- Changed `/pooltest btc|zec|all 300 10`: `300` is now the total test budget, not 300 seconds for every pool address.
- Telegram start message now says `общий лимит`, so the expected return time is clear.
- Existing long-running pool tests are stopped during install by the package process cleanup.

## 0.5.8 - 2026-06-10

- Переведены на русский главное Telegram-меню, ответы на кнопки, помощь и вывод теста пулов.
- В результате теста пулов теперь используются подписи `успешно`, `среднее`, `лучше`, `оценка` и `Лучший`.

## 0.5.7 - 2026-06-10

- Added Telegram main menu: `/menu` and `/start` now show buttons for Status, Refresh, ASIC list, BTC/ZEC/all pool tests, and Help.
- Added callback actions for pool tests, so BTC/ZEC ViaBTC tests can be started from buttons.
- `telegram-menu` CLI now sends the main function menu instead of only the status panel.

## 0.5.6 - 2026-06-10

- Added ViaBTC BTC/ZEC pool access test: `pool-test btc|zec|all [duration_sec] [interval_sec] [timeout_sec]`.
- Added Telegram command `/pooltest btc|zec|all 300 10`; long tests run in background and send the result back to the group.
- Added official ViaBTC BTC/ZEC targets, including `btc.powhashing.com` and `zec.powhashing.com`.
- Added LuCI/UCI settings: `pool_test_duration`, `pool_test_interval`, `pool_test_timeout`.
- The pool test checks TCP connect latency and success rate only; it does not switch ASIC pool settings automatically.

## 0.5.5 - 2026-06-09

- Telegram-запросы теперь перебирают несколько реальных IP `api.telegram.org` через `curl --resolve` и запоминают последний рабочий IP.
- Добавлен счётчик подряд идущих Telegram-ошибок и health-check `getMe` после `telegram_recover_failures` сбоев.
- Добавлены UCI/LuCI поля `telegram_resolve_ips` и `telegram_recover_failures`.
- Daemon теперь сам выходит, если потерял владение lock-файлом, чтобы два процесса не читали Telegram updates одновременно.
- Init/install теперь перед стартом добивают старый daemon `asic-watchdog`, если procd оставил его живым после обновления.
- Telegram polling now has its own stale-safe lock, so manual checks and daemon polling do not read updates in parallel.
- Extra daemon processes now exit when another process owns the lock; procd respawn is disabled to avoid duplicate pollers.
- Telegram `getUpdates` polling now uses POST with `timeout=0`, avoiding router/network hangs seen with GET long-polling.
- OpenWrt init no longer enables procd respawn for the daemon; Telegram/API failures are handled inside the daemon instead.

## 0.5.4 - 2026-06-09

- Из LuCI-деталей ASIC убраны мини-графики 24ч как малоинформативные.
- Оставлены компактные числовые показатели 24ч и текстовый блок анализа без тяжёлой визуальной части.
- Добавлен `telegram_heartbeat_interval`: периодический самотест доставки в Telegram-группу. По умолчанию выключен, чтобы не спамить.

## 0.5.3 - 2026-06-09

- Аптайм ASIC в Telegram-статусе теперь показывается в первой строке рядом со статусом.
- Аптайм в Telegram-деталях и LuCI форматируется как `2д 5ч`, `7ч` или `<1ч`, без сырых секунд и без минут.

## 0.5.2 - 2026-06-09

- В `status-json` добавлен `updated_ts` - epoch-время последнего успешного обновления статуса.
- Добавлен `status_stale_timeout` (по умолчанию 120 секунд): daemon проверяет возраст `status.json` и принудительно запускает новый цикл, если данные устарели.
- LuCI теперь показывает возраст статуса в секундах и подсвечивает строку, если статус устарел.
- Установщик добавляет новые UCI defaults в существующий `/etc/config/asic_watchdog`, не перетирая настроенные ASIC, Telegram и камеры.

## 0.5.1 - 2026-06-09

- Добавлена опция `telegram_resolve_ip`: если она задана и на роутере есть `curl`, Telegram API вызывается через `curl --resolve api.telegram.org:443:<ip>`.
- Это позволяет watchdog отправлять Telegram-сообщения на роутерах с Podkop/sing-box fake-IP DNS, не меняя общие настройки Podkop.
- Telegram polling, sendMessage, editMessageText и answerCallbackQuery переведены на общий helper `telegram_request`.

## 0.5.0 - 2026-06-09

- История ASIC расширена: кроме хеша и шар теперь хранится температура, минимум вентилятора и процент битых шар за последние 48 часов в `/tmp/asic-watchdog/history-*.tsv`.
- В LuCI-деталях ASIC добавлены мини-графики за 24 часа: хеш, температура и битые шары.
- В LuCI добавлен блок `Анализ 24ч` с короткими подсказками по просадке хеша, перегреву, вентиляторам и rejected/bad shares.
- В Telegram-деталях ASIC добавлена строка 24ч: средняя/максимальная температура, минимальный вентилятор и средний bad%.
- Telegram update parser усилен для `message`, `edited_message`, `channel_post`, `edited_channel_post` и callback; ответ Telegram перед разбором склеивается в одну строку, чтобы переносы JSON не теряли `chat.id` и `text`.
- Добавлен лог результата отправки/редактирования Telegram-панели, чтобы было видно, почему команда могла не ответить.
- Все Telegram API вызовы получили таймаут `telegram_timeout` (по умолчанию 12 секунд); CLI-команды `telegram-test` и `telegram-menu` теперь честно возвращают ошибку, если отправка не удалась.
- Лог `telegram poll failed` ограничен до одного сообщения в минуту, чтобы недоступный Telegram API не забивал системный журнал.
- Добавлена защита от зависшего `run-once`: если проверка держит lock дольше `monitor_timeout` (по умолчанию 180 секунд), пакет останавливает зависший процесс и продолжает мониторинг.

## 0.4.0 - 2026-06-09

- Добавлена история сэмплов ASIC в `/tmp/asic-watchdog/history-*.tsv` за последние 48 часов без записи во flash.
- Для каждого ASIC считается средняя скорость добычи за 24 часа и выводится в Telegram compact panel как `текущий/24ч`.
- Добавлены показатели шар: принято сегодня, принято вчера к этому же времени и процент разницы `+N%` или `-N%`.
- LuCI-панель показывает `24h` и `шары Δ` в строке ASIC, а в деталях добавлен блок `Сутки и шары`.
- Telegram детали ASIC показывают средний хеш за 24ч и сравнение шар сегодня/вчера.
- `status-json` теперь собирается через уникальный временный файл `status-$$.json.tmp`, чтобы параллельные проверки не портили JSON.

## 0.3.4 - 2026-06-09

- Установщик теперь очищает все варианты LuCI cache: `/tmp/luci-indexcache*` и `/tmp/luci-modulecache*`, а не только точный файл `/tmp/luci-indexcache`.
- После установки дополнительно reload/restart `uhttpd`, чтобы новый пункт `Services -> ASIC Watchdog` появлялся в меню без ручной перезагрузки роутера.
- Проверено на роутере `100.72.73.45`: menu/ACL файлы на месте, helper отвечает, cache очищен, `rpcd/uhttpd` перезагружены, сервис `asic-watchdog` работает.

## 0.3.3 - 2026-06-09

- Проверка ASIC теперь запускается в фоне из daemon-loop, чтобы Telegram polling не блокировался на долгом API-опросе майнеров.
- Фоновая проверка запускается отдельным процессом `run-once`, чтобы PID в `monitor.lock` был настоящим и lock не зависал на PID daemon.
- Кнопка `🔄 Обновить` сразу редактирует открытую панель, запускает свежую проверку в фоне и повторно редактирует эту же панель после завершения проверки.
- Парсер `chat.id` для Telegram updates сделан устойчивее к изменению порядка полей внутри объекта `chat`.
- Добавлен fallback-разбор `chat.id`, `text`, `data` и `message_id` из всего Telegram update, если точный разбор `message`/`callback_query` не сработал.
- Временные файлы Telegram-панели переведены на уникальные `mktemp`, чтобы параллельные обновления панели не конфликтовали.

## 0.3.2 - 2026-06-09

- Кнопка Telegram `🔄 Обновить` теперь редактирует открытую панель через `editMessageText`, а не отправляет новую панель ниже.
- В шапку Telegram-панели добавлено время отрисовки `панель HH:MM:SS`, чтобы было видно, когда именно обновилась открытая панель.
- Callback parser теперь извлекает `message_id` из Telegram callback query и передаёт его в обработчик обновления.

## 0.3.1 - 2026-06-09

- Telegram-тревоги ASIC и строки `/status`/`/miners` переведены на компактный двухстрочный формат: `🔥 имя · статус` и строка метрик `⚡️ хешрейт ❌ bad%🌡 температура 🌀 rpm`.
- Имя ASIC в компактных строках остаётся кликабельной ссылкой на `http://IP`, сам IP в тексте не выводится.

## 0.3.0 - 2026-06-09

- Добавлен отдельный тип UCI-секций `camera` для IP-камер.
- В LuCI добавлены таблица IP-камер, форма добавления камеры, редактирование, включение/выключение и удаление камеры.
- Watchdog теперь пингует IP-камеры в общем цикле мониторинга и пишет их состояние в `status-json` как `cameras`.
- Telegram отправляет одно уведомление, когда камера отключилась, и одно уведомление, когда камера снова включилась.
- Камеры добавлены в Telegram-панель `/status` и `/miners` отдельным блоком без кнопок перезагрузки.
- Проверено на роутере `100.72.73.45`: установка пакета, `run-once`, LuCI helper, временное add/delete камеры и финальное пустое состояние `cameras: []`.

## 0.2.0 - 2026-06-09

- Интервал основного мониторинга по умолчанию уменьшен до 30 секунд.
- Добавлены одноразовые Telegram-уведомления и уведомления о восстановлении для offline/online, потери API, проблем вентилятора, сильного снижения скорости добычи и битых шар выше 1% в среднем за час.
- Добавлен часовой накопитель accepted/rejected samples в `/tmp/asic-watchdog`, чтобы считать средний процент битых шар за последний час без записи во flash.
- Исправлен разбор чисел в scientific notation, например `1.27e+08`, чтобы Whatsminer-хешрейт корректно сравнивался с порогами.
- Telegram-сообщения переведены на компактный формат: имя ASIC теперь кликабельная ссылка на `http://IP`, а сам IP не выводится отдельным текстом.
- Подписи Telegram-метрик обновлены на пользовательские: `Скорость добычи`, `Разгадал блоков`, `Не отгадал`.
- Telegram API-ответы теперь проверяются на `ok=true`, а отказ отправки пишется в лог для диагностики.
- Добавлен PID-lock daemon-процесса, чтобы перезапуски не оставляли конкурирующие watchdog-экземпляры.

## 2026-06-08

- Telegram group update parsing is hardened: message, edited_message and callback_query are handled separately, with a log entry for unrecognized updates.
- Добавлен PID-lock для daemon-процесса, чтобы после обновлений/перезапусков не появлялись два watchdog-экземпляра, конкурирующие за Telegram updates.
- README обновлён ссылкой на GitHub-репозиторий `irat25/asic-watchdog-tg-openwrt` перед первой публикацией.
- Улучшены Telegram-уведомления о тревогах: сырые `key=value` заменены на русские строки с единицами измерения, нормальным хешрейтом, accepted/rejected shares и подсказками по причине аварии.
- Улучшена LuCI-панель деталей: пулы показываются отдельными строками с URL, статусом и логином; uptime форматируется в дни/часы/минуты; ping подписан как ICMP и отображается понятнее.
- Перегруппирован Telegram-дашборд: отдельные блоки `Требуют внимания` и `В норме`, более компактные строки ASIC и короче кнопки перезагрузки.
- Исправлен разбор входящих Telegram updates в группе: добавлен `json_string_field()` вместо хрупкого `sed` для поля `text`, callback-обновления больше не обрабатываются повторно как обычные команды.
- Создан отдельный пакет `asic-watchdog-tg-openwrt` из рабочей установки OpenWrt/RouteRich.
- Добавлена инструкция публикации и обновления GitHub-репозитория в `GITHUB_UPLOAD.md`.
- Добавлен лёгкий shell-watchdog без Python/Node.js/БД.
- Добавлен LuCI-раздел `Services -> ASIC Watchdog`.
- Добавлено добавление, редактирование и удаление ASIC через LuCI.
- Добавлены поля Telegram bot token и Chat / Group ID в LuCI.
- Добавлен мониторинг Whatsminer M30S+/M30 и Antminer Z11 через API `4028`.
- Добавлен мониторинг температуры, вентиляторов, хешрейта, rejected/bad shares, HW errors.
- Добавлен сбор данных по платам/чипам: температуры, хешрейт, состояние, количество чипов, HW по платам.
- Добавлены uptime, pools, autotune/overclock, ping/API availability.
- Добавлены Telegram-уведомления с `alert_cooldown`, чтобы не спамить группу.
- Добавлен русский Telegram-дашборд для группы.
- Добавлены inline-кнопки `Обновить`, `Подробности`, `Перезагрузка`.
- Добавлена перезагрузка ASIC через Telegram только после подтверждения.
- Исправлен polling Telegram для групп: команды вида `/status@bot` и экранированные слэши Telegram нормализуются.
- Telegram polling ускорен до 5 секунд без учащения основного мониторинга ASIC.
- Детали ASIC в LuCI удерживаются открытыми около 10 минут.
- Удалена идея тяжёлой готовой панели в пользу лёгкого watchdog для роутера.

## Правило

Каждая следующая правка должна добавлять запись в этот файл с датой, кратким описанием и способом проверки.
