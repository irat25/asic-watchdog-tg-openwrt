# ASIC Watchdog TG для OpenWrt

Лёгкий watchdog для мониторинга ASIC-майнеров Whatsminer/Antminer на OpenWrt/RouteRich без тяжёлой панели, базы данных, Python или Node.js.

Проект рассчитан на маленький роутер: shell-демон собирает состояние майнеров через API `4028`, LuCI даёт простую страницу настройки, Telegram-бот показывает статус в группе и позволяет перезагрузить выбранный ASIC с подтверждением.

Репозиторий: <https://github.com/irat25/asic-watchdog-tg-openwrt>

## Telegram-меню

Напиши `/menu` или `/start` в настроенной Telegram-группе/канале, чтобы открыть главное меню с кнопками.

Кнопки:

- `Статус` / `Обновить` - открыть или обновить панель ASIC.
- `ASIC` - список ASIC с кнопками деталей и перезагрузки.
- `BTC пулы` / `ZEC пулы` / `Все пулы` - запустить тест пулов ViaBTC в фоне.
- `Помощь` - показать список команд.

CLI:

```sh
/usr/bin/asic-watchdog telegram-menu
```

## Тест пулов ViaBTC

Официальный список пулов ViaBTC проверен 2026-06-10:

- BTC Европа: `btc.powhashing.com:3333`, резерв `:443`
- ZEC Европа: `zec.powhashing.com:3002`
- BTC глобальные: `btc.viabtc.io`, `btc.viabtc.cc`, `btc.viabtc.top`
- ZEC глобальные: `mining.viabtc.io`, `mining.viabtc.top`

CLI:

```sh
/usr/bin/asic-watchdog pool-test btc 300 10
/usr/bin/asic-watchdog pool-test zec 300 10
/usr/bin/asic-watchdog pool-test all 60 10
```

Telegram:

```text
/pooltest btc 300 10
/pooltest zec 300 10
/pooltest all 60 10
```

Второе число - общий лимит теста в секундах, а не время на каждый адрес. Например, `/pooltest zec 300 10` вернёт результат примерно через 5 минут. Результат сортируется от лучшего пула к худшему. Тест измеряет только успешность TCP-подключения и задержку. Настройки пулов на ASIC автоматически не меняются.

В деталях ASIC `Битые шары 24ч: ср. / пик` означает средний и максимальный процент rejected shares за последние 24 часа.

## Что умеет

- добавлять ASIC по IP в LuCI;
- добавлять IP-камеры по IP в LuCI и пинговать их;
- мониторить сетевую доступность и API майнера;
- читать температуру, вентиляторы, хешрейт, rejected/bad shares, HW errors;
- считать средний хешрейт за 24 часа и сравнивать принятые шары сегодня с вчерашним значением к этому же времени;
- показывать в LuCI показатели за 24 часа и короткий анализ: просадка хеша, перегрев, вентилятор, bad shares;
- показывать температуры по платам/чипам, хешрейт по платам, состояние плат, количество чипов;
- показывать uptime в днях/часах, пулы, режим autotune/разгона;
- уведомлять в Telegram о перегреве, простое, проблемах вентилятора, потере API, битых шарах и отключении/включении IP-камер;
- отправлять красивый русский мини-дашборд в Telegram-группу;
- давать кнопки `Обновить`, `Подробности`, `Перезагрузка`;
- перезагружать ASIC из Telegram только после подтверждения;
- хранить runtime-состояние в `/tmp/asic-watchdog`, чтобы не писать постоянно во flash.

## Поддержанные майнеры

Проверялось и дорабатывалось под:

- Whatsminer M30S+/M30-серия через API `4028`;
- Antminer Z11 через API `4028` и web reboot.

Другие ASIC с cgminer/bmminer-похожим API могут частично работать, если отвечают на `summary`, `stats`, `devs`, `pools`.

## Требования на OpenWrt

Обычно уже есть:

```sh
uci
uhttpd
rpcd
wget
awk
sed
logger
nc
```

Если Telegram HTTPS не работает, поставить TLS-пакеты:

```sh
opkg update
opkg install ca-bundle libustream-mbedtls
```

Если нет `nc`:

```sh
opkg update
opkg install netcat
```

На RouteRich/OpenWrt в рабочей установке пришлось учитывать, что BusyBox `nc` может не иметь `-w`, а `timeout` может отсутствовать. Поэтому watchdog использует свой простой таймаут вокруг `nc`.

## Установка

Скопировать каталог на роутер, например в `/tmp/asic-watchdog-tg-openwrt`, и выполнить:

```sh
cd /tmp/asic-watchdog-tg-openwrt
sh install.sh
```

После установки:

```sh
/etc/init.d/asic-watchdog enable
/etc/init.d/asic-watchdog restart
```

В LuCI появится раздел:

```text
Services -> ASIC Watchdog
```

## Обновление уже установленной версии

Самый аккуратный способ, если watchdog уже стоит на удалённом роутере:

```sh
cp /usr/bin/asic-watchdog /tmp/asic-watchdog.prev
cp files/usr/bin/asic-watchdog /usr/bin/asic-watchdog
chmod 755 /usr/bin/asic-watchdog
sh -n /usr/bin/asic-watchdog
/etc/init.d/asic-watchdog restart
```

Если обновлялись LuCI-файлы:

```sh
sh install.sh
/etc/init.d/rpcd reload || /etc/init.d/rpcd restart
rm -f /tmp/luci-indexcache
rm -f /tmp/luci-modulecache/*
```

