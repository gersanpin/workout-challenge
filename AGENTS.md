# workout-challenge

## Cursor Cloud specific instructions

Current repository state: this repo is a placeholder. The only content is `README.md`; there is no application code, dependency manifest, lockfile, build/test/lint config, or services yet.

Environment runtimes available on the VM (already installed, no setup needed):
- Node `v22.14.0` (with `corepack` for `pnpm`/`yarn`)
- Python `3.12.3`
- Go `1.22.2`

Because nothing is implemented yet, there is nothing to build, run, test, or lint. Once real code is added:
- Pick the JS/TS package manager by lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm); default to pnpm if none exists.
- The startup update script is guarded: it installs dependencies only when a recognized manifest (`package.json`, `requirements.txt`, `go.mod`) is present, so it safely no-ops on the current empty repo.
- Update this section with real run/test/build/lint commands and service details once the application exists.
