import { describe, expect, it } from 'vitest'
import { createMockCapture, DEFAULT_CAPTURE_CONFIGURATION } from './mockCapture'

describe('mock capture generator', () => {
  it('creates deterministic mixed captures with digital, analog, and decoder data', () => {
    const first = createMockCapture(DEFAULT_CAPTURE_CONFIGURATION, 7)
    const second = createMockCapture(DEFAULT_CAPTURE_CONFIGURATION, 7)

    expect(first.id).toBe('capture-7')
    expect(first.digitalChannels).toHaveLength(4)
    expect(first.analogChannels).toHaveLength(1)
    expect(first.annotations.map((annotation) => annotation.text)).toEqual([
      'START',
      'ADDR 0x3C W',
      'ACK',
      'DATA 0xA5',
      'ACK',
      'STOP'
    ])
    expect(Array.from(first.digitalChannels[1].samples.slice(0, 64))).toEqual(
      Array.from(second.digitalChannels[1].samples.slice(0, 64))
    )
    expect(Array.from(first.analogChannels[0].samples.slice(0, 8))).toEqual(
      Array.from(second.analogChannels[0].samples.slice(0, 8))
    )
  })

  it('honors instrument modes and clamps sample counts', () => {
    const scope = createMockCapture({
      ...DEFAULT_CAPTURE_CONFIGURATION,
      mode: 'scope',
      sampleCount: 100
    })
    const logic = createMockCapture({
      ...DEFAULT_CAPTURE_CONFIGURATION,
      mode: 'logic',
      sampleCount: 100_000
    })

    expect(scope.sampleCount).toBe(256)
    expect(scope.digitalChannels).toHaveLength(0)
    expect(scope.analogChannels).toHaveLength(1)
    expect(logic.sampleCount).toBe(65_536)
    expect(logic.digitalChannels).toHaveLength(4)
    expect(logic.analogChannels).toHaveLength(0)
  })
})