Установщик не перетирает существующий `/etc/config/asic_watchdog`, если файл уже есть.

## Настройка Telegram-группы

1. Создать бота через `@BotFather`.
2. Добавить бота в Telegram-группу.
3. В LuCI включить Telegram и вставить `Bot Token`.
4. Узнать ID группы. Если бот уже отправляет тест, ID видно в тестовом сообщении:

```text
Chat: -1001234567890
```

5. Вставить этот отрицательный ID в:

```text
Services -> ASIC Watchdog -> Chat / Group ID
```

6. Сохранить настройки.
7. В группе использовать команды с именем бота:

```text
/status@имя_бота
/miners@имя_бота
/chatid@имя_бота
```

Для групп это надёжнее, чем просто `/status`, особенно если включён privacy mode или в группе есть другие боты.

## Что пришлось учесть на OpenWrt, чтобы бот заработал в группе

- `chat_id` группы отрицательный, например `-1001234567890`.
- Telegram может присылать команду в JSON с экранированным слэшем: `/chatid`, `\/chatid`, `\\/chatid`. Парсер команд это нормализует.
- Команды с упоминанием бота `/status@имя_бота` обрезаются до `status`.
- Telegram polling вынесен в быстрый цикл примерно 5 секунд, а мониторинг ASIC оставлен по обычному интервалу `interval`, чтобы бот отвечал быстро, но уведомления не спамили.
- Если один цикл проверки завис дольше `monitor_timeout` (по умолчанию 180 секунд), watchdog освобождает свой lock и продолжает работу, чтобы Telegram и панель не застревали на старом опросе.
- Если `status.json` старше `status_stale_timeout` (по умолчанию 120 секунд), daemon принудительно запускает новый цикл проверки, а LuCI подсвечивает устаревший статус.
- Telegram API вызовы ограничены `telegram_timeout` (по умолчанию 12 секунд), поэтому при проблемах DNS/прокси в логах быстро появляется понятная ошибка вместо долгого ожидания.
- Если Podkop/sing-box отдаёт fake-IP для `api.telegram.org`, можно задать `telegram_resolve_ip` с реальным IP Telegram; watchdog будет использовать `curl --resolve` только для своих Telegram-запросов.
- Если прямые IP Telegram плохо ходят, можно поставить `telegram_resolve_ip=dns`, и watchdog будет использовать обычный DNS/маршрут для `api.telegram.org`.
- `telegram_resolve_ips` задаёт резервные IP Telegram, а `telegram_recover_failures` включает health-check `getMe` после серии ошибок чтения/отправки.
- `telegram_max_candidates` ограничивает, сколько IP Telegram пробовать за один запрос, чтобы бот не зависал на минуты при плохом маршруте.
- `telegram_send_retries` повторяет отправку панели/меню после краткого транспортного таймаута Telegram.
- `telegram_probe_interval` ограничивает частоту health-check `getMe`, а `debug_log=1` включает подробные строки `debug` в `logread`.
- `telegram_heartbeat_interval` включает редкий самотест отправки в Telegram-группу; по умолчанию `0`, то есть выключен.
- Для Telegram-уведомлений добавлен `alert_cooldown`, по умолчанию 3600 секунд.
- Inline-кнопки используют короткие `callback_data` по индексу ASIC, чтобы не упереться в лимит Telegram.
- Перезагрузка через Telegram всегда требует подтверждения.

## Команды Telegram

```text
/status@имя_бота  - русский дашборд со всеми ASIC
/miners@имя_бота  - то же самое
/chatid@имя_бота  - показать ID текущего чата/группы
/reboot имя_или_ip       - ручная перезагрузка по имени или IP
/help                    - справка
```

В дашборде:

- `Обновить` - перечитать состояние;
- `Подробности` - открыть карточку конкретного ASIC;
- `Перезагрузка` - запросить подтверждение перезагрузки.

## Настройка ASIC

### Whatsminer M30S+/M30

Рекомендуемые поля:

```text
model: whatsminer
api_port: 4028
reboot_method: api
```

Если конкретная прошивка не принимает `reboot` по API, мониторинг останется рабочим, а метод перезагрузки нужно подбирать под прошивку.

### Antminer Z11

Рекомендуемые поля:

```text
model: antminer
api_port: 4028
reboot_method: antminer_web
user: root
password: пароль web-интерфейса
```

## Проверка

```sh
/etc/init.d/asic-watchdog status
/usr/bin/asic-watchdog run-once
/usr/bin/asic-watchdog status-text
/usr/bin/asic-watchdog miners
logread | grep asic-watchdog
df -h / /tmp
```

Проверка синтаксиса перед заменой на роутере:

```sh
sh -n /tmp/asic-watchdog.new
```

## Файлы после установки

```text
/usr/bin/asic-watchdog
/etc/init.d/asic-watchdog
/etc/config/asic_watchdog
/usr/libexec/asic-watchdog-luci
/usr/share/luci/menu.d/luci-app-asic-watchdog.json
/usr/share/rpcd/acl.d/luci-app-asic-watchdog.json
/www/luci-static/resources/view/asic-watchdog/status.js
/tmp/asic-watchdog/status.json
```

## Правило сопровождения

При каждой правке:

1. обновить файлы пакета;
2. проверить `sh -n files/usr/bin/asic-watchdog` на OpenWrt/BusyBox shell;
3. проверить запуск сервиса;
4. записать изменение в `CHANGELOG.md`;
5. при публикации на GitHub сделать отдельный commit с понятным сообщением.
