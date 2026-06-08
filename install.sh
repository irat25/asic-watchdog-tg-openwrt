#!/bin/sh
set -eu

SRC_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

echo "== Installing ASIC Watchdog for OpenWrt =="

mkdir -p /usr/bin /etc/init.d /etc/config
mkdir -p /usr/libexec /usr/share/luci/menu.d /usr/share/rpcd/acl.d /www/luci-static/resources/view/asic-watchdog

cp "$SRC_DIR/files/usr/bin/asic-watchdog" /usr/bin/asic-watchdog
cp "$SRC_DIR/files/etc/init.d/asic-watchdog" /etc/init.d/asic-watchdog
cp "$SRC_DIR/files/usr/libexec/asic-watchdog-luci" /usr/libexec/asic-watchdog-luci
cp "$SRC_DIR/files/usr/share/luci/menu.d/luci-app-asic-watchdog.json" /usr/share/luci/menu.d/luci-app-asic-watchdog.json
cp "$SRC_DIR/files/usr/share/rpcd/acl.d/luci-app-asic-watchdog.json" /usr/share/rpcd/acl.d/luci-app-asic-watchdog.json
cp "$SRC_DIR/files/www/luci-static/resources/view/asic-watchdog/status.js" /www/luci-static/resources/view/asic-watchdog/status.js

chmod 0755 /usr/bin/asic-watchdog
chmod 0755 /etc/init.d/asic-watchdog
chmod 0755 /usr/libexec/asic-watchdog-luci
chmod 0644 /usr/share/luci/menu.d/luci-app-asic-watchdog.json
chmod 0644 /usr/share/rpcd/acl.d/luci-app-asic-watchdog.json
chmod 0644 /www/luci-static/resources/view/asic-watchdog/status.js

if [ ! -f /etc/config/asic_watchdog ]; then
	cp "$SRC_DIR/files/etc/config/asic_watchdog" /etc/config/asic_watchdog
	chmod 0600 /etc/config/asic_watchdog
else
	echo "Keeping existing /etc/config/asic_watchdog"
fi

/etc/init.d/asic-watchdog enable >/dev/null 2>&1 || true
/etc/init.d/asic-watchdog restart >/dev/null 2>&1 || true
/etc/init.d/rpcd reload >/dev/null 2>&1 || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -f /tmp/luci-modulecache/* 2>/dev/null || true

echo "Installed."
echo "LuCI:  Services -> ASIC Watchdog"
echo "CLI:   /usr/bin/asic-watchdog run-once"
