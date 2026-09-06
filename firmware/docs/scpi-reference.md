# SCPI command reference

This page lists every command registered by the current Pico 2/RP2350A
firmware. The command table in `src/application/protocol/common.c` is the source
of truth.

All GPIO and ADC ranges here describe that current image. The planned RP2350B
port will require package-aware command limits; see
[RP2350B migration](rp2350b-migration.md).

## Syntax and responses

- Commands are case-insensitive. Capital letters shown below are the shortest
  accepted spelling; lowercase letters complete the long spelling.
- End each program message with LF (`\n`) or CRLF (`\r\n`).
- Separate parameters with commas. Boolean parameters accept the SCPI boolean
  forms supported by the bundled parser, including `0`/`1` and `OFF`/`ON`.
- Write ordinary integers in decimal. SCPI non-decimal notation is `#H3C` for
  hexadecimal, `#Q74` for octal, or `#B111100` for binary; C-style `0x3C` is
  not the documented input syntax.
- Text and numeric queries end in a newline. Binary queries return a SCPI
  definite-length arbitrary block, described in [data formats](data-formats.md).
- The input buffer is 1,024 bytes and the SCPI error queue holds 16 entries.
- A command with no documented response is silent on success. Inspect
  `SYSTem:ERRor?` after a failed operation.

Examples use legal abbreviated spellings:

```text
LA:CONF:PINC 4
LA:CONF:PINC?
```

## IEEE 488.2 and required system commands

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `*RST` | none | Reset LA, DSO, MSO, and pattern-generator state. It does not reboot the board or reset gateway/transport configuration. |
| `*IDN?` | `FOSSASIA,LibreLab Pico,1.0,v0.1.0` | Device identification. |
| `*TST?` | integer | Parser core self-test response. |
| `*CLS` | none | Clear standard status and the SCPI error queue. |
| `*ESE <mask>` / `*ESE?` | event-status enable byte | Set/query the standard event-status enable register. |
| `*ESR?` | event-status byte | Read and clear the standard event-status register. |
| `*OPC` / `*OPC?` | query returns `1` | Standard operation-complete commands. Operations in this firmware are synchronous. |
| `*SRE <mask>` / `*SRE?` | service-request enable byte | Set/query the service-request enable register. |
| `*STB?` | status byte | Read the status byte. |
| `*WAI` | none | Standard wait-to-continue command; there is no background command queue. |
| `SYSTem:ERRor[:NEXT]?` | `code,"message"` | Pop the oldest error, or return no-error when empty. `SYST:ERR?` is the usual short form. |
| `SYSTem:ERRor:COUNt?` | integer | Number of queued SCPI errors. |
| `SYSTem:VERSion?` | text | SCPI language version reported by the bundled parser. |

## Communication transport

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `COMM:TRANsport <USB\|WIFI\|WIRELESS\|AUTO>` | mode | Select the capture/SCPI transport. `WIRELESS` is an alias for `WIFI`. Selecting Wi-Fi or auto initializes the Pico-side ESP bridge. |
| `COMM:TRANsport?` | `USB`, `WIFI`, or `AUTO` | Return the configured mode. |
| `COMM:WIFI:STATus?` | `effective,sent,dropped,timeouts` | Return effective-mode flag and Pico-side SPI-frame counters. In forced `WIFI` mode, `effective` reflects the selected mode, not proof that an ESP is responding. |

The boot default is `USB`. A newly booted device must therefore receive
`COMM:TRAN AUTO` or `COMM:TRAN WIFI` over USB before it polls the ESP for TCP
commands.

## UART gateway

The UART gateway is fixed at 8 data bits, no parity, one stop bit. Binary input
and output use arbitrary blocks. See [bus gateways](features/bus-gateways.md).

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `BUS:UART:OPEN` / `BUS:UART:OPEN?` | query returns boolean | Open UART1, or query its open state. |
| `BUS:UART:CLOSe` | none | Close the UART gateway. |
| `BUS:UART:CONFigure:BUS <1>` / `BUS:UART:CONFigure:BUS?` | bus number | Select/query the only supported bus. Set while closed. |
| `BUS:UART:CONFigure:BAUD <1200..3000000>` / `BUS:UART:CONFigure:BAUD?` | bit/s | Set/query baud while closed. Default 115,200. |
| `BUS:UART:CONFigure:TIMEout <0..60000>` / `BUS:UART:CONFigure:TIMEout?` | milliseconds | Set/query read/flush timeout. Default 100 ms. |
| `BUS:UART:WRITe <block>` | bytes written | Queue up to 512 bytes for transmission. |
| `BUS:UART:READ? [maximum]` | binary block | Read available bytes, up to 512. The optional maximum defaults to 512 and larger values are clamped. |
| `BUS:UART:AVAILable?` | byte count | Return the RX bytes currently buffered. |
| `BUS:UART:CLEar` | none | Clear buffered receive data. |
| `BUS:UART:FLUSh` | none | Wait for pending transmit data using the configured timeout. |
| `BUS:UART:TRANsact? <block>` | binary block | Clear RX, write and flush, then read until 512 bytes, 5 ms of RX inactivity, or the configured timeout. |

