import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaptureConfiguration, CaptureProgress, DeviceDescriptor, LibreLabApi } from '../../shared/contracts'
import { createMockCapture } from '../../shared/mockCapture'
import { App } from './App'

function installSimulatorApi(): void {
  let connected = false
  let sequence = 0
  const listeners = new Set<(progress: CaptureProgress) => void>()

  const descriptor = (): DeviceDescriptor => ({
    id: 'test-simulator',
    model: 'LibreLab Simulator',
    serialNumber: 'TEST-0001',
    transport: 'simulation',
    address: 'Vitest simulator',
    connected,
    firmwareVersion: 'sim-test'
  })

  const api: LibreLabApi = {
    listDevices: vi.fn(async () => [descriptor()]),
    connect: vi.fn(async () => {
      connected = true
      return descriptor()
    }),
    disconnect: vi.fn(async () => {
      connected = false
    }),
    capture: vi.fn(async (_deviceId: string, configuration: CaptureConfiguration) => {
      listeners.forEach((listener) => listener({ phase: 'capturing', value: 0.5, message: 'Sampling simulated inputs' }))
      sequence += 1
      return createMockCapture(configuration, sequence)
    }),
    onCaptureProgress: vi.fn((callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    })
  }

  Object.defineProperty(window, 'librelab', {
    configurable: true,
    value: api
  })
}

describe('LibreLab Studio app', () => {
  beforeEach(() => {
    installSimulatorApi()
  })

  it('connects to the simulator, captures data, and exposes core panels without hardware', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getAllByText('Welcome capture')).not.toHaveLength(0)
    await screen.findByText('LibreLab Simulator')
    expect(document.querySelector('.capture-button')).toBeDisabled()

    await user.click(screen.getByText('LibreLab Simulator'))
    await screen.findByText('Ready')
    expect(document.querySelector('.capture-button')).toBeEnabled()

    await user.click(document.querySelector('.capture-button') as HTMLButtonElement)
    await waitFor(() => expect(screen.getAllByText('Capture 1')).not.toHaveLength(0))
    expect(screen.getByTestId('waveform-canvas')).toHaveAccessibleName(/mixed waveform with 4 digital and 1 analog channels/i)

    await user.click(screen.getByRole('button', { name: 'Analyzers' }))
    expect(screen.getByText('Protocol analyzers')).toBeInTheDocument()
    expect(screen.getByText('Decoded frames')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show I2C decoder' }))
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Measurements' }))
    expect(screen.getByText('Measurements')).toBeInTheDocument()
    expect(screen.getByText('Edges')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Scope' }))
    expect(screen.getByTestId('waveform-canvas')).toHaveAccessibleName(/scope waveform with 0 digital and 1 analog channels/i)
  })

  it('creates a new offline workspace from the current capture settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'New session' }))
    expect(screen.getAllByText('Workspace 2')).not.toHaveLength(0)
  })
})
