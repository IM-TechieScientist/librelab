# Built-in test signals

Two PWM-backed outputs provide convenient signals for capture and wiring tests.
Despite the command name, `TEST:ANALog` is not a DAC: it is a digital PWM output
whose average voltage depends on duty cycle and any external filtering.

## Square output

Defaults are GPIO15, 1 kHz, approximately 50% duty.

- `TEST:SQUare <bool>` enables defaults or disables the output.
- `TEST:SQUare?` reports enabled state.
- `TEST:SQUare:CONFigure <gpio>,<frequency_hz>` configures and immediately starts.
- `TEST:SQUare:PIN?` and `TEST:SQUare:FREQuency?` report active settings.

## PWM “analog” output

Defaults are GPIO13, 1 kHz, 500 permille (50% duty).

- `TEST:ANALog <bool>` enables defaults or disables the output.
- `TEST:ANALog?` reports enabled state.
- `TEST:ANALog:CONFigure <gpio>,<frequency_hz>,<duty_permille>` configures and starts.
- `TEST:ANALog:PIN?`, `FREQuency?`, and `DUTY?` report settings.

The current RP2350A build limits GPIO to 0–29. Frequency must be nonzero and
achievable with an RP2350 PWM divider in `[1,255]`, and duty is 0–1000
permille.

RP2350B adds GPIO30–47 and PWM slices 8–11, but the firmware range checks must
be made package-aware before those pins can be selected. Distinct GPIOs can
still conflict when they are outputs of the same PWM slice.

The two outputs cannot use GPIOs belonging to the same PWM slice at the same
time. Configuration fails if the requested output conflicts with the other
active test signal’s PWM slice.

## Loopback examples

Square output into the LA:

```text
TEST:SQU:CONF 15,1000
LA:CONF:PINB 14
LA:CONF:PINC 2
LA:CONF:SAMP 1024
LA:CONF:TRIG:PIN 15
LA:CONF:TRIG:MODE EDGE
LA:READ?
TEST:SQU 0
```

Physically jumper GPIO15 to one selected LA input if the capture group does not
already include it.

PWM output into DSO:

```text
TEST:ANAL:CONF 13,1000,250
DSO:CONF:CHAN 0
DSO:CONF:TRIG:MODE OFF
DSO:READ?
TEST:ANAL 0
```

Physically connect GPIO13 to GPIO26 through appropriate protection. GPIO13 is
also the generic SPI gateway chip-select, so do not use both defaults together.
