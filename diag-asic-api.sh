#!/bin/sh

for ip in "$@"; do
	echo "IP $ip"
	for cmd in summary stats devs; do
		echo "CMD $cmd"
		in="/tmp/asic-diag-$ip-$cmd.in"
		out="/tmp/asic-diag-$ip-$cmd.out"
		printf '{"command":"%s"}' "$cmd" >"$in"
		nc "$ip" 4028 <"$in" >"$out" 2>/dev/null &
		pid="$!"
		i=0
		while kill -0 "$pid" 2>/dev/null; do
			[ "$i" -ge 4 ] && {
				kill "$pid" 2>/dev/null || true
				break
			}
			sleep 1
			i=$((i + 1))
		done
		wait "$pid" 2>/dev/null || true
		tr '\000,|{}[]' '\n\n\n\n\n\n' <"$out" |
			grep -Ei 'temp|temperature|chain|GHS|MHS|hash|accepted|rejected|hardware|fan|freq|rate' |
			head -120
	done
done

