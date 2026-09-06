#ifndef LIBSIGROK_HARDWARE_LIBRELAB_PICO_PROTOCOL_H
#define LIBSIGROK_HARDWARE_LIBRELAB_PICO_PROTOCOL_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define LIBRELAB_PICO_MAX_CHANNELS 8
#define LIBRELAB_PICO_MAX_SAMPLES 65536
#define LIBRELAB_PICO_MAX_CAPTURE_WORDS \
    (LIBRELAB_PICO_MAX_SAMPLES / (32u / LIBRELAB_PICO_MAX_CHANNELS))
#define LIBRELAB_PICO_MAX_BLOCK_BYTES \
    (LIBRELAB_PICO_MAX_CAPTURE_WORDS * sizeof(uint32_t))
#define LIBRELAB_PICO_DEFAULT_SYSCLK_HZ 150000000u
#define LIBRELAB_PICO_DEFAULT_PIN_BASE 16u
#define LIBRELAB_PICO_DEFAULT_PIN_COUNT 2u
#define LIBRELAB_PICO_DEFAULT_SAMPLES 1024u
#define LIBRELAB_PICO_DEFAULT_SAMPLERATE 1000000u
#define LIBRELAB_PICO_IO_TIMEOUT_MS 5000

typedef enum {
    LIBRELAB_PICO_TRIGGER_AUTO = 0,
    LIBRELAB_PICO_TRIGGER_HIGH,
    LIBRELAB_PICO_TRIGGER_LOW,
    LIBRELAB_PICO_TRIGGER_RISING,
    LIBRELAB_PICO_TRIGGER_FALLING,
} LibreLabPicoTrigger;

typedef struct {
    int fd;
    char *conn;
    uint32_t sysclk_hz;
    uint32_t samplerate_hz;
    uint32_t sample_count;
    uint32_t pin_base;
    uint32_t pin_count;
    uint32_t trigger_pin;
    LibreLabPicoTrigger trigger;
} LibreLabPicoDevice;

uint32_t librelab_pico_bits_per_word(uint32_t pin_count);
uint32_t librelab_pico_word_count(uint32_t pin_count, uint32_t sample_count);
bool librelab_pico_unpack_words(
    uint8_t *dst,
    size_t dst_len,
    uint32_t const *src,
    size_t src_words,
    uint32_t pin_count,
    uint32_t sample_count
);

int librelab_pico_open(LibreLabPicoDevice *dev);
void librelab_pico_close(LibreLabPicoDevice *dev);
int librelab_pico_probe(LibreLabPicoDevice *dev, char *idn, size_t idn_len);
int librelab_pico_capture(LibreLabPicoDevice *dev, uint8_t **samples, size_t *len);

#endif
