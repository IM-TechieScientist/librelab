# Internal ADC frontend

The ADC frontend layer separates instrument logic from acquisition hardware. A
backend registers a capability table and callbacks for configure, arm, start,
wait, abort, one-shot read, busy state, and channel-to-GPIO mapping.

## Backend registry

The frontend type enum reserves values for:

```text
NONE = 0
INTERNAL = 1
EXTERNAL_PARALLEL = 2
```

`PLATFORM_init()` registers the internal backend. DSO and MSO explicitly select
it. No external frontend implementation is included.

## Current RP2350A internal ADC backend

| Capability | Value |
| --- | --- |
| Channels | 0–3 |
| GPIO mapping | channel + 26 |
| Sample width | 12 bits |
| Sample rate | 1–500,000 samples/s |
| Maximum capture | 4,096 samples |
| Transfer | ADC FIFO to `uint16_t` RAM through DMA |

The backend can run a blocking capture or split it into arm/start/wait phases,
which MSO uses to coordinate analog and digital engines. Adding another frontend
requires a complete driver, capture engine, registration, selection mechanism,
hardware resource map, and tests; placeholder hardware APIs are intentionally
not kept in the production tree.

## RP2350B note

RP2350B exposes ADC0–ADC7 on GPIO40–GPIO47. The current backend is not
package-aware: it accepts only channels 0–3 and computes GPIO as `26 + channel`.
That mapping is correct for RP2350A and wrong for RP2350B. The future board port
must use a package-specific ADC base/count (and decide whether the public SCPI
range expands to all eight inputs) before DSO or MSO is enabled.
