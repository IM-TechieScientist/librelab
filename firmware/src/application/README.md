# Application layer

This directory owns the RP2350 firmware's SCPI-facing application layer:

- `main.c` initializes the system and protocol, then runs the cooperative loop.
- `protocol/common.c` owns the parser context, complete command table, USB/Wi-Fi
  response routing, stream dispatch, and SCPI reset callback.
- `protocol/{la,dso,mso,pg}.c` and `protocol/bus/` parse parameters and format
  results.
- `*_commands.c` files retain feature configuration and adapt commands to the
  system layer.
- `gateway/` adapts the UART, I2C, and SPI SCPI gateways.

The SCPI input buffer is 1,024 bytes and the error queue contains 16 entries.
The current identification response is:

```text
FOSSASIA,LibreLab Pico,1.0,v0.1.0
```

See the authoritative [architecture](../../docs/architecture.md), complete
[SCPI reference](../../docs/scpi-reference.md), and
[development guide](../../docs/development.md).
