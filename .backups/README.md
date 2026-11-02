# Availability baseline

`pre-multiprovider-availability-20261102-2315.zip` is the verified baseline taken before multi-provider availability response work.

- Includes `src`, `test`, project configuration, lockfile, `.env.example`, and `README.md`.
- Excludes `.env`, `node_modules`, `dist`, and production credentials.
- Baseline checks: TypeScript typecheck passed, 21 tests passed, and NestJS build passed.
- SHA-256 is stored beside the archive in the `.sha256` file.

Restore into a separate temporary directory first and compare the intended files before replacing the workspace.
