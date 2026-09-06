# Hardware resources and wiring

The current firmware target is a Raspberry Pi Pico 2, which uses the 30-GPIO
RP2350A package, and optionally an ESP32-C3. A future LibreLab PCB is planned
around RP2350B. GPIO numbers below are chip GPIO numbers. Consult the board
pinout or schematic for physical positions.

RP2350B has enough additional pads to remove the conflicts in the current map,
provided the PCB and firmware assign each function a distinct compatible pad.
It does not automatically resolve conflicts in the current binary. See the
[RP2350B migration plan](rp2350b-migration.md) for the verified differences and
a candidate conflict-free allocation.

## Electrical rules

- RP2350 GPIO is 3.3 V logic and is not 5 V tolerant.
- Connect grounds between LibreLab, an ESP bridge, probes, and target circuits.
- Keep analog input voltage within the board/ADC limits.
- External I2C pull-ups must go to 3.3 V. The current default configuration also
  enables the RP2350 internal pull-ups.
- Do not drive a pin from the pattern/test generators while an external device
  also drives it.

## Current RP2350A default pin map

| GPIO | Default owner/use | Direction | Notes |
| --- | --- | --- | --- |
| 0 | UART0 TX / I2C0 SDA | Output / bidirectional | Logging and I2C0 conflict |
| 1 | UART0 RX / I2C0 SCL | Input / bidirectional | Logging and I2C0 conflict |
| 2 | ESP bridge SPI0 SCK | Output | Allocated when Wi-Fi/AUTO transport initializes |
| 3 | ESP bridge SPI0 MOSI | Output | Pico to ESP |
| 4 | ESP SPI0 MISO / UART1 TX | Input / output | Wi-Fi and UART gateway conflict |
| 5 | ESP SPI0 CS / UART1 RX | Output / input | Wi-Fi and UART gateway conflict |
| 6 | ESP READY / I2C1 SDA | Input / bidirectional | Wi-Fi and I2C1 conflict |
| 7 | I2C1 SCL | Bidirectional | Paired with GPIO6 |
| 10 | SPI1 SCK | Output | Generic SPI gateway |
| 11 | SPI1 MOSI | Output | Generic SPI gateway |
| 12 | SPI1 MISO | Input | Generic SPI gateway |
| 13 | SPI1 CS / PWM test output | Output | SPI and analog-test conflict |
| 15 | Square-wave test output | Output | 1 kHz default |
| 16–23 | LA/MSO inputs or pattern outputs | Configurable | Consecutive group, defaults begin at 16 |
| 26 | ADC0 | Analog input | Default DSO/MSO analog channel |
| 27 | ADC1 | Analog input | Internal ADC channel 1 |
| 28 | ADC2 | Analog input | Internal ADC channel 2 |
| 29 | ADC3 | Analog input | Internal ADC channel 3 |

The onboard status LED uses `PICO_DEFAULT_LED_PIN` when the selected Pico SDK
board definition supplies one.

## ESP32-C3 bridge wiring

| Pico 2 | Signal | ESP32-C3 default |
| --- | --- | --- |
| GPIO2 | SPI0 SCK | GPIO4 |
| GPIO3 | SPI0 MOSI | GPIO5 (input) |
| GPIO4 | SPI0 MISO | GPIO6 (output) |
| GPIO5 | SPI0 CS | GPIO7 |
| GPIO6 | READY | GPIO10 (output) |
| GND | Common ground | GND |

The Pico is SPI master, the ESP is SPI slave, mode 0, MSB first, at 1 MHz. The
ESP asserts READY only while it has queued a transaction.

## Peripheral assignments

| Resource | Firmware use |
| --- | --- |
| PIO0 state machine 0 | Logic analyser and MSO digital capture |
| PIO0 state machine 1 | Pattern generator |
| SPI0 | Optional Pico-to-ESP bridge |
| SPI1 | Generic SPI gateway backend |
| UART0 | Buffered log/stdout transport |
| UART1 | Generic UART gateway |
| ADC + ADC FIFO | DSO and MSO analog capture |
| PWM slices | Square and PWM-based analog test outputs |
| DMA | Claimed dynamically by LA, pattern generator, ADC, and ESP bridge |

LA and MSO share the same logical-analyser backend and cannot capture
simultaneously. DSO and MSO share the ADC backend. Resource allocation is local
to each module; there is no global arbiter.

## Current configurable and fixed mappings

- LA, MSO digital pins, trigger pins, pattern pins, and test-output pins are
  configurable with SCPI.
- DSO/MSO analog input is selected by ADC channel; mapping is fixed to GPIO26–29.
- UART gateway pins are fixed to UART1 GPIO4/5.
- I2C gateway pins are fixed per bus to GPIO0/1 or GPIO6/7.
- SPI gateway pins are fixed to GPIO10–13 by the current application gateway.
- Pico-to-ESP pins are compile-time constants on the Pico side and Kconfig
  options on the ESP side. Changing only one side breaks the link.

## Recommended combinations

- USB + LA/DSO/MSO/PG: avoid overlapping chosen capture/output pins.
- USB + UART gateway: safe with default pins; logging remains on UART0.
- USB + I2C1: usable if the ESP bridge is not connected/enabled.
- Wi-Fi + generic UART: not safe with defaults because both use GPIO4/5.
- Wi-Fi + I2C1: not safe with defaults because both use GPIO6.
- SPI gateway + PWM analog test: not safe with defaults because both use GPIO13.

If a board design requires simultaneous use of conflicting features, change
the platform mapping in code and treat the change as a board configuration,
then update this document.

## Future RP2350B board

RP2350B expands bank 0 from GPIO0–29 to GPIO0–47. This creates enough pad-level
space to separate logging, the ESP bridge, all three bus gateways, test outputs,
an eight-bit LA bank, an eight-bit pattern bank, and the ADC inputs. Peripheral
controllers are unchanged in count, so the design still has two UARTs, two
SPIs, and two I2Cs; extra pads are alternate routes, not extra controllers.

The package also changes two rules which the PCB and firmware must follow:

- ADC0–ADC7 are on GPIO40–GPIO47. GPIO26–GPIO29 are not ADC inputs on RP2350B.
- Each PIO instance can address either GPIO0–31 or GPIO16–47. PIO0 must select
  the latter window if the pattern bank uses GPIO32 or above, and all active
  state machines on that PIO must fit the same window.

Do not use the current `pico2` image on that board as a functional validation
image. It identifies an RP2350A target, limits multiple features to GPIO0–29,
and maps internal ADC channels to GPIO26–29.
