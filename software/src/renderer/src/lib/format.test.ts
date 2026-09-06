import { describe, expect, it } from 'vitest'
import { formatDuration, formatFrequency } from './format'

describe('format helpers', () => {
  it('formats timing across oscilloscope-style units', () => {
    expect(formatDuration(0.0000005)).toBe('500 ns')
    expect(formatDuration(0.0005)).toBe('500 µs')
    expect(formatDuration(0.25)).toBe('250 ms')
    expect(formatDuration(2)).toBe('2 s')
  })

  it('formats frequency across capture controls and measurements', () => {
    expect(formatFrequency(250)).toBe('250 Hz')
    expect(formatFrequency(100_000)).toBe('100 kHz')
    expect(formatFrequency(5_000_000)).toBe('5 MHz')
  })
})
