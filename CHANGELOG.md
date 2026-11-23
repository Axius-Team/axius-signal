# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Changed project license from Elastic License 2.0 to Apache 2.0 (Copyright 2026 Axius Team).
- Updated LICENSE file with the full Apache 2.0 license text.
- Updated package.json license field from MIT to Apache-2.0.
- Root-level README.md with project overview, installation, quick start examples, and package entry points.
- docs/ directory with comprehensive documentation:
  - docs/README.md: overview, quick start, and documentation index.
  - docs/api.md: full API reference for the Signal class and all exported types.
  - docs/architecture.md: module overview, data flow diagrams, and design principles.
  - docs/adapters.md: Express, Fastify, and NestJS adapter usage guides with code examples.
  - docs/transport.md: batching, queue, retry, backoff, and sender internals.
  - docs/authentication.md: Project key authentication and security model.
- `exports` map with `types` conditions for the root and adapter entry points, plus `typesVersions` for classic TypeScript resolution.
- Package metadata: repository, homepage, bugs, keywords, author and publishConfig.
- `prepack` and `prepublishOnly` hooks that build and typecheck before publishing.
- GitHub Actions publish workflow with provenance and public access.

### Fixed

- Entry points now resolve to compiled CommonJS output in `dist` instead of TypeScript sources, so `require('axius-signal')` and `import ... from 'axius-signal'` work after installation.
- Build output now targets `dist/index.js` with matching declarations, source maps and inline sources; `rootDir` corrected to `src`.
- Published tarball now contains only the compiled `dist` output plus documentation files, controlled by the `files` allowlist.
- `package-lock.json` license metadata aligned with Apache-2.0.
- README documentation links now use absolute GitHub URLs so they resolve on npm.
