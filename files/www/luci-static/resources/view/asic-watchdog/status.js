'use strict';
'require view';
'require fs';
'require ui';
'require poll';

var helper = '/usr/libexec/asic-watchdog-luci';

function run(action, args) {
	return fs.exec(helper, [ action ].concat(args || []));
}

function parse(res) {
	try {
		return JSON.parse((res && res.stdout) || '{}');
	} catch (e) {
		return { ok: false, error: 'Bad helper JSON', raw: (res && res.stdout) || '', stderr: (res && res.stderr) || '' };
	}
}

function opt(value, text) {
	return E('option', { value: value }, text);
}

function field(label, node) {
	return E('div', { 'class': 'cbi-value' }, [
		E('label', { 'class': 'cbi-value-title' }, label),
		E('div', { 'class': 'cbi-value-field' }, node)
	]);
}

function input(name, value, type) {
	return E('input', { 'name': name, 'value': value || '', 'type': type || 'text', 'class': 'cbi-input-text' });
}

function select(name, value, options) {
	var s = E('select', { 'name': name, 'class': 'cbi-input-select' }, options);
	s.value = value || '';
	return s;
}

function formArgs(form) {
	var fd = new FormData(form);
	var args = [];
	fd.forEach(function(value, key) {
		args.push(key + '=' + value);
	});
	return args;
}

function notifyResult(res) {
	var data = parse(res);
	if (data.ok)
		ui.addNotification(null, E('p', { 'class': 'asic-toast asic-toast-ok' }, [ '✓ ', data.message || 'OK' ]), 'info');
	else
		ui.addNotification(null, E('p', { 'class': 'asic-toast asic-toast-bad' }, [ '✕ ', data.error || data.stderr || data.raw || 'Error' ]), 'danger');
}

function statusMeta(status) {
	switch (status || 'pending') {
	case 'ok':
		return { icon: '✓', label: 'OK', tone: 'ok', title: 'Работает' };
	case 'overheat':
		return { icon: '🔥', label: 'HOT', tone: 'hot', title: 'Перегрев' };
	case 'idle':
		return { icon: '⏸', label: 'IDLE', tone: 'warn', title: 'Простой' };
	case 'fan_fault':
		return { icon: '🌀', label: 'FAN', tone: 'bad', title: 'Вентилятор' };
	case 'bad_shares':
		return { icon: '⚠', label: 'SHARES', tone: 'warn', title: 'Битые шары' };
	case 'api_down':
		return { icon: '✕', label: 'API', tone: 'bad', title: 'Нет API' };
	case 'camera_down':
		return { icon: '✕', label: 'OFF', tone: 'bad', title: 'Камера недоступна' };
	case 'config_error':
		return { icon: '!', label: 'CFG', tone: 'bad', title: 'Ошибка конфига' };
	default:
		return { icon: '…', label: 'WAIT', tone: 'muted', title: 'Ожидание' };
	}
}

function badge(status) {
	var meta = statusMeta(status);
	return E('span', { 'class': 'asic-badge asic-badge-' + meta.tone, 'title': meta.title }, [
		E('span', { 'class': 'asic-badge-icon' }, meta.icon),
		E('span', {}, meta.label)
	]);
}

function metric(label, value, unit, tone) {
	return E('span', { 'class': 'asic-metric asic-metric-' + (tone || 'plain') }, [
		E('span', { 'class': 'asic-metric-label' }, label),
		E('span', { 'class': 'asic-metric-value' }, String(value || 0) + (unit || ''))
	]);
}

function detail(label, value, tone) {
	if (value === undefined || value === null || value === '')
		value = 'n/a';
	var content = (typeof value === 'object') ? value : String(value);
	return E('div', { 'class': 'asic-detail asic-detail-' + (tone || 'plain') }, [
		E('dt', {}, label),
		E('dd', {}, content)
	]);
}

function pad2(n) {
	return n < 10 ? '0' + n : String(n);
}

function formatUptime(value) {
	var n = Number(value || 0);
	if (!isFinite(n) || n <= 0)
		return value || 'нет данных';

	n = Math.floor(n);
	var d = Math.floor(n / 86400);
	var h = Math.floor((n % 86400) / 3600);
	var m = Math.floor((n % 3600) / 60);
	var s = n % 60;

	if (d > 0)
		return d + 'д ' + pad2(h) + 'ч ' + pad2(m) + 'м';
	if (h > 0)
		return h + 'ч ' + pad2(m) + 'м';
	return m + 'м ' + pad2(s) + 'с';
}

function formatPing(value) {
	var raw = String(value || '');
	var m = raw.match(/^ok\s+([0-9.]+)ms$/);

	if (raw === 'fail')
		return 'нет ответа';
	if (m)
		return m[1] + ' мс, доступен';
	return raw || 'нет данных';
}