## I2C gateway

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `BUS:I2C:OPEN` / `BUS:I2C:OPEN?` | query returns boolean | Open/query the configured I2C master. |
| `BUS:I2C:CLOSe` | none | Close the I2C gateway. |
| `BUS:I2C:CONFigure:BUS <0\|1>` / `BUS:I2C:CONFigure:BUS?` | bus number | Set/query bus while closed. Bus 0 uses GPIO0/1; bus 1 uses GPIO6/7. |
| `BUS:I2C:CONFigure:RATE <1000..1000000>` / `BUS:I2C:CONFigure:RATE?` | Hz | Set/query clock rate while closed. Default 100 kHz. |
| `BUS:I2C:CONFigure:ADDRess <8..119>` / `BUS:I2C:CONFigure:ADDRess?` | 7-bit address | Set/query the current target address. Default `0x3C` (60). |
| `BUS:I2C:CONFigure:TIMEout <1..60000>` / `BUS:I2C:CONFigure:TIMEout?` | milliseconds | Set/query transfer timeout. Default 100 ms. |
| `BUS:I2C:SCAN?` | comma-separated hex | Probe usable 7-bit addresses and return values such as `3C,68`. |
| `BUS:I2C:WRITe <block>` | bytes written | Write up to 512 bytes and issue STOP. |
| `BUS:I2C:READ? <1..512>` | binary block | Read the requested number of bytes. |
| `BUS:I2C:TRANsact? <write-block>,<1..512>` | binary block | Write without STOP, then repeated-start and read. |

## SPI gateway

These commands are registered, but the current build has a bus-number mismatch:
the command layer only accepts bus `1` and the system layer exposes logical bus
`0`. `BUS:SPI:OPEN` consequently fails with an execution error until that defect
is fixed.

| Command | Parameters / response | Meaning once the bus mismatch is fixed |
| --- | --- | --- |
| `BUS:SPI:OPEN` / `BUS:SPI:OPEN?` | query returns boolean | Open/query SPI1. |
| `BUS:SPI:CLOSe` | none | Close the SPI gateway. |
| `BUS:SPI:CONFigure:BUS <1>` / `BUS:SPI:CONFigure:BUS?` | bus number | Set/query the command-layer bus while closed. |
| `BUS:SPI:CONFigure:RATE <1000..50000000>` / `BUS:SPI:CONFigure:RATE?` | Hz | Set/query clock rate while closed. Default 1 MHz. |
| `BUS:SPI:CONFigure:MODE <0..3>` / `BUS:SPI:CONFigure:MODE?` | mode | Set/query CPOL/CPHA mode while closed. Default mode 0. |
| `BUS:SPI:CONFigure:DUMMY <0..255>` / `BUS:SPI:CONFigure:DUMMY?` | byte value | Set/query the byte transmitted during read clocks. Default `0xFF`. |
| `BUS:SPI:WRITe <block>` | bytes written | Assert CS and write up to 512 bytes. |
| `BUS:SPI:READ? <1..512>` | binary block | Read while sending the dummy byte. |
| `BUS:SPI:EXCHange? <block>` | binary block | Full-duplex transfer; response length equals input length. |
| `BUS:SPI:TRANsact? <write-block>,<1..512>` | binary block | Write a command then read while keeping the transaction selected. |

All SPI transfers are 8-bit, MSB-first, and use an active-low GPIO13 CS.

