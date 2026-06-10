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

set_default() {
	option="$1"
	value="$2"
	if ! uci -q get "asic_watchdog.main.$option" >/dev/null 2>&1; then
		uci set "asic_watchdog.main.$option=$value"
	fi
}

set_default monitor_timeout 180
set_default status_stale_timeout 120
set_default telegram_timeout 12
set_default telegram_resolve_ip ''
set_default telegram_resolve_ips ''
set_default telegram_recover_failures 3
set_default telegram_heartbeat_interval 0
set_default pool_test_duration 300
set_default pool_test_interval 10
set_default pool_test_timeout 5
uci commit asic_watchdog >/dev/null 2>&1 || true

/etc/init.d/asic-watchdog enable >/dev/null 2>&1 || true
/etc/init.d/asic-watchdog stop >/dev/null 2>&1 || true
for pid in $(ps w | awk '/asic-watchdog\} \/bin\/sh \/usr\/bin\/asic-watchdog daemon/ { print $1 }'); do
	kill "$pid" 2>/dev/null || true
done
killall asic-watchdog 2>/dev/null || true
sleep 1
for pid in $(ps w | awk '/asic-watchdog\} \/bin\/sh \/usr\/bin\/asic-watchdog daemon/ { print $1 }'); do
	kill -9 "$pid" 2>/dev/null || true
done
killall -9 asic-watchdog 2>/dev/null || true
rm -rf /tmp/asic-watchdog/daemon.lock /tmp/asic-watchdog/daemon.pid /tmp/asic-watchdog/monitor.lock /tmp/asic-watchdog/telegram-poll.lock 2>/dev/null || true
/etc/init.d/asic-watchdog start >/dev/null 2>&1 || true
sleep 2
owner="$(cat /tmp/asic-watchdog/daemon.lock/pid 2>/dev/null || true)"
for pid in $(ps w | awk '/asic-watchdog\} \/bin\/sh \/usr\/bin\/asic-watchdog daemon/ { print $1 }'); do
	[ -n "$owner" ] && [ "$pid" = "$owner" ] && continue
	kill "$pid" 2>/dev/null || true
done
sleep 1
for pid in $(ps w | awk '/asic-watchdog\} \/bin\/sh \/usr\/bin\/asic-watchdog daemon/ { print $1 }'); do
	[ -n "$owner" ] && [ "$pid" = "$owner" ] && continue
	kill -9 "$pid" 2>/dev/null || true
done
/etc/init.d/rpcd reload >/dev/null 2>&1 || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* 2>/dev/null || true
rm -rf /tmp/luci-modulecache /tmp/luci-modulecache.* 2>/dev/null || true
/etc/init.d/uhttpd reload >/dev/null 2>&1 || /etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo "Installed."
echo "LuCI:  Services -> ASIC Watchdog"
echo "CLI:   /usr/bin/asic-watchdog run-once"
