# Oscilloscope

The DSO captures one RP2350 internal ADC input at a time. The ADC FIFO is paced
by its clock divider and drained into a `uint16_t` buffer with DMA.

The channel/GPIO values below are for the current RP2350A target. RP2350B places
ADC0–ADC7 on GPIO40–GPIO47, so its port requires a different backend mapping;
see [RP2350B migration](../rp2350b-migration.md).

## Defaults and limits

| Setting | Default | Range |
| --- | --- | --- |
| ADC channel | 0 | 0–3 |
| GPIO | 26 | 26–29, derived from channel |
| Sample rate | 100,000 samples/s | 1–500,000 samples/s |
| Samples | 1,024 | 1–4,096 |
| Trigger mode | `OFF` | `OFF`, `LEVEL`, `EDGE` |
| Trigger level | 2,048 | 0–4,095 raw ADC counts |
| Trigger slope | `RISE` | `RISE`/`RISING`, `FALL`/`FALLING` |

The data is raw 12-bit ADC output stored in the low bits of little-endian
`uint16_t` values. Voltage conversion depends on the board analog reference and
front-end circuitry; the firmware does not currently apply calibration.

## Commands

- `DSO:CONFigure:CHANnel <0..3>` and query form
- `DSO:CONFigure:GPIO?`
- `DSO:CONFigure:SAMPles <1..4096>` and query form
- `DSO:CONFigure:RATE <1..500000>` and query form
- `DSO:CONFigure:TRIGger:LEVel <0..4095>` and query form
- `DSO:CONFigure:TRIGger:MODE <OFF|LEVEL|EDGE>` and query form
- `DSO:CONFigure:TRIGger:SLOPe <RISE|FALL>` and query form
- `DSO:INITiate`, `DSO:FETCh[:DATa]?`, `DSO:READ?`, `DSO:STATus?`
- `DSO:STREAM:STARt`, `DSO:STREAM:STOP`, `DSO:STREAM:STATus?`
- `DSO:WIFI:READ?`

## Trigger behavior

`OFF` begins the DMA capture immediately. `LEVEL` repeatedly samples until the
value is at/above the threshold for rising mode or at/below it for falling mode.
`EDGE` waits for the signal to be on the opposite side, then cross to the chosen
side.

Finite `INITiate`/`READ?` uses no trigger timeout. A missing trigger blocks the
main loop. Streaming uses a 10 ms timeout per attempted frame; a timeout
increments the overrun count and streaming remains enabled for later attempts.

## Capture and streaming

`INITiate` stores a capture, `FETCh?` returns it, and `READ?` combines both.
Status values are `0` idle, `1` capture ready, and `2` busy/streaming.

Starting DSO streaming stops LA streaming. USB stream frames use the prefix
`DSO:STREAM:FRAME`; wireless frames use instrument ID `2`.

## Example

```text
DSO:CONF:CHAN 0
DSO:CONF:GPIO?
DSO:CONF:RATE 250000
DSO:CONF:SAMP 2048
DSO:CONF:TRIG:LEV 2048
DSO:CONF:TRIG:MODE EDGE
DSO:CONF:TRIG:SLOP RISE
DSO:READ?
```

Stop DSO streaming before using mixed-signal capture because both use the one
internal ADC/DMA backend.
