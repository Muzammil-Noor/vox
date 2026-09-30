set -uo pipefail

cd "$(dirname "$0")/.."

if [ -z "${VOX_CMD:-}" ]; then
    JAR="build/vox.jar"
    if [ ! -f "$JAR" ]; then
        echo "tests: $JAR not found - run ./build.sh first" >&2
        exit 1
    fi
    VOX_CMD="java -jar $JAR"
fi
echo "engine: $VOX_CMD"

pass=0
fail=0
failed_names=()

strip_cr() { tr -d '\r'; }

if [ -n "${VOX_REPORT:-}" ]; then
    : > "$VOX_REPORT"
fi

record() {
    [ -n "${VOX_REPORT:-}" ] || return 0
    printf '%s\t%s\t%s\n' "$1" "$2" "${3-}" >> "$VOX_REPORT"
}

# ---- programs that must run and produce exact output ------------------------
for src in tests/run/*.vox; do
    name="$(basename "$src" .vox)"
    expected_file="tests/run/$name.out"

    if [ ! -f "$expected_file" ]; then
        echo "MISS  $name (no .out file)"
        record "run/$name" fail "no .out file"
        fail=$((fail + 1)); failed_names+=("$name"); continue
    fi

    stdin_file="tests/run/$name.in"
    [ -f "$stdin_file" ] || stdin_file="/dev/null"

    actual="$($VOX_CMD "$src" < "$stdin_file" 2>/dev/null | strip_cr)"
    status=$?
    expected="$(strip_cr < "$expected_file")"

    if [ "$status" -ne 0 ]; then
        echo "FAIL  $name (exit $status, expected 0)"
        record "run/$name" fail "exit $status, expected 0"
        fail=$((fail + 1)); failed_names+=("$name")
    elif [ "$actual" = "$expected" ]; then
        echo "ok    $name"
        record "run/$name" ok
        pass=$((pass + 1))
    else
        echo "FAIL  $name (output mismatch)"
        diff <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") \
            | sed 's/^/        /' | head -20
        record "run/$name" fail "output mismatch"
        fail=$((fail + 1)); failed_names+=("$name")
    fi
done

# ---- programs that must be rejected ----------------------------------------
for src in tests/fail/*.vox; do
    name="$(basename "$src" .vox)"
    expect_file="tests/fail/$name.expect"

    if [ ! -f "$expect_file" ]; then
        echo "MISS  $name (no .expect file)"
        record "fail/$name" fail "no .expect file"
        fail=$((fail + 1)); failed_names+=("$name"); continue
    fi

    # A tight step limit keeps the infinite-loop test quick.
    output="$($VOX_CMD "$src" --steps 200000 < /dev/null 2>&1 | strip_cr)"
    status=$?

    want_status="$(head -1 "$expect_file" | strip_cr)"
    problem=""

    if [ "$status" != "$want_status" ]; then
        problem="exit $status, expected $want_status"
    else
        while IFS= read -r needle; do
            [ -z "$needle" ] && continue
            case "$output" in
                *"$needle"*) ;;
                *) problem="missing text: $needle" ; break ;;
            esac
        done < <(tail -n +2 "$expect_file" | strip_cr)
    fi

    if [ -z "$problem" ]; then
        echo "ok    $name (rejected as expected)"
        record "fail/$name" ok
        pass=$((pass + 1))
    else
        echo "FAIL  $name ($problem)"
        printf '%s\n' "$output" | sed 's/^/        /' | head -10
        record "fail/$name" fail "$problem"
        fail=$((fail + 1)); failed_names+=("$name")
    fi
done

# ---- documentation snippets -------------------------------------------------
# Every code block on the website's /docs page is a real program here, checked
# against the output the page shows. Docs cannot drift from the compiler.
#
#   docs/snippets/NAME.vox  + NAME.out   exact stdout
#                           + NAME.err   exact diagnostics (path prefix stripped)
#                           + NAME.ir    exact emitted IR
#                           + NAME.tokens, NAME.tree, NAME.symbols
#                                        exact output of the matching --emit flag
#                           + NAME.in    optional stdin
for src in docs/snippets/*.vox; do
    name="$(basename "$src" .vox)"
    stdin_file="docs/snippets/$name.in"
    [ -f "$stdin_file" ] || stdin_file="/dev/null"

    problem=""
    checked=0

    if [ -f "docs/snippets/$name.out" ]; then
        checked=1
        actual="$($VOX_CMD "$src" < "$stdin_file" 2>/dev/null | strip_cr)"
        expected="$(strip_cr < "docs/snippets/$name.out")"
        if [ "$actual" != "$expected" ]; then
            problem="stdout mismatch"
            diff <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") \
                | sed 's/^/        /' | head -10
        fi
    fi

    if [ -z "$problem" ] && [ -f "docs/snippets/$name.err" ]; then
        checked=1
        # Diagnostics carry the source path; the page shows them without it.
        actual="$($VOX_CMD "$src" < "$stdin_file" 2>&1 >/dev/null \
            | strip_cr | sed -e "s|^$src: *||" -e 's/^\(> \)*//')"
        expected="$(strip_cr < "docs/snippets/$name.err")"
        if [ "$actual" != "$expected" ]; then
            problem="stderr mismatch"
            diff <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") \
                | sed 's/^/        /' | head -10
        fi
    fi

    if [ -z "$problem" ] && [ -f "docs/snippets/$name.ir" ]; then
        checked=1
        actual="$($VOX_CMD "$src" --emit-ir --check 2>/dev/null | strip_cr)"
        expected="$(strip_cr < "docs/snippets/$name.ir")"
        [ "$actual" = "$expected" ] || problem="IR mismatch"
    fi

    # The pipeline stages, so a page that shows them cannot drift either.
    for stage in tokens tree symbols; do
        [ -n "$problem" ] && break
        [ -f "docs/snippets/$name.$stage" ] || continue
        checked=1
        actual="$($VOX_CMD "$src" --emit-$stage --check 2>/dev/null | strip_cr)"
        expected="$(strip_cr < "docs/snippets/$name.$stage")"
        if [ "$actual" != "$expected" ]; then
            problem="$stage mismatch"
            diff <(printf '%s
' "$expected") <(printf '%s
' "$actual")                 | sed 's/^/        /' | head -10
        fi
    done

    [ "$checked" -eq 0 ] && problem="no expected-output file"

    if [ -z "$problem" ]; then
        echo "ok    docs:$name"
        record "docs/$name" ok
        pass=$((pass + 1))
    else
        echo "FAIL  docs:$name ($problem)"
        record "docs/$name" fail "$problem"
        fail=$((fail + 1)); failed_names+=("docs:$name")
    fi
done

# ---- the shipped examples must at least run ---------------------------------
for src in examples/*.vox; do
    name="$(basename "$src" .vox)"
    stdin_file="examples/$name.in"
    [ -f "$stdin_file" ] || stdin_file="/dev/null"
    if $VOX_CMD "$src" < "$stdin_file" >/dev/null 2>&1; then
        echo "ok    example:$name"
        record "examples/$name" ok
        pass=$((pass + 1))
    else
        echo "FAIL  example:$name (non-zero exit)"
        record "examples/$name" fail "non-zero exit"
        fail=$((fail + 1)); failed_names+=("example:$name")
    fi
done

record "#elapsed" "$SECONDS"

echo
echo "$pass passed, $fail failed"
if [ "$fail" -ne 0 ]; then
    echo "failed: ${failed_names[*]}"
    exit 1
fi
