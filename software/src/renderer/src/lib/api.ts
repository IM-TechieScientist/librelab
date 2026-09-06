import type {
  CaptureConfiguration,
  CaptureProgress,
  DeviceDescriptor,
  LibreLabApi
} from '../../../shared/contracts'
import { createMockCapture } from '../../../shared/mockCapture'

let localConnected = false
let localSequence = 0
const progressListeners = new Set<(progress: CaptureProgress) => void>()

function descriptor(): DeviceDescriptor {
  return {
    id: 'librelab-browser-simulator',
    model: 'LibreLab Simulator',
    serialNumber: 'WEB-0001',
    transport: 'simulation',
    address: 'Browser test simulator',
    connected: localConnected,
    firmwareVersion: 'sim-0.1.0'
  }
}

const browserApi: LibreLabApi = {
  listDevices: async () => [descriptor()],
  connect: async () => {
    localConnected = true
    return descriptor()
  },
  disconnect: async () => {
    localConnected = false
  },
  capture: async (_deviceId: string, configuration: CaptureConfiguration) => {
    progressListeners.forEach((listener) =>
      listener({ phase: 'capturing', value: 0.5, message: 'Generating test capture' })
    )
    localSequence += 1
    const capture = createMockCapture(configuration, localSequence)
    progressListeners.forEach((listener) =>
      listener({ phase: 'complete', value: 1, message: 'Capture complete' })
    )
    return capture
  },
  onCaptureProgress: (callback) => {
    progressListeners.add(callback)
    return () => progressListeners.delete(callback)
  }
}

export function getLibreLabApi(): LibreLabApi {
  return window.librelab ?? browserApi
}
