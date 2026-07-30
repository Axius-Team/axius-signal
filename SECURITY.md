Axius Signal Security Policy

Reporting a Vulnerability

We take the security of Axius Signal seriously. If you discover a security vulnerability, please do not open a public issue. Instead, send a private report to the project maintainers.

Contact the project team directly through the GitHub security tab, by emailing support@axius.pro, or by reaching out to the repository owner. Reports are reviewed promptly, and we strive to acknowledge receipt within 48 hours.

We ask that you provide a detailed description of the vulnerability, including steps to reproduce if possible. This helps us address the issue quickly and effectively.

Supported Versions

Security updates are provided for the latest stable release. Older versions may receive critical patches on a case-by-case basis.

Security Considerations

Axius Signal is a telemetry and error reporting library. The following security principles apply:

- In local-only mode, no network requests are made. All data stays within your process.
- In connected mode, events are transmitted over HTTPS with TLS. Event payloads are not encrypted at the application layer.
- Project keys are transmitted with every request. Keep your project key private. Do not commit it to source control.
- Stack traces and event context may contain sensitive information. Review what your application captures before enabling connected mode.
- The library does not access the filesystem, environment variables, or network sockets beyond the explicit API calls you make.
- Input validation is applied to all event data before transmission.

Disclosure Policy

When a vulnerability is reported and confirmed, we will:

1. Acknowledge receipt of the report.
2. Investigate and develop a fix.
3. Release a patched version and publish a security advisory.
4. Credit the reporter in the advisory, if they wish to be acknowledged.

We ask that reporters allow reasonable time for a fix to be developed and deployed before disclosing the vulnerability publicly.

Dependency Responsibility

Axius Signal has zero runtime dependencies. This minimizes the supply chain attack surface. Users are encouraged to verify the integrity of the package through the npm registry and the published source code.
