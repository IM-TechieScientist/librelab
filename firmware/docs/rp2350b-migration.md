# RP2350B PCB and firmware migration

## Verified conclusion

The RP2350B package can eliminate the current LibreLab **pad-level** conflicts.
It exposes 48 GPIOs instead of the RP2350A's 30, and the added pins have UART,
SPI, I2C, PWM, and PIO alternate functions. A conflict-free PCB is therefore
feasible.

This is not automatic and RP2350B is not a drop-in target for the current
binary. The PCB must route a non-overlapping map and the firmware must select
that map. Shared hardware engines and firmware ownership constraints continue
to exist even when every signal has a different pad.

## Package differences that affect LibreLab

| Property | RP2350A / current Pico 2 | RP2350B / future PCB | Consequence |
| --- | --- | --- | --- |
| Package | QFN-60 | QFN-80 | A new PCB footprint and escape routing are required. |
| Bank-0 GPIO | 30, GPIO0–29 | 48, GPIO0–47 | B has 18 extra pads for separating functions. |
| ADC inputs | ADC0–3 on GPIO26–29 | ADC0–7 on GPIO40–47 | The present `26 + channel` calculation is invalid on B. |
| PWM outputs | 16 channels | 24 channels | B adds slices 8–11, but paired A/B outputs still share a slice. |
| UART/SPI/I2C controllers | 2 / 2 / 2 | 2 / 2 / 2 | B adds routes, not controller instances. |
| PIO-visible pins | GPIO0–29 fit the low window | Per PIO: GPIO0–31 or GPIO16–47 | High pins require selecting the PIO base and keeping a PIO's active pins in one window. |

Official references:

- [Raspberry Pi microcontroller chip comparison](https://www.raspberrypi.com/documentation/microcontrollers/microcontroller-chips.html)
- [RP2350 datasheet](https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf), especially the pin-function and ADC chapters
- [Pico SDK PIO API](https://www.raspberrypi.com/documentation/pico-sdk/hardware.html), including `pio_set_gpio_base()`
- [Pico SDK RP2350 platform definition](https://github.com/raspberrypi/pico-sdk/blob/master/src/rp2350/pico_platform/include/pico/platform.h)

## Why the current firmware is RP2350A-only

The current documented pin conflicts are real for the current build. They are
not all unavoidable properties of the RP2350A; they result from fitting many
functions into the selected fixed/default routes without a global owner.

The source also contains explicit A assumptions:

- builds use `PICO_BOARD=pico2`, whose SDK board header sets `PICO_RP2350A=1`;
- LA, MSO, pattern, test-signal, I2C, and SPI paths contain GPIO29/30 limits;
- the internal ADC accepts channels 0–3 and maps them to GPIO26–29;
- UART, I2C, SPI, logging, and ESP-link defaults are fixed in their modules;
- PIO0 is used by both LA/MSO digital capture and pattern output, but no code
  selects PIO's GPIO16–47 window.

Consequently, merely fitting an RP2350B or changing the CMake board name would
not enable the extra pads and would route analog acquisition incorrectly.

## Candidate conflict-free allocation

This allocation demonstrates feasibility; it is a routing input, not an
approved schematic pinout. Power, ground, USB, flash, debug, clock, analog
layout, HSTX, and manufacturing constraints still require schematic review.

| Function | Candidate RP2350B GPIO | Reason |
| --- | --- | --- |
| Logging UART0 | TX 0, RX 1 | Retains the current debug connector convention. |
| ESP bridge SPI0 + READY | SCK 2, TX 3, RX 4, CS 5, READY 6 | Retains the existing two-board bridge protocol. |
| Status LED | 7 | Keeps it outside instrument banks; define it in the board header. |
| UART gateway UART1 | TX 8, RX 9 | Valid UART1 alternate-function pair, separate from SPI0. |
| I2C gateway I2C1 | SDA 10, SCL 11 | Valid I2C1 pair, separate from logging and READY. |
| Square test output | 12 | PWM slice 6A. |
| PWM “analog” test output | 14 | PWM slice 7A, so it does not share the square output's slice. |
| LA/MSO digital bank | 16–23 | Eight consecutive inputs in the PIO high window. |
| SPI gateway SPI1 | RX 28, CS 29, SCK 30, TX 31 | One coherent SPI1 route, outside the capture bank. |
| Pattern-generator bank | 32–39 | Eight consecutive outputs in the same PIO high window as LA. |
| Internal ADC | ADC0–7 on 40–47 | The RP2350B's fixed analog-capable pins. |

GPIO13, GPIO15, and GPIO24–27 remain available in this example. All listed
signal pads are distinct, and both PIO0 banks lie inside GPIO16–47. Features
which share an engine still cannot necessarily run together: LA and MSO use the
same capture backend, DSO and MSO share the ADC, and LA/pattern share PIO0 even
though they use different state machines.

Before committing this allocation, verify every signal against the RP2350B
pin-function table and the completed schematic. In particular, reserve any
pins needed by board power control, voltage monitoring, external analog
frontends, or production test.

## Required firmware work

1. Add a custom Pico SDK board definition, for example
   `boards/librelab_rp2350b.h`. It must select `rp2350`, define
   `PICO_RP2350A` as `0`, and describe the real flash, LED, and board defaults.
2. Move every board pin into one board-profile header. Avoid duplicating numeric
   GPIO constants across platform and application modules.
3. Replace hard-coded `29`, `30`, and GPIO-count checks with package/profile
   limits. Validate the alternate function as well as the numeric range.
4. Make the ADC backend package-aware: B has eight channels at GPIO40–47.
   Update DSO/MSO SCPI validation, capability reporting, metadata, and tests.
5. Set PIO0's GPIO base to `16` before loading/configuring programs that use the
   candidate LA and pattern banks. The SDK must build with
   `PICO_PIO_USE_GPIO_BASE=1`, which is normally enabled for a correctly defined
   B target. Treat the base as PIO-wide state, not state-machine-local state.
6. Apply the new UART1, I2C1, SPI1, PWM, LED, and ESP-link mappings. Keep the
   ESP32-C3 Kconfig pins synchronized if the bridge wiring changes.
7. Add a central GPIO/peripheral owner so invalid concurrent combinations fail
   before a module changes pin mux or direction.
8. Build A and B targets in CI. On B hardware, test all 48 digital pads, all
   routed ADC inputs, simultaneous non-conflicting gateways, both test outputs,
   maximum-width LA and pattern banks, USB, Wi-Fi, SWD, and reset/BOOTSEL paths.

## Acceptance criteria for declaring RP2350B supported

- The build uses the LibreLab RP2350B board definition, not `pico2`.
- Compile-time assertions report 48 bank-0 GPIOs and the intended ADC mapping.
- The generated schematic pin table and firmware board profile agree exactly.
- No default GPIO is assigned to more than one simultaneously advertised
  function, and conflicts on shared engines are rejected with a clear error.
- LA and pattern generation pass on GPIOs above 31 with PIO base 16.
- DSO/MSO capture the actual GPIO40–47 analog inputs; GPIO26–29 are never
  documented or initialized as analog inputs on B.
- The complete hardware validation matrix passes on a populated PCB.