## Logic analyser

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `LA:CONFigure:PINBase <gpio>` / `LA:CONFigure:PINBase?` | GPIO | First of the consecutive input pins. Default 16. |
| `LA:CONFigure:PINCount <1..8>` / `LA:CONFigure:PINCount?` | channels | Number of consecutive pins. Default 2. |
| `LA:CONFigure:SAMPles <1..65536>` / `LA:CONFigure:SAMPles?` | samples | Samples per finite capture. Streaming additionally limits this to 4,096. Default 96. |
| `LA:CONFigure:DIVider <1..16777215>` / `LA:CONFigure:DIVider?` | integer divider | PIO clock divider. Default 1. |
| `LA:CONFigure:RATE?` | samples/s | Return `clk_sys / divider`. |
| `LA:CONFigure:TRIGger:PIN <gpio>` / `LA:CONFigure:TRIGger:PIN?` | GPIO | Set/query trigger GPIO. Default 16. |
| `LA:CONFigure:TRIGger:LEVel <bool>` / `LA:CONFigure:TRIGger:LEVel?` | boolean | Desired high/low trigger level. Default high. |
| `LA:CONFigure:TRIGger:MODE <AUTO\|EDGE\|LEVEL>` / `LA:CONFigure:TRIGger:MODE?` | mode | Set/query trigger mode. Default `AUTO`. `EDGE` uses the selected level as the destination level. |
| `LA:INITiate` | none | Perform and retain a synchronous capture. Triggered modes can wait indefinitely. |
| `LA:FETCh[:DATa]?` | binary block | Return the retained capture; error if none is ready. `LA:FETC?` and `LA:FETC:DATA?` are equivalent. |
| `LA:READ?` | binary block | Initiate, then fetch one capture. |
| `LA:STATus?` | `0`, `1`, or `2` | `0` idle, `1` capture ready, `2` busy/streaming. |
| `LA:METadata?` | six CSV integers | `sample_rate,pin_base,pin_count,sample_count,word_count,bits_per_word`. |
| `LA:STREAM:STARt` | none | Start continuous frames and stop DSO streaming. |
| `LA:STREAM:STOP` | none | Stop continuous frames. |
| `LA:STREAM:STATus?` | three CSV integers | `enabled,sequence,overruns`. |
| `LA:WIFI:READ?` | sequence number | Force Wi-Fi mode, capture once, send wireless metadata/data frames, and return the capture sequence over SCPI. |

## Oscilloscope

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `DSO:CONFigure:CHANnel <0..3>` / `DSO:CONFigure:CHANnel?` | ADC channel | Select/query ADC0–ADC3. Default 0. |
| `DSO:CONFigure:GPIO?` | GPIO | Return 26–29 for the selected ADC channel. |
| `DSO:CONFigure:SAMPles <1..4096>` / `DSO:CONFigure:SAMPles?` | samples | Set/query capture length. Default 1,024. |
| `DSO:CONFigure:RATE <1..500000>` / `DSO:CONFigure:RATE?` | samples/s | Set/query sample rate. Default 100 ksample/s. |
| `DSO:CONFigure:TRIGger:LEVel <0..4095>` / `DSO:CONFigure:TRIGger:LEVel?` | ADC counts | Set/query raw 12-bit threshold. Default 2,048. |
| `DSO:CONFigure:TRIGger:MODE <OFF\|LEVEL\|EDGE>` / `DSO:CONFigure:TRIGger:MODE?` | mode | Set/query trigger mode. Default `OFF`. |
| `DSO:CONFigure:TRIGger:SLOPe <RISE\|RISING\|FALL\|FALLING>` / `DSO:CONFigure:TRIGger:SLOPe?` | slope | Set/query trigger direction. Query returns the canonical stored spelling. |
| `DSO:INITiate` | none | Perform and retain a synchronous capture. A finite triggered capture has no timeout. |
| `DSO:FETCh[:DATa]?` | binary block | Return the retained capture. |
| `DSO:READ?` | binary block | Initiate, then fetch one capture. |
| `DSO:STATus?` | `0`, `1`, or `2` | `0` idle, `1` capture ready, `2` busy/streaming. |
| `DSO:STREAM:STARt` | none | Start continuous frames and stop LA streaming. |
| `DSO:STREAM:STOP` | none | Stop continuous frames. |
| `DSO:STREAM:STATus?` | three CSV integers | `enabled,sequence,overruns`. |
| `DSO:WIFI:READ?` | sequence number | Force Wi-Fi mode, capture once, send wireless metadata/data frames, and return its sequence. |

