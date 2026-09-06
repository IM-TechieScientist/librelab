# Logic analyser

The logic analyser samples 1–8 consecutive RP2350 GPIO pins with PIO0 state
machine 0 and transfers packed samples to RAM with DMA.

The GPIO ranges below are current RP2350A firmware limits. RP2350B can use
GPIO0–47 after the application limits are made package-aware. A group above
GPIO31 also requires PIO0 to select its GPIO16–47 window; see
[RP2350B migration](../rp2350b-migration.md).

## Defaults and limits

| Setting | Default | Range |
| --- | --- | --- |
| First GPIO | 16 | 0–29, with the full group ending by GPIO29 |
| Channel count | 2 | 1–8 |
| Samples | 96 | 1–65,536 finite; at most 4,096 for streaming |
| PIO clock divider | 1 | 1–16,777,215 |
| Trigger pin | 16 | 0–29 |
| Trigger level | High (`1`) | Low or high |
| Trigger mode | `AUTO` | `AUTO`, `LEVEL`, `EDGE` |

The sample-rate query returns `clk_sys / divider`. Divider `1` therefore samples
once per PIO instruction at the system clock rate.

## Commands

- `LA:CONFigure:PINBase <gpio>` and query form
- `LA:CONFigure:PINCount <count>` and query form
- `LA:CONFigure:SAMPles <count>` and query form
- `LA:CONFigure:DIVider <divider>` and query form
- `LA:CONFigure:RATE?`
- `LA:CONFigure:TRIGger:PIN <gpio>` and query form
- `LA:CONFigure:TRIGger:LEVel <bool>` and query form
- `LA:CONFigure:TRIGger:MODE <AUTO|LEVEL|EDGE>` and query form
- `LA:INITiate`
- `LA:FETCh[:DATa]?`
- `LA:READ?`
- `LA:STATus?`
- `LA:METadata?`
- `LA:STREAM:STARt`, `LA:STREAM:STOP`, `LA:STREAM:STATus?`
- `LA:WIFI:READ?`

See the [complete command reference](../scpi-reference.md) for responses and
error behavior.

## Capture lifecycle

- `INITiate` performs a capture and stores it in RAM.
- `FETCh?` returns the most recent valid capture without starting another.
- `READ?` is equivalent to initiate followed by fetch.
- Any configuration change invalidates the previous capture and stops streaming.
- Status is `0` for idle/no result, `1` for a valid result, and `2` while busy.

`AUTO` starts without waiting. `LEVEL` waits for the trigger GPIO to equal the
selected level. `EDGE` first waits for the opposite level, then waits for the
selected level. Finite triggered capture has no timeout, so a missing trigger
blocks the cooperative main loop.

## Metadata and payload

`LA:METadata?` returns:

```text
sample_rate_hz,pin_base,pin_count,sample_count,word_count,bits_per_word
```

`FETCH?` and `READ?` return little-endian `uint32_t` words in a SCPI arbitrary
block. Each sample occupies `pin_count` low-to-high bits; sample zero begins at
bit zero. Full decoding rules are in [binary data formats](../data-formats.md).

## Streaming

Streaming uses two internal buffers and supports at most 4,096 samples per
frame. Starting LA streaming stops DSO streaming. USB frames have this shape:

```text
LA:STREAM:FRAME <sequence> <payload_bytes>\n
#<digits><length><binary payload>\n
```

`LA:STREAM:STATus?` returns:

```text
enabled,sequence,overruns
```

When wireless transport is effective, frames use UDP capture framing instead
of the USB text header.

## Example

```text
LA:CONF:PINB 16
LA:CONF:PINC 4
LA:CONF:SAMP 4096
LA:CONF:DIV 150
LA:CONF:TRIG:PIN 16
LA:CONF:TRIG:LEV 1
LA:CONF:TRIG:MODE EDGE
LA:READ?
```

Stop LA activity before using MSO, changing the same GPIOs into outputs, or
starting another module that needs PIO0 SM0 or the same pins.
