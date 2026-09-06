# License overview

LibreLab first-party firmware, documentation, ESP bridge source, and host tools
are distributed under the Apache License 2.0. The full license text is in
[`src/LICENSE`](src/LICENSE).

The repository vendors these third-party components under their own licenses:

| Component | Location | License |
| --- | --- | --- |
| CException | `lib/CException-1.3.4/` | MIT |
| scpi-parser | `lib/scpi-parser-2.3/` | BSD 2-Clause |

The Raspberry Pi Pico SDK, TinyUSB supplied by that SDK, ESP-IDF, ESP managed
components, and libsigrok are external build/runtime dependencies and retain
their respective upstream licenses. Review their license notices when building
or distributing combined binaries.
