# Mixed-signal capture

MSO captures digital GPIO samples and one analog ADC channel under one trigger.
The digital path uses the logic-analyser PIO/DMA engine; the analog path uses
the internal ADC/DMA frontend.

The ranges below describe the current RP2350A image. On RP2350B the digital
range can be extended to GPIO47 with the PIO window rules, while ADC0–ADC7 move
to GPIO40–GPIO47. The existing `channel + 26` mapping must not be reused; see
[RP2350B migration](../rp2350b-migration.md).

## Defaults and limits

| Setting | Default | Range |
| --- | --- | --- |
| Digital first GPIO | 16 | 0–29, group must end by GPIO29 |
| Digital channels | 1 | 1–8 |
| Analog channel | 0 / GPIO26 | 0–3 / GPIO26–29 |
| Sample rate | 500,000 samples/s | 1–500,000 |
| Samples | 1,024 | 1–4,096 |
| Trigger pin | 16 | 0–29 |
| Trigger level | High | Low or high |
| Trigger mode | `EDGE` | `EDGE` or `LEVEL` |
| Trigger timeout | 1 second | Fixed in the current implementation |

## Commands

- `MSO:CONFigure:DIGital:PINBase <gpio>` and query form
- `MSO:CONFigure:DIGital:PINCount <count>` and query form
- `MSO:CONFigure:ANALog:CHANnel <0..3>` and query form
- `MSO:CONFigure:SAMPles <count>` and query form
- `MSO:CONFigure:RATE <rate>` and query form
- `MSO:CONFigure:TRIGger:PIN <gpio>` and query form
- `MSO:CONFigure:TRIGger:LEVel <bool>` and query form
- `MSO:CONFigure:TRIGger:MODE <EDGE|LEVEL>` and query form
- `MSO:INITiate`
- `MSO:FETCh:DIGital?`, `MSO:FETCh:ANALog?`
- `MSO:READ:DIGital?`, `MSO:READ:ANALog?`
- `MSO:STATus?`, `MSO:METadata?`, `MSO:WIFI:READ?`

## Capture lifecycle

Call `MSO:INITiate` once, then fetch both halves. Each `MSO:READ:*?` starts a
new complete mixed-signal capture before returning only the requested half, so
calling both read queries produces two different captures. Use `INITiate` plus
the two `FETCh` queries when alignment matters.

Status is `0` idle, `1` ready, and `2` busy.

## Synchronization model

Both engines are armed before trigger wait. After the digital trigger is seen,
the firmware starts ADC capture and then PIO capture. Metadata currently reports
both start offsets as zero; these fields are placeholders and do not represent a
measured skew or guaranteed simultaneous first sample.

`MSO:METadata?` returns:

```text
sample_rate_hz,sample_count,digital_pin_base,digital_pin_count,
digital_word_count,digital_bits_per_word,analog_channel,analog_gpio,
digital_start_offset_ns,analog_start_offset_ns
```

The actual response is one comma-separated line; it is wrapped above only for
readability.

## Wi-Fi behavior

`MSO:WIFI:READ?` starts one capture and sends two wireless capture sequences
with the same sequence number: instrument ID `3` for digital data and `4` for
analog data. The SCPI response is the sequence number.

## Example

```text
MSO:CONF:DIG:PINB 16
MSO:CONF:DIG:PINC 2
MSO:CONF:ANAL:CHAN 0
MSO:CONF:RATE 250000
MSO:CONF:SAMP 1024
MSO:CONF:TRIG:PIN 16
MSO:CONF:TRIG:LEV 1
MSO:CONF:TRIG:MODE EDGE
MSO:INIT
MSO:META?
MSO:FETC:DIG?
MSO:FETC:ANAL?
```

Stop LA/DSO streaming before MSO capture and avoid overlap between digital
input pins and other peripheral/output functions.
