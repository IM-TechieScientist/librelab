/**
 * @file system.h
 * @brief Hardware system initialization interface for LibreLab Pico firmware.
 *
 * This module declares the SYSTEM_init() function, which must be called
 * immediately after reset to initialize all core hardware peripherals before
 * any other hardware access.
 */

#ifndef SYSTEM_H
#define SYSTEM_H

#include <stdint.h>

/**
 * @brief Initialize all core hardware peripherals.
 *
 * This function must be called immediately after reset, before any other
 * hardware access is performed. It initializes the platform, LED, UART, and USB
 * subsystems.
 */
void SYSTEM_init(void);

/**
 * @brief Get the current system tick count
 *
 * @return The current tick count.
 */
uint32_t SYSTEM_get_tick(void);

/**
 * @brief Reset system
 *
 * This function resets the system after flushing any pending log messages.
 */
__attribute__((noreturn)) void SYSTEM_reset(void);

#endif // SYSTEM_H