function fieldValue(raw, key) {
	var re = new RegExp('(?:^| )' + key + '=([\\s\\S]*?)(?= [a-z_]+=|$)');
	var m = String(raw || '').match(re);
	return m ? m[1] : '';
}

function splitPoolList(value, isUrl) {
	if (!value || value === 'n/a')
		return [];
	if (isUrl)
		return value.split(/\/(?=[a-z][a-z0-9+.-]*:\/\/)/i).filter(Boolean);
	return value.split('/').filter(Boolean);
}

function formatPools(raw) {
	var urls = splitPoolList(fieldValue(raw, 'url'), true);
	var statuses = splitPoolList(fieldValue(raw, 'status'), false);
	var users = splitPoolList(fieldValue(raw, 'user'), false);
	var count = Math.max(urls.length, statuses.length, users.length);

	if (!count)
		return 'нет данных';

	var rows = [];
	for (var i = 0; i < count; i++) {
		rows.push(E('div', { 'class': 'asic-pool-row' }, [
			E('div', { 'class': 'asic-pool-url' }, [
				E('span', { 'class': 'asic-pool-index' }, String(i + 1) + '. '),
				urls[i] || 'url не найден'
			]),
			E('div', { 'class': 'asic-pool-meta' }, [
				E('span', {}, 'Статус: ' + (statuses[i] || 'нет данных')),
				E('span', {}, 'Логин: ' + (users[i] || 'нет данных'))
			])
		]));
	}

	return E('div', { 'class': 'asic-pool-list' }, rows);
}

function detailGroup(title, items, extraClass) {
	return E('section', { 'class': 'asic-detail-group' + (extraClass ? ' ' + extraClass : '') }, [
		E('h4', {}, title),
		E('dl', {}, items)
	]);
}

function parseSeries(value) {
	return String(value || '').split(',').map(function(v) {
		var n = Number(v);
		return isFinite(n) ? n : 0;
	});
}

function sparkChart(title, series, formatter, tone) {
	var values = parseSeries(series).filter(function(v) { return v > 0; });
	if (!values.length)
		return E('div', { 'class': 'asic-spark asic-spark-muted' }, [
			E('div', { 'class': 'asic-spark-title' }, title),
			E('div', { 'class': 'asic-spark-empty' }, 'нет данных')
		]);

	var min = Math.min.apply(Math, values);
	var max = Math.max.apply(Math, values);
	var spread = max - min;
	var bars = values.map(function(v) {
		var h = spread > 0 ? 18 + Math.round(((v - min) / spread) * 46) : 38;
		return E('span', { 'style': 'height:' + h + 'px', 'title': formatter(v) });
	});

	return E('div', { 'class': 'asic-spark asic-spark-' + (tone || 'plain') }, [
		E('div', { 'class': 'asic-spark-title' }, [
			E('strong', {}, title),
			E('span', {}, formatter(min) + ' ... ' + formatter(max))
		]),
		E('div', { 'class': 'asic-spark-bars' }, bars)
	]);
}

function analysisPanel(s) {
	var notes = [];
	var hash = Number(s.hashrate || 0);
	var hash24 = Number(s.hashrate_24h || 0);
	var tempMax = Number(s.temp_max_24h || 0);
	var tempNow = Number(s.temp || 0);
	var fanMin = Number(s.fan_min_24h || s.fan_min || 0);
	var badAvg = Number(s.bad_avg_24h || 0);
	var badMax = Number(s.bad_max_24h || 0);

	if (hash24 > 0 && hash > 0 && hash < hash24 * 0.9)
		notes.push('Сейчас хеш ниже среднего за сутки больше чем на 10%.');
	if (tempMax >= 90 || tempNow >= 90)
		notes.push('Температура высокая: проверь продув, пыль и температуру помещения.');
	if (fanMin > 0 && fanMin < 3000)
		notes.push('Минимальные обороты вентилятора низкие для M30/Z11, стоит проверить вентиляторы.');
	if (badAvg > 1 || badMax > 2)
		notes.push('Битые шары заметно растут: проверь пул, сеть, частоты и питание.');
	if (!notes.length)
		notes.push('Критичных просадок за сутки не видно, наблюдай температуру и долю битых шар.');

	return E('div', { 'class': 'asic-analysis' }, notes.map(function(note) {
		return E('div', {}, note);
	}));
}

function historyPanel(s) {
	return E('section', { 'class': 'asic-detail-group asic-detail-group-wide' }, [
		E('h4', {}, 'Графики 24ч'),
		E('div', { 'class': 'asic-spark-grid' }, [
			sparkChart('Хеш', s.hashrate_spark_24h, formatHash, 'plain'),
			sparkChart('Температура', s.temp_spark_24h, function(v) { return Number(v).toFixed(1) + 'C'; }, 'hot'),
			sparkChart('Битые шары', s.bad_spark_24h, function(v) { return Number(v).toFixed(2) + '%'; }, 'warn')
		]),
		E('div', { 'class': 'asic-analysis-title' }, 'Анализ'),
		analysisPanel(s)
	]);
}

