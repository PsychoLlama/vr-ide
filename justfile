# Format all files
fmt:
    treefmt

# Run all checks
check:
    #!/usr/bin/env bash
    pnpm run lint || fail=1
    pnpm run typecheck || fail=1
    [[ -z "$fail" ]]
