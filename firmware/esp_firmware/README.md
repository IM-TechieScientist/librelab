# LibreLab ESP32-C3 bridge firmware

This ESP-IDF project is the optional network companion for LibreLab Pico. It is
an SPI slave to the RP2350 and provides SoftAP provisioning, station-mode Wi-Fi,
TCP SCPI on port 5006, UDP captures on port 5005, UDP receiver registration,
and mDNS as `librelab-pico.local` / `_librelab._tcp`.

Build and flash from an ESP-IDF 5.1.x shell:

```bash
idf.py set-target esp32c3
idf.py menuconfig
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

Default ESP pins are GPIO4 SCLK, GPIO5 MOSI, GPIO6 MISO, GPIO7 CS, and GPIO10
READY. Default provisioning uses AP `LibreLab-Pico-XXXX`, password
`librelab-pico`, and setup page `http://192.168.4.1`.

Read the complete [Wi-Fi bridge guide](../docs/features/wifi-bridge.md),
[wire protocol](../docs/data-formats.md), and
[troubleshooting guide](../docs/troubleshooting.md). `bridge_receiver.py` is a
synthetic-pattern link diagnostic, not a decoder for current capture payloads.
