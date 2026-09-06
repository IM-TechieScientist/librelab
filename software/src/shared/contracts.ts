export type InstrumentMode = 'logic' | 'scope' | 'mixed'
export type DeviceTransport = 'simulation' | 'usb' | 'network'

export interface DeviceDescriptor {
  id: string
  model: string
  serialNumber: string
  transport: DeviceTransport
  address: string
  connected: boolean
  firmwareVersion: string
}

export interface CaptureConfiguration {
  mode: InstrumentMode
  sampleRate: number
  sampleCount: number
  digitalChannelCount: number
  analogChannelCount: number
  trigger: 'auto' | 'rising' | 'falling' | 'high' | 'low'
}

export interface DigitalChannelCapture {
  id: string
  name: string
  gpio: number
  color: string
  samples: Uint8Array
}

export interface AnalogChannelCapture {
  id: string
  name: string
  gpio: number
  color: string
  unit: string
  samples: Float32Array
}

export interface DecoderAnnotation {
  id: string
  decoder: string
  channelId: string
  startSample: number
  endSample: number
  kind: string
  text: string
  shortText: string
  color: string
}

export interface CaptureSession {
  id: string
  name: string
  createdAt: string
  source: 'demo' | 'simulation' | 'hardware'
  mode: InstrumentMode
  sampleRate: number
  sampleCount: number
  digitalChannels: DigitalChannelCapture[]
  analogChannels: AnalogChannelCapture[]
  annotations: DecoderAnnotation[]
}

export interface CaptureProgress {
  phase: 'configuring' | 'capturing' | 'receiving' | 'complete'
  value: number
  message: string
}

export interface LibreLabApi {
  listDevices(): Promise<DeviceDescriptor[]>
  connect(deviceId: string): Promise<DeviceDescriptor>
  disconnect(deviceId: string): Promise<void>
  capture(
    deviceId: string,
    configuration: CaptureConfiguration
  ): Promise<CaptureSession>
  onCaptureProgress(callback: (progress: CaptureProgress) => void): () => void
}

export const ipcChannels = {
  listDevices: 'device:list',
  connect: 'device:connect',
  disconnect: 'device:disconnect',
  capture: 'capture:start',
  captureProgress: 'capture:progress'
} as const
