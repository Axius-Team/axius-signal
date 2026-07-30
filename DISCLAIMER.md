Axius Signal Disclaimer

Copyright 2026 Axius Team

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

Axius Signal is an open source error and log handling library. By using it, you acknowledge that:

- In local-only mode, no data leaves your application. All events are written to the console or your configured sink.
- In connected mode, events are sent to the axius.pro ingestion service. You are responsible for complying with any applicable data protection regulations when transmitting data to external services.
- You should not transmit sensitive information such as passwords, tokens, or personal data in event metadata or log messages.
- The library performs best-effort delivery with batched HTTPS requests and exponential backoff. Network interruptions may cause event loss.
- Framework adapters capture request context including method, URL, and sanitized headers. Review what is captured and sanitize any additional context you attach.

You assume all responsibility for any consequences arising from the use of this software, including but not limited to data loss, security breaches, or service interruptions.