function detailsPanel(s, fanTone, tempTone) {
	return E('div', { 'class': 'asic-details-panel asic-details-collapsed' }, [
		historyPanel(s),
		detailGroup('Охлаждение', [
			detail('Вентиляторы', s.fan_rpm, fanTone),
			detail('Мин. RPM', s.fan_min || 0, fanTone),
			detail('Темп. плат', s.board_temps, 'plain'),
			detail('Темп. чипов', s.chip_temps, tempTone)
		]),
		detailGroup('Платы', [
			detail('Хеш по платам', s.board_hashrates, 'plain'),
			detail('Чипы', s.board_chips, 'plain'),
			detail('Состояние', s.board_status, 'plain'),
			detail('HW по платам', s.board_hw, Number(s.hw_errors || 0) > 0 ? 'warn' : 'plain')
		]),
		detailGroup('Пулы и сеть', [
			detail('Пулы', formatPools(s.pools), 'plain'),
			detail('Ping ICMP', formatPing(s.ping), s.ping === 'fail' ? 'bad' : 'plain'),
			detail('Uptime', formatUptime(s.uptime), 'plain')
		]),
		detailGroup('Сутки и шары', [
			detail('Хеш 24ч', formatHash(s.hashrate_24h), 'plain'),
			detail('Темп. сред/max', formatTempPair(s.temp_avg_24h, s.temp_max_24h), Number(s.temp_max_24h || 0) >= 90 ? 'warn' : 'plain'),
			detail('Мин. fan 24ч', s.fan_min_24h ? String(s.fan_min_24h) + ' RPM' : 'нет данных', Number(s.fan_min_24h || 0) > 0 && Number(s.fan_min_24h || 0) < 3000 ? 'warn' : 'plain'),
			detail('Bad ср/max', formatBadPair(s.bad_avg_24h, s.bad_max_24h), Number(s.bad_avg_24h || 0) > 1 ? 'warn' : 'plain'),
			detail('Сегодня / вчера', formatShareCompare(s), 'plain'),
			detail('Шары сегодня', s.accepted_today || 0, 'plain'),
			detail('Вчера к этому времени', s.accepted_yday_same || 0, 'plain'),
			detail('Разница', formatSignedPercent(s.accepted_vs_yday_pct), Number(s.accepted_vs_yday_pct || 0) < 0 ? 'warn' : 'plain')
		]),
		detailGroup('Режим', [
			detail('Autotune', s.autotune, 'plain'),
			detail('API', s.api_ok === '1' ? 'ok' : 'down', s.api_ok === '1' ? 'plain' : 'bad')
		])
	]);
}

function formatHash(value) {
	var n = Number(value || 0);
	if (!isFinite(n))
		return value || '0';
	if (n >= 1000000)
		return (n / 1000000).toFixed(1) + 'T';
	if (n >= 1000)
		return (n / 1000).toFixed(1) + 'G';
	return String(value || 0);
}

function formatTempPair(avg, max) {
	var a = Number(avg || 0);
	var m = Number(max || 0);
	if (!isFinite(a) || !isFinite(m) || (a <= 0 && m <= 0))
		return 'нет данных';
	return a.toFixed(1) + 'C / ' + m.toFixed(1) + 'C';
}

function formatBadPair(avg, max) {
	var a = Number(avg || 0);
	var m = Number(max || 0);
	if (!isFinite(a) || !isFinite(m))
		return 'нет данных';
	return a.toFixed(2) + '% / ' + m.toFixed(2) + '%';
}

