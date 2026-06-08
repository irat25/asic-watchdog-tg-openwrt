# Публикация на GitHub

Пакет уже оформлен как отдельный git-репозиторий.

## Вариант 1: создать новый репозиторий через GitHub CLI

На машине, где установлен `gh` и выполнен `gh auth login`:

```sh
cd asic-watchdog-tg-openwrt
gh repo create asic-watchdog-tg-openwrt --public --source=. --remote=origin --push
```

Для приватного репозитория:

```sh
gh repo create asic-watchdog-tg-openwrt --private --source=. --remote=origin --push
```

## Вариант 2: подключить уже созданный репозиторий

```sh
cd asic-watchdog-tg-openwrt
git remote add origin https://github.com/OWNER/asic-watchdog-tg-openwrt.git
git branch -M main
git push -u origin main
```

## Обновление после правок

Каждая правка должна идти отдельным коммитом:

```sh
git status
git add README.md CHANGELOG.md VERSION files install.sh diag-asic-api.sh
git commit -m "Describe the change"
git push
```

Перед коммитом обязательно:

```sh
sh -n files/usr/bin/asic-watchdog
```

На Windows без `sh` проверять синтаксис лучше на самом OpenWrt:

```sh
scp files/usr/bin/asic-watchdog root@ROUTER:/tmp/asic-watchdog.new
ssh root@ROUTER 'sh -n /tmp/asic-watchdog.new'
```

## Что писать в CHANGELOG

Для каждой правки:

- дата;
- что изменено;
- какие файлы затронуты;
- как проверено;
- нужно ли обновлять только `/usr/bin/asic-watchdog` или весь пакет через `install.sh`.
