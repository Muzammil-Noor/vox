#!/usr/bin/env bash

set -uo pipefail

cd "$(dirname "$0")/.."

JAVA_CMD="${JAVA_CMD:-java -jar build/vox.jar}"
TS_CMD="${TS_CMD:-node core/dist/cli.js}"

if [ "$JAVA_CMD" = "java -jar build/vox.jar" ] && [ ! -f build/vox.jar ]; then
    echo "parity: build/vox.jar not found - run ./build.sh first" >&2
    exit 1
fi
if [ ! -f core/dist/cli.js ] && [ "$TS_CMD" = "node core/dist/cli.js" ]; then
    echo "parity: core/dist/cli.js not found - run 'npm run build -w core' first" >&2
    exit 1
fi

echo "java:       $JAVA_CMD"
echo "typescript: $TS_CMD"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

pass=0
fail=0
failed_names=()

strip_cr() { tr -d '\r'; }

for src in tests/run/*.vox tests/fail/*.vox docs/snippets/*.vox examples/*.vox; do
    # --check never runs the program, so stdin and runtime behaviour play no
    # part here: this compares compilation only.
    $JAVA_CMD "$src" --emit-ir --check >"$tmp/j.out" 2>"$tmp/j.err" </dev/null
    j_status=$?
    $TS_CMD "$src" --emit-ir --check >"$tmp/t.out" 2>"$tmp/t.err" </dev/null
    t_status=$?

    problem=""
    detail=""

    if [ "$j_status" != "$t_status" ]; then
        problem="exit code differs: java $j_status, typescript $t_status"
    elif ! diff -q <(strip_cr <"$tmp/j.out") <(strip_cr <"$tmp/t.out") >/dev/null; then
        problem="IR differs"
        detail="$(diff <(strip_cr <"$tmp/j.out") <(strip_cr <"$tmp/t.out"))"
    elif ! diff -q <(strip_cr <"$tmp/j.err") <(strip_cr <"$tmp/t.err") >/dev/null; then
        problem="diagnostics differ"
        detail="$(diff <(strip_cr <"$tmp/j.err") <(strip_cr <"$tmp/t.err"))"
    fi

    if [ -z "$problem" ]; then
        pass=$((pass + 1))
    else
        echo "FAIL  $src ($problem)"
        [ -n "$detail" ] && printf '%s\n' "$detail" | sed 's/^/        /' | head -20
        fail=$((fail + 1)); failed_names+=("$src")
    fi
done

echo
echo "$pass agree, $fail differ"
if [ "$fail" -ne 0 ]; then
    echo "differing: ${failed_names[*]}"
    exit 1
fi