function formatSignedPercent(value) {
	if (value === undefined || value === null || value === '')
		return 'нет данных';
	var n = Number(value);
	if (!isFinite(n))
		return String(value);
	return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function formatShareCompare(s) {
	return String(s.accepted_today || 0) + ' / ' + String(s.accepted_yday_same || 0) + ' (' + formatSignedPercent(s.accepted_vs_yday_pct) + ')';
}

function css() {
	return E('style', {}, `
		.asic-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0 16px}
		.asic-card{border-radius:8px;padding:12px;border:1px solid #d8e0e8;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04)}
		.asic-card strong{display:block;font-size:22px;line-height:1.1}
		.asic-card span{color:#667085;font-size:12px}
		.asic-card-ok{border-left:5px solid #16a34a}.asic-card-hot{border-left:5px solid #dc2626}.asic-card-warn{border-left:5px solid #f59e0b}.asic-card-bad{border-left:5px solid #7f1d1d}
		.asic-row-ok{background:linear-gradient(90deg,rgba(22,163,74,.10),transparent 42%)}
		.asic-row-hot{background:linear-gradient(90deg,rgba(220,38,38,.13),transparent 46%)}
		.asic-row-warn{background:linear-gradient(90deg,rgba(245,158,11,.15),transparent 46%)}
		.asic-row-bad{background:linear-gradient(90deg,rgba(127,29,29,.14),transparent 46%)}
		.asic-row-muted{background:linear-gradient(90deg,rgba(100,116,139,.10),transparent 42%)}
		.asic-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 9px;font-weight:700;font-size:12px;letter-spacing:.02em;border:1px solid transparent;white-space:nowrap}
		.asic-badge-icon{min-width:16px;text-align:center}
		.asic-badge-ok{color:#166534;background:#dcfce7;border-color:#86efac}
		.asic-badge-hot{color:#991b1b;background:#fee2e2;border-color:#fca5a5}
		.asic-badge-warn{color:#92400e;background:#fef3c7;border-color:#fcd34d}
		.asic-badge-bad{color:#7f1d1d;background:#fecaca;border-color:#f87171}
		.asic-badge-muted{color:#475569;background:#e2e8f0;border-color:#cbd5e1}
		.asic-metric{display:inline-flex;align-items:baseline;gap:4px;border-radius:6px;padding:4px 7px;margin:2px 4px 2px 0;background:#f8fafc;border:1px solid #e2e8f0;white-space:nowrap}
		.asic-metric-label{font-size:11px;color:#64748b;text-transform:uppercase}
		.asic-metric-value{font-weight:700;color:#0f172a}
		.asic-metric-hot{background:#fee2e2;border-color:#fca5a5}.asic-metric-hot .asic-metric-value{color:#991b1b}
		.asic-metric-warn{background:#fef3c7;border-color:#fcd34d}.asic-metric-warn .asic-metric-value{color:#92400e}
		.asic-metric-strip{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
		.asic-details-toggle{margin-top:6px}
		.asic-details-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;max-width:900px}
		.asic-details-collapsed{display:none}
		.asic-detail-group{border:1px solid #e2e8f0;border-radius:8px;background:rgba(248,250,252,.86);padding:8px}
		.asic-detail-group-wide{grid-column:1 / -1}
		.asic-detail-group h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#475569;letter-spacing:.04em}
		.asic-detail-group dl{margin:0;display:grid;grid-template-columns:minmax(92px,130px) minmax(0,1fr);gap:4px 8px}
		.asic-detail{display:contents}
		.asic-detail dt{color:#64748b;font-size:12px}
		.asic-detail dd{margin:0;font-weight:650;color:#0f172a;font-size:12px;word-break:break-word;overflow-wrap:anywhere}
		.asic-detail-bad{background:#fee2e2;border-color:#fca5a5}.asic-detail-warn{background:#fef3c7;border-color:#fcd34d}
		.asic-spark-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
		.asic-spark{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:8px;min-width:0}
		.asic-spark-title{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#64748b;font-size:11px}
		.asic-spark-title strong{font-size:12px;color:#0f172a}
		.asic-spark-bars{height:68px;display:flex;align-items:flex-end;gap:2px;margin-top:8px}
		.asic-spark-bars span{flex:1;min-width:2px;border-radius:3px 3px 0 0;background:#2563eb}
		.asic-spark-hot .asic-spark-bars span{background:#dc2626}
		.asic-spark-warn .asic-spark-bars span{background:#f59e0b}
		.asic-spark-empty{height:68px;display:flex;align-items:center;color:#94a3b8;font-weight:650}
		.asic-analysis-title{margin:8px 0 4px;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase}
		.asic-analysis{display:grid;gap:4px;color:#0f172a;font-weight:650;font-size:12px}
		.asic-pool-list{display:flex;flex-direction:column;gap:7px}
		.asic-pool-row{padding:6px 7px;border:1px solid #e2e8f0;border-radius:6px;background:rgba(255,255,255,.62)}
		.asic-pool-url{font-weight:750;line-height:1.25}
		.asic-pool-index{color:#64748b;font-weight:700}
		.asic-pool-meta{display:flex;flex-wrap:wrap;gap:5px 10px;margin-top:4px;color:#64748b;font-weight:650}
		.asic-name{font-weight:700}.asic-sub{display:block;color:#64748b;font-size:12px;margin-top:2px}
		.asic-actions{display:flex;gap:6px;flex-wrap:wrap}.asic-actions .btn{margin:0}
		.asic-edit-hidden{display:none}
		.asic-form-note{color:#64748b;font-size:12px;margin:4px 0 10px}
		@media (prefers-color-scheme:dark){.asic-card{background:#1f2937;border-color:#374151}.asic-card span,.asic-sub{color:#9ca3af}.asic-metric,.asic-detail-group{background:#111827;border-color:#374151}.asic-metric-value,.asic-detail dd,.asic-analysis{color:#e5e7eb}.asic-detail-group h4,.asic-spark-title strong{color:#cbd5e1}.asic-pool-row,.asic-spark{background:#0f172a;border-color:#334155}.asic-pool-meta,.asic-pool-index,.asic-spark-title{color:#94a3b8}}
		@media (max-width:900px){.asic-details-panel{grid-template-columns:1fr}.asic-spark-grid{grid-template-columns:1fr}}
		@media (max-width:720px){.asic-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.asic-actions .btn{width:100%;margin-top:4px}}
	`);
}

function overview(latest) {
	var miners = ((latest.status || {}).miners || []);
	var cameras = ((latest.status || {}).cameras || []);
	var counts = { ok: 0, hot: 0, warn: 0, bad: 0 };
	miners.forEach(function(m) {
		var meta = statusMeta(m.status);
		if (meta.tone === 'ok')
			counts.ok++;
		else if (meta.tone === 'hot')
			counts.hot++;
		else if (meta.tone === 'warn')
			counts.warn++;
		else
			counts.bad++;
	});
	cameras.forEach(function(c) {
		if (c.status === 'ok')
			counts.ok++;
		else
			counts.bad++;
	});
	return E('div', { 'class': 'asic-overview', id: 'asic-overview' }, [
		E('div', { 'class': 'asic-card asic-card-ok' }, [ E('strong', {}, counts.ok), E('span', {}, '✓ работают') ]),
		E('div', { 'class': 'asic-card asic-card-hot' }, [ E('strong', {}, counts.hot), E('span', {}, '🔥 перегрев') ]),
		E('div', { 'class': 'asic-card asic-card-warn' }, [ E('strong', {}, counts.warn), E('span', {}, '⚠ предупреждения') ]),
		E('div', { 'class': 'asic-card asic-card-bad' }, [ E('strong', {}, counts.bad), E('span', {}, '✕ нет API/камера') ])
	]);
}

function bySection(status) {
	var map = {};
	((status || {}).miners || []).forEach(function(m) {
		map[m.section] = m;
	});
	return map;
}

function byCameraSection(status) {
	var map = {};
	((status || {}).cameras || []).forEach(function(c) {
		map[c.section] = c;
	});
	return map;
}

return view.extend({
	load: function() {
		return L.resolveDefault(run('status'), { stdout: '{}' });
	},

	render: function(res) {
		var data = parse(res);
		var cfg = data.config || {};
		var status = data.status || {};
		var state = bySection(status);
		var detailOpenUntil = {};
		var detailTtlMs = 10 * 60 * 1000;
		var viewRoot = E('div', { 'class': 'cbi-map' }, [
			css(),
			E('h2', {}, 'ASIC Watchdog'),
			E('div', { 'class': 'cbi-map-descr' }, 'Лёгкий мониторинг Whatsminer/Antminer и IP-камер с Telegram-уведомлениями.')
		]);

		var statusBox = E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, 'Состояние'),
			E('p', { id: 'asic-updated' }, 'Обновлено: ' + (status.updated || 'ещё нет данных')),
			overview(data),
			E('table', { 'class': 'table', id: 'asic-table' }, [
				E('tr', {}, [
					E('th', {}, 'Имя'),
					E('th', {}, 'IP'),
					E('th', {}, 'Статус'),
					E('th', {}, 'Метрики'),
					E('th', {}, '')
				])
			]),
			E('h3', {}, 'IP-камеры'),
			E('table', { 'class': 'table', id: 'camera-table' }, [
				E('tr', {}, [
					E('th', {}, 'Имя'),
					E('th', {}, 'IP'),
					E('th', {}, 'Статус'),
					E('th', {}, 'Ping'),
					E('th', {}, '')
				])
			])
		]);
		viewRoot.appendChild(statusBox);

		var settingsForm = E('form', { 'class': 'cbi-section', id: 'asic-settings' }, [
			E('h3', {}, 'Настройки'),
			field('Мониторинг', select('enabled', cfg.enabled || '1', [ opt('1', 'Включен'), opt('0', 'Выключен') ])),
			field('Интервал, сек', input('interval', cfg.interval || '60')),
			field('Таймаут проверки, сек', input('monitor_timeout', cfg.monitor_timeout || '180')),
			field('Таймаут Telegram, сек', input('telegram_timeout', cfg.telegram_timeout || '12')),
			field('Telegram resolve IP', input('telegram_resolve_ip', cfg.telegram_resolve_ip || '')),
			field('Повтор Telegram тревоги, сек', input('alert_cooldown', cfg.alert_cooldown || '3600')),
			field('Макс. температура, C', input('max_temp', cfg.max_temp || '85')),
			field('Мин. хешрейт', input('min_hashrate', cfg.min_hashrate || '1')),
			field('Rejected shares, %', input('bad_share_percent', cfg.bad_share_percent || '3')),
			field('HW errors за цикл', input('max_hw_errors_delta', cfg.max_hw_errors_delta || '100')),
			field('Мин. обороты вентилятора, RPM', input('min_fan_rpm', cfg.min_fan_rpm || '1000')),
			field('Плохих циклов до тревоги', input('fail_cycles', cfg.fail_cycles || '2')),
			field('Авто reboot при перегреве', select('auto_reboot_on_overheat', cfg.auto_reboot_on_overheat || '0', [ opt('0', 'Нет'), opt('1', 'Да') ])),
			field('Авто reboot при простое', select('auto_reboot_on_idle', cfg.auto_reboot_on_idle || '0', [ opt('0', 'Нет'), opt('1', 'Да') ])),
			field('Авто reboot при bad shares', select('auto_reboot_on_bad_shares', cfg.auto_reboot_on_bad_shares || '0', [ opt('0', 'Нет'), opt('1', 'Да') ])),
			field('Telegram', select('telegram_enabled', cfg.telegram_enabled || '0', [ opt('0', 'Выключен'), opt('1', 'Включен') ])),
			field('Bot token', input('bot_token', '', 'password')),
			field('Chat / Group ID', input('chat_id', cfg.chat_id || '')),
			E('p', { 'class': 'asic-form-note' }, 'Для группы добавь бота в Telegram-группу и напиши там /chatid. Полученный отрицательный ID вставь в Chat / Group ID. Команды в группе можно писать как /status или /status@имя_бота.'),
			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-save', 'type': 'submit' }, 'Сохранить'),
				E('button', { 'class': 'btn cbi-button', 'type': 'button', id: 'asic-run-once' }, 'Проверить сейчас'),
				E('button', { 'class': 'btn cbi-button', 'type': 'button', id: 'asic-telegram-test' }, 'Тест в Telegram'),
				E('button', { 'class': 'btn cbi-button', 'type': 'button', id: 'asic-restart' }, 'Рестарт сервиса')
			])
		]);
		viewRoot.appendChild(settingsForm);

		var addForm = E('form', { 'class': 'cbi-section', id: 'asic-add' }, [
			E('h3', {}, 'Добавить ASIC'),
			field('Имя', input('name', '')),
			field('IP', input('ip', '')),
			field('Модель', select('model', 'whatsminer', [ opt('whatsminer', 'Whatsminer'), opt('antminer', 'Antminer'), opt('generic', 'Generic API') ])),
			field('API port', input('api_port', '4028')),
			field('Reboot method', select('reboot_method', 'api', [ opt('api', 'API 4028'), opt('antminer_web', 'Antminer web'), opt('restart', 'CGMiner restart'), opt('none', 'Нет') ])),
			field('Инд. макс. температура, C', input('max_temp', '')),
			field('Инд. мин. хешрейт', input('min_hashrate', '')),
			field('Web user', input('user', 'root')),
			field('Web password', input('password', 'root', 'password')),
			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-add', 'type': 'submit' }, 'Добавить')
			])
		]);
		viewRoot.appendChild(addForm);

		var addCameraForm = E('form', { 'class': 'cbi-section', id: 'camera-add' }, [
			E('h3', {}, 'Добавить IP-камеру'),
			field('Имя', input('name', '')),
			field('IP', input('ip', '')),
			E('p', { 'class': 'asic-form-note' }, 'Камера проверяется обычным ICMP ping. Уведомление отправляется один раз при отключении и один раз при восстановлении.'),
			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-add', 'type': 'submit' }, 'Добавить камеру')
			])
		]);
		viewRoot.appendChild(addCameraForm);

		var editForm = E('form', { 'class': 'cbi-section asic-edit-hidden', id: 'asic-edit' }, [
			E('h3', {}, 'Редактировать ASIC'),
			E('p', { 'class': 'asic-form-note' }, 'Пароль можно оставить пустым, тогда сохранится текущий. Индивидуальные лимиты пустыми наследуют общие настройки.'),
			E('input', { 'type': 'hidden', 'name': 'section' }),
			field('Включен', select('enabled', '1', [ opt('1', 'Да'), opt('0', 'Нет') ])),
			field('Имя', input('name', '')),
			field('IP', input('ip', '')),
			field('Модель', select('model', 'whatsminer', [ opt('whatsminer', 'Whatsminer'), opt('antminer', 'Antminer'), opt('generic', 'Generic API') ])),
			field('API port', input('api_port', '4028')),
			field('Reboot method', select('reboot_method', 'api', [ opt('api', 'API 4028'), opt('antminer_web', 'Antminer web'), opt('restart', 'CGMiner restart'), opt('none', 'Нет') ])),
			field('Инд. макс. температура, C', input('max_temp', '')),
			field('Инд. мин. хешрейт', input('min_hashrate', '')),
			field('Web user', input('user', 'root')),
			field('Новый web password', input('password', '', 'password')),
			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-save', 'type': 'submit' }, 'Сохранить ASIC'),
				E('button', { 'class': 'btn cbi-button', 'type': 'button', id: 'asic-edit-cancel' }, 'Отмена')
			])
		]);
		viewRoot.appendChild(editForm);

		var editCameraForm = E('form', { 'class': 'cbi-section asic-edit-hidden', id: 'camera-edit' }, [
			E('h3', {}, 'Редактировать IP-камеру'),
			E('input', { 'type': 'hidden', 'name': 'section' }),
			field('Включена', select('enabled', '1', [ opt('1', 'Да'), opt('0', 'Нет') ])),
			field('Имя', input('name', '')),
			field('IP', input('ip', '')),
			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-save', 'type': 'submit' }, 'Сохранить камеру'),
				E('button', { 'class': 'btn cbi-button', 'type': 'button', id: 'camera-edit-cancel' }, 'Отмена')
			])
		]);
		viewRoot.appendChild(editCameraForm);

		function fillEditForm(m) {
			editForm.classList.remove('asic-edit-hidden');
			editForm.elements.section.value = m.section || '';
			editForm.elements.enabled.value = m.enabled || '1';
			editForm.elements.name.value = m.name || '';
			editForm.elements.ip.value = m.ip || '';
			editForm.elements.model.value = m.model || 'generic';
			editForm.elements.api_port.value = m.api_port || '4028';
			editForm.elements.reboot_method.value = m.reboot_method || 'api';
			editForm.elements.max_temp.value = m.max_temp || '';
			editForm.elements.min_hashrate.value = m.min_hashrate || '';
			editForm.elements.user.value = m.user || 'root';
			editForm.elements.password.value = '';
			editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		function fillCameraEditForm(c) {
			editCameraForm.classList.remove('asic-edit-hidden');
			editCameraForm.elements.section.value = c.section || '';
			editCameraForm.elements.enabled.value = c.enabled || '1';
			editCameraForm.elements.name.value = c.name || '';
			editCameraForm.elements.ip.value = c.ip || '';
			editCameraForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		function renderRows(latest) {
			var table = viewRoot.querySelector('#asic-table');
			while (table.rows.length > 1)
				table.deleteRow(1);
			var cameraTable = viewRoot.querySelector('#camera-table');
			while (cameraTable.rows.length > 1)
				cameraTable.deleteRow(1);
			var nowMs = Date.now();
			Object.keys(detailOpenUntil).forEach(function(key) {
				if (detailOpenUntil[key] <= nowMs)
					delete detailOpenUntil[key];
			});
			var overviewNode = viewRoot.querySelector('#asic-overview');
			if (overviewNode)
				overviewNode.replaceWith(overview(latest));
			var cfgNow = (latest.config || {}).miners || [];
			var stateNow = bySection(latest.status || {});
			var cameraCfgNow = (latest.config || {}).cameras || [];
			var cameraStateNow = byCameraSection(latest.status || {});
			cfgNow.forEach(function(m) {
				var s = stateNow[m.section] || {};
				var meta = statusMeta(s.status);
				var tempTone = meta.tone === 'hot' ? 'hot' : (Number(s.temp || 0) >= 80 ? 'warn' : 'plain');
				var badTone = Number(s.bad_pct || 0) >= 3 ? 'warn' : 'plain';
				var fanTone = Number(s.fan_min || 0) > 0 && Number(s.fan_min || 0) < Number((latest.config || {}).min_fan_rpm || 1000) ? 'bad' : 'plain';
				var detailKey = m.section || m.ip || m.name;
				var isOpen = detailOpenUntil[detailKey] > nowMs;
				var panel = detailsPanel(s, fanTone, tempTone);
				if (isOpen)
					panel.classList.remove('asic-details-collapsed');
				table.appendChild(E('tr', { 'class': 'asic-row-' + meta.tone }, [
					E('td', {}, [ E('span', { 'class': 'asic-name' }, m.name || m.section), E('span', { 'class': 'asic-sub' }, (m.model || '') + ' · ' + (m.reboot_method || '')) ]),
					E('td', {}, m.ip || ''),
					E('td', {}, [ badge(s.status || 'pending'), E('br'), E('small', {}, s.reason || '') ]),
					E('td', {}, [
						E('div', { 'class': 'asic-metric-strip' }, [
							metric('hash', formatHash(s.hashrate), '', 'plain'),
							metric('24h', formatHash(s.hashrate_24h), '', 'plain'),
							metric('temp', s.temp || 0, 'C', tempTone),
							metric('fan', s.fan_min || 0, 'rpm', fanTone),
							metric('bad', s.bad_pct || 0, '%', badTone),
							metric('шары Δ', formatSignedPercent(s.accepted_vs_yday_pct), '', Number(s.accepted_vs_yday_pct || 0) < 0 ? 'warn' : 'plain'),
							metric('HW', s.hw_errors || 0, '', Number(s.hw_errors || 0) > 0 ? 'warn' : 'plain')
						]),
						E('button', { 'class': 'btn cbi-button asic-details-toggle', 'click': function(ev) {
							var collapsed = panel.classList.toggle('asic-details-collapsed');
							if (collapsed)
								delete detailOpenUntil[detailKey];
							else
								detailOpenUntil[detailKey] = Date.now() + detailTtlMs;
							ev.target.textContent = collapsed ? '▾ Детали' : '▴ Скрыть';
						} }, isOpen ? '▴ Скрыть' : '▾ Детали'),
						panel
					]),
					E('td', { 'class': 'asic-actions' }, [
						E('button', { 'class': 'btn cbi-button', 'click': function() {
							fillEditForm(m);
						} }, '✎ Изменить'),
						' ',
						E('button', { 'class': 'btn cbi-button', 'click': function() {
							return run('reboot_miner', [ 'target=' + (m.name || m.ip) ]).then(notifyResult).then(refresh);
						} }, '↻ Reboot'),
						' ',
						E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
							if (!confirm('Удалить ASIC из мониторинга?'))
								return;
							return run('delete_miner', [ 'section=' + m.section ]).then(notifyResult).then(refresh);
						} }, '✕ Удалить')
					])
				]));
			});
			cameraCfgNow.forEach(function(c) {
				var s = cameraStateNow[c.section] || {};
				var status = s.status || (c.enabled === '0' ? 'disabled' : 'pending');
				var meta = statusMeta(status);
				cameraTable.appendChild(E('tr', { 'class': 'asic-row-' + meta.tone }, [
					E('td', {}, [ E('span', { 'class': 'asic-name' }, c.name || c.section), E('span', { 'class': 'asic-sub' }, c.enabled === '0' ? 'выключена в мониторинге' : 'ICMP ping') ]),
					E('td', {}, c.ip || ''),
					E('td', {}, [ badge(status), E('br'), E('small', {}, s.reason || '') ]),
					E('td', {}, formatPing(s.ping)),
					E('td', { 'class': 'asic-actions' }, [
						E('button', { 'class': 'btn cbi-button', 'click': function() {
							fillCameraEditForm(c);
						} }, '✎ Изменить'),
						' ',
						E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
							if (!confirm('Удалить IP-камеру из мониторинга?'))
								return;
							return run('delete_camera', [ 'section=' + c.section ]).then(notifyResult).then(refresh);
						} }, '✕ Удалить')
					])
				]));
			});
			viewRoot.querySelector('#asic-updated').textContent = 'Обновлено: ' + ((latest.status || {}).updated || 'ещё нет данных');
		}

		function refresh() {
			return run('status').then(function(newRes) {
				renderRows(parse(newRes));
			});
		}

		settingsForm.addEventListener('submit', function(ev) {
			ev.preventDefault();
			run('save_settings', formArgs(settingsForm)).then(notifyResult).then(refresh);
		});

		addForm.addEventListener('submit', function(ev) {
			ev.preventDefault();
			run('add_miner', formArgs(addForm)).then(notifyResult).then(function() {
				addForm.reset();
				addForm.elements.api_port.value = '4028';
				addForm.elements.user.value = 'root';
				addForm.elements.password.value = 'root';
				return refresh();
			});
		});

		addCameraForm.addEventListener('submit', function(ev) {
			ev.preventDefault();
			run('add_camera', formArgs(addCameraForm)).then(notifyResult).then(function() {
				addCameraForm.reset();
				return refresh();
			});
		});

		editForm.addEventListener('submit', function(ev) {
			ev.preventDefault();
			run('edit_miner', formArgs(editForm)).then(notifyResult).then(function() {
				editForm.classList.add('asic-edit-hidden');
				return refresh();
			});
		});

		editCameraForm.addEventListener('submit', function(ev) {
			ev.preventDefault();
			run('edit_camera', formArgs(editCameraForm)).then(notifyResult).then(function() {
				editCameraForm.classList.add('asic-edit-hidden');
				return refresh();
			});
		});

		viewRoot.querySelector('#asic-edit-cancel').addEventListener('click', function() {
			editForm.classList.add('asic-edit-hidden');
			editForm.reset();
		});

		viewRoot.querySelector('#camera-edit-cancel').addEventListener('click', function() {
			editCameraForm.classList.add('asic-edit-hidden');
			editCameraForm.reset();
		});

		viewRoot.querySelector('#asic-run-once').addEventListener('click', function() {
			run('service', [ 'cmd=run-once' ]).then(notifyResult).then(refresh);
		});
		viewRoot.querySelector('#asic-telegram-test').addEventListener('click', function() {
			run('service', [ 'cmd=telegram-test' ]).then(notifyResult).then(refresh);
		});
		viewRoot.querySelector('#asic-restart').addEventListener('click', function() {
			run('service', [ 'cmd=restart' ]).then(notifyResult).then(refresh);
		});

		renderRows(data);
		poll.add(refresh);
		return viewRoot;
	}
});
