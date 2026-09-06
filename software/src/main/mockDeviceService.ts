import type {
  CaptureConfiguration,
  CaptureProgress,
  CaptureSession,
  DeviceDescriptor
} from '../shared/contracts'
import { createMockCapture } from '../shared/mockCapture'

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export class MockDeviceService {
  private connected = false
  private sequence = 0

  private descriptor(): DeviceDescriptor {
    return {
      id: 'librelab-simulator-001',
      model: 'LibreLab Simulator',
      serialNumber: 'SIM-0001',
      transport: 'simulation',
      address: 'Built-in deterministic simulator',
      connected: this.connected,
      firmwareVersion: 'sim-0.1.0'
    }
  }

  listDevices(): DeviceDescriptor[] {
    return [this.descriptor()]
  }

  async connect(deviceId: string): Promise<DeviceDescriptor> {
    this.requireDevice(deviceId)
    await wait(120)
    this.connected = true
    return this.descriptor()
  }

  async disconnect(deviceId: string): Promise<void> {
    this.requireDevice(deviceId)
    this.connected = false
  }

  async capture(
    deviceId: string,
    configuration: CaptureConfiguration,
    report: (progress: CaptureProgress) => void
  ): Promise<CaptureSession> {
    this.requireDevice(deviceId)
    if (!this.connected) throw new Error('Connect the simulator before capturing.')

    report({ phase: 'configuring', value: 0.12, message: 'Applying capture settings' })
    await wait(100)
    report({ phase: 'capturing', value: 0.45, message: 'Sampling simulated inputs' })
    await wait(180)
    report({ phase: 'receiving', value: 0.82, message: 'Receiving capture data' })
    await wait(100)

    this.sequence += 1
    const capture = createMockCapture(configuration, this.sequence)
    report({ phase: 'complete', value: 1, message: 'Capture complete' })
    return capture
  }

  private requireDevice(deviceId: string): void {
    if (deviceId !== this.descriptor().id) throw new Error(`Unknown device: ${deviceId}`)
  }
}