## Mixed-signal capture

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `MSO:CONFigure:DIGital:PINBase <gpio>` / `MSO:CONFigure:DIGital:PINBase?` | GPIO | First consecutive digital pin. Default 16. |
| `MSO:CONFigure:DIGital:PINCount <1..8>` / `MSO:CONFigure:DIGital:PINCount?` | channels | Digital channel count. Default 1. |
| `MSO:CONFigure:ANALog:CHANnel <0..3>` / `MSO:CONFigure:ANALog:CHANnel?` | ADC channel | Analog channel. Default 0/GPIO26. |
| `MSO:CONFigure:SAMPles <1..4096>` / `MSO:CONFigure:SAMPles?` | samples per side | Shared digital/analog capture length. Default 1,024. |
| `MSO:CONFigure:RATE <1..500000>` / `MSO:CONFigure:RATE?` | samples/s | Shared requested sample rate. Default 500 ksample/s. |
| `MSO:CONFigure:TRIGger:PIN <gpio>` / `MSO:CONFigure:TRIGger:PIN?` | GPIO | Digital trigger GPIO. Default 16. |
| `MSO:CONFigure:TRIGger:LEVel <bool>` / `MSO:CONFigure:TRIGger:LEVel?` | boolean | Destination/high-low trigger level. Default high. |
| `MSO:CONFigure:TRIGger:MODE <EDGE\|LEVEL>` / `MSO:CONFigure:TRIGger:MODE?` | mode | Digital trigger mode. Default `EDGE`. |
| `MSO:INITiate` | none | Capture both streams with a shared trigger; trigger wait timeout is one second. |
| `MSO:FETCh:DIGital?` / `MSO:FETCh:ANALog?` | binary block | Fetch the two parts of the same retained capture. |
| `MSO:READ:DIGital?` / `MSO:READ:ANALog?` | binary block | Each command starts a new capture and returns only that side. Use `INITiate` plus two `FETCh` queries when alignment matters. |
| `MSO:STATus?` | `0`, `1`, or `2` | `0` idle, `1` capture ready, `2` busy. |
| `MSO:METadata?` | ten CSV integers | `rate,samples,digital_base,digital_count,digital_words,bits_per_word,analog_channel,analog_gpio,digital_offset_ns,analog_offset_ns`. Offsets are currently zero placeholders. |
| `MSO:WIFI:READ?` | sequence number | Force Wi-Fi mode and send paired digital and analog captures with a common sequence. |

## Pattern generator

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `PG:CONFigure:PINS <base>,<1..8>` / `PG:CONFigure:PINS?` | query: `base,count` | Configure consecutive outputs. Default GPIO16, one pin. |
| `PG:CONFigure:RATE <1..75000000>` / `PG:CONFigure:RATE?` | samples/s | Set/query output sample rate. The derived PIO divider must also fit 1–65,536. Default 2 ksample/s. |
| `PG:CONFigure:MODE <ONCE\|LOOP>` / `PG:CONFigure:MODE?` | mode | Select one-shot or repeating output. Default `ONCE`. |
| `PG:DATA <block>` | none | Upload little-endian packed 32-bit words. Capacity is 16,384 words, but one SCPI message is effectively limited by the 1,024-byte input buffer. |
| `PG:STARt` | none | Start DMA/PIO output; data must have been uploaded. |
| `PG:STOP` | none | Stop output. |
| `PG:STATus?` | four CSV integers | `running,rate,pin_count,pattern_words`. |
| `PG:UNDerrun?` | count | Return the underrun counter. |

## Test signals

| Command | Parameters / response | Meaning |
| --- | --- | --- |
| `TEST:SQUare <bool>` / `TEST:SQUare?` | query returns boolean | Enable/disable/query the default GPIO15, 1 kHz, 50% digital square wave. |
| `TEST:SQUare:CONFigure <gpio>,<frequency_hz>` | none | Start a square wave on GPIO0–29 at a positive frequency. |
| `TEST:SQUare:PIN?` | GPIO | Return configured square-wave pin. |
| `TEST:SQUare:FREQuency?` | Hz | Return achieved square-wave frequency. |
| `TEST:ANALog <bool>` / `TEST:ANALog?` | query returns boolean | Enable/disable/query the default GPIO13, 1 kHz, 50% PWM output. This is not a DAC output. |
| `TEST:ANALog:CONFigure <gpio>,<frequency_hz>,<duty_permille>` | none | Start PWM; duty is 0–1,000, where 500 is 50%. |
| `TEST:ANALog:PIN?` | GPIO | Return configured PWM pin. |
| `TEST:ANALog:FREQuency?` | Hz | Return achieved PWM frequency. |
| `TEST:ANALog:DUTY?` | permille | Return duty in thousandths. |

## Errors and blocking behavior

Missing parameters, out-of-range values, invalid state, and hardware failures are
reported through the standard SCPI queue. During development, a useful pattern
is:

```text
*CLS
LA:CONF:PINC 99
SYST:ERR?
SYST:ERR:COUNT?
```

Commands are processed cooperatively in the main loop, but finite captures are
synchronous. In particular, non-auto LA triggers and finite triggered DSO
captures can prevent all further SCPI processing when the trigger never arrives.
Resetting or power-cycling the board is then required.
