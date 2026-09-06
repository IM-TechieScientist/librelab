import type {
  AnalogChannelCapture,
  CaptureConfiguration,
  CaptureSession,
  DecoderAnnotation,
  DigitalChannelCapture
} from './contracts'

const DIGITAL_COLORS = ['#5eead4', '#f9a8d4', '#93c5fd', '#fcd34d']

function seededNoise(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function digitalChannels(sampleCount: number, count: number): DigitalChannelCapture[] {
  return Array.from({ length: count }, (_, channelIndex) => {
    const samples = new Uint8Array(sampleCount)

    for (let index = 0; index < sampleCount; index += 1) {
      if (channelIndex === 0) {
        samples[index] = Math.floor(index / 12) % 2
      } else if (channelIndex === 1) {
        const cell = Math.floor(index / 96) % 8
        const bit = Math.floor(index / 12) % 8
        samples[index] = ((0xa5 ^ cell) >> (7 - bit)) & 1
      } else if (channelIndex === 2) {
        const framePosition = index % 384
        if (framePosition < 32) samples[index] = 0
        else if (framePosition < 288) samples[index] = (0x55 >> Math.floor((framePosition - 32) / 32)) & 1
        else samples[index] = 1
      } else {
        const framePosition = index % 768
        samples[index] = framePosition >= 80 && framePosition < 600 ? 0 : 1
      }
    }

    return {
      id: `D${channelIndex}`,
      name: ['Clock', 'Data', 'UART RX', 'Chip select'][channelIndex] ?? `Digital ${channelIndex}`,
      gpio: 16 + channelIndex,
      color: DIGITAL_COLORS[channelIndex] ?? '#c4b5fd',
      samples
    }
  })
}

function analogChannels(sampleCount: number, count: number): AnalogChannelCapture[] {
  const noise = seededNoise(0x1be1ab)
  return Array.from({ length: count }, (_, channelIndex) => {
    const samples = new Float32Array(sampleCount)
    for (let index = 0; index < sampleCount; index += 1) {
      const primary = Math.sin((index / sampleCount) * Math.PI * 18)
      const harmonic = Math.sin((index / sampleCount) * Math.PI * 54) * 0.14
      samples[index] = 1.65 + primary * 1.1 + harmonic + (noise() - 0.5) * 0.035
    }
    return {
      id: `A${channelIndex}`,
      name: channelIndex === 0 ? 'Analog input' : `Analog ${channelIndex}`,
      gpio: 26 + channelIndex,
      color: '#a78bfa',
      unit: 'V',
      samples
    }
  })
}

function decoderAnnotations(sampleCount: number): DecoderAnnotation[] {
  const annotations: DecoderAnnotation[] = []
  const labels = [
    ['START', 'S'],
    ['ADDR 0x3C W', '3C W'],
    ['ACK', 'A'],
    ['DATA 0xA5', 'A5'],
    ['ACK', 'A'],
    ['STOP', 'P']
  ]
  const width = Math.max(32, Math.floor(sampleCount / 12))
  const origin = Math.floor(sampleCount * 0.08)

  labels.forEach(([text, shortText], index) => {
    const startSample = origin + index * width
    if (startSample >= sampleCount) return
    annotations.push({
      id: `i2c-${index}`,
      decoder: 'I²C',
      channelId: 'D1',
      startSample,
      endSample: Math.min(sampleCount - 1, startSample + width - 4),
      kind: text.startsWith('DATA') ? 'data' : 'control',
      text,
      shortText,
      color: text === 'ACK' ? '#a78bfa' : '#38bdf8'
    })
  })
  return annotations
}

export function createMockCapture(
  configuration: CaptureConfiguration,
  sequence = 1,
  source: CaptureSession['source'] = 'simulation'
): CaptureSession {
  const sampleCount = Math.max(256, Math.min(configuration.sampleCount, 65536))
  const digitalCount = configuration.mode === 'scope' ? 0 : configuration.digitalChannelCount
  const analogCount = configuration.mode === 'logic' ? 0 : configuration.analogChannelCount

  return {
    id: `capture-${sequence}`,
    name: source === 'demo' ? 'Welcome capture' : `Capture ${sequence}`,
    createdAt: new Date(1700000000000 + sequence * 1000).toISOString(),
    source,
    mode: configuration.mode,
    sampleRate: configuration.sampleRate,
    sampleCount,
    digitalChannels: digitalChannels(sampleCount, digitalCount),
    analogChannels: analogChannels(sampleCount, analogCount),
    annotations: digitalCount >= 2 ? decoderAnnotations(sampleCount) : []
  }
}

export const DEFAULT_CAPTURE_CONFIGURATION: CaptureConfiguration = {
  mode: 'mixed',
  sampleRate: 1_000_000,
  sampleCount: 4096,
  digitalChannelCount: 4,
  analogChannelCount: 1,
  trigger: 'auto'
}
