Axius Signal Contributing Guide

Thank you for considering contributing to Axius Signal. This is an open source error and log handling library for Node.js, and every contribution helps make it better for the community.

Before contributing, please read the README and understand the project scope. Axius Signal is designed as a lightweight, zero-dependency library with a clean API surface.

If you discover a security vulnerability, do not open a public issue or pull request. Please read the SECURITY file for instructions on how to report it privately.

Getting Started

1. Fork the repository.
2. Clone your fork locally.
3. Run npm install to install development dependencies.
4. Run npm run typecheck to verify the project compiles.
5. Explore the source code in src/ and tests in tests/.

Development Workflow

This project follows these conventions:

- Commit messages follow Conventional Commits format.
- Code is written in TypeScript.
- All code is written in English: variable names, function names, comments, and documentation.
- Inline comments in code are not permitted. Function and variable names should be self-documenting.
- Maintain backward compatibility. Do not break the public API without a major version bump.
- Framework adapters should follow the same patterns as existing adapters.

Pull Request Process

1. Create a feature branch from main. Use a descriptive name such as feat/add-kafka-adapter or fix/batch-timing.
2. Make your changes following the coding conventions above.
3. Run npm run typecheck to verify your changes compile.
4. Ensure existing tests still pass. Add tests for new functionality.
5. Update documentation if your changes affect the public API.
6. Open a pull request against the main branch.
7. Provide a clear description of the changes and the motivation behind them.

Code Review

All pull requests require review before merging. Maintainers may ask for changes or clarification. This is a normal part of the process. Please be responsive to feedback.

What to Contribute

We welcome contributions in these areas:

- New framework adapters (Koa, Hapi, etc.).
- Additional sink implementations.
- Performance improvements to batching and transport.
- Documentation and API reference improvements.
- Bug fixes and edge case handling.
- Test coverage expansion.

What Not to Contribute

The following changes are unlikely to be accepted:

- New runtime dependencies. Axius Signal intentionally has zero dependencies.
- Features that force network calls in local-only mode.
- Changes that break the existing public API without a deprecation path.
- Telemetry or analytics within the library itself.

Testing

Run the existing test suite with the test runner configured in the project. If you add new features or adapters, include corresponding tests. Manual testing with real framework integrations is appreciated for adapter changes.

Questions

If you have questions about contributing, open a discussion on GitHub or email support@axius.pro. The maintainers are happy to help.
