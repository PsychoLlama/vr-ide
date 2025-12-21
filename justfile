# Format all files
fmt:
    treefmt

# Run all checks
check:
    #!/usr/bin/env bash
    npm run lint || fail=1
    npm run typecheck || fail=1
    [[ -z "$fail" ]]
