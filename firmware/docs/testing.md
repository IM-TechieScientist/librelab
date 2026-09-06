# Testing and verification

The repository has three validation surfaces: the current RP2350A cross-build,
the ESP-IDF build, and a standalone host test for sigrok packing.

## RP2350 build check

From the firmware root:

```bash
cmake -S . -B build-pico2 -G Ninja \
  -DPICO_BOARD=pico2 \
  -DPICO_SDK_PATH=/path/to/pico-sdk
cmake --build build-pico2 --target librelab_pico
```

A successful build must produce `build-pico2/librelab_pico.elf` and
`build-pico2/librelab_pico.uf2`. Treat compiler warnings as defects when making
new changes even though the root target does not globally enable `-Werror`.

## ESP bridge build check

From an ESP-IDF 5.1.x shell:

```bash
cd esp_firmware
idf.py set-target esp32c3
idf.py build
```

When editing bridge protocol structures, build both MCUs: constants and frame
layouts are duplicated on the Pico and ESP sides.

## Standalone sigrok packing test

This host-native test is runnable without hardware:

```bash
make -C tools/sigrok/librelab-pico test
make -C tools/sigrok/librelab-pico clean
```

It compiles `test_unpack.c` and validates the conversion from packed capture
words to one logic byte per sample. It does not test serial I/O or the complete
libsigrok integration.

## Python syntax checks

The bridge diagnostic utility can be syntax-checked without opening a socket:

```bash
python3 -c 'compile(open("esp_firmware/bridge_receiver.py", "rb").read(), \
  "esp_firmware/bridge_receiver.py", "exec")'
```

## Hardware smoke test

After flashing a new build, verify at least the following:

1. USB enumerates as a CDC device and `*IDN?` returns the documented identity.
2. `*CLS` followed by `SYST:ERR:COUN?` returns zero.
3. Enable `TEST:SQU ON`, wire GPIO15 to an LA input, and confirm frequency and
   duty cycle with `LA:READ?` in `AUTO` mode.
4. Loop GPIO15 to ADC0 through a safe 3.3 V-compatible connection and confirm a
   DSO capture changes with the signal. Never exceed the ADC input range.
5. Exercise only the bus gateway whose pins are free; verify open, transfer,
   error reporting, and close.
6. If using the ESP, provision Wi-Fi, select `COMM:TRAN AUTO`, query over TCP,
   register a UDP receiver, and verify capture sequences/chunks without loss.
7. Run LA and DSO streams separately and verify that starting one stops the
   other.

For triggered tests, first prove the trigger source is present. LA and finite
DSO trigger waits can block the command loop indefinitely.

## Documentation consistency checks

When command registration changes, update
`docs/scpi-reference.md`, the relevant feature page, and any data-format page in
the same change. A useful manual audit is:

```bash
sed -n '/g_SCPI_COMMANDS\[\]/,/SCPI_CMD_LIST_END/p' \
  src/application/protocol/common.c
```

Also check Markdown links before release:

```bash
rg -n '\]\([^)]*\.md' README.md docs
```
