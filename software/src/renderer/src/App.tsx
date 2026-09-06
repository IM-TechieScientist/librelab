import { useEffect, useMemo, useState } from 'react'
import type {
  CaptureConfiguration,
  CaptureProgress,
  CaptureSession,
  DeviceDescriptor,
  InstrumentMode
} from '../../shared/contracts'
import { createMockCapture, DEFAULT_CAPTURE_CONFIGURATION } from '../../shared/mockCapture'
import { Icons } from './components/Icons'
import { SidePanel, type PanelId } from './components/SidePanel'
import { WaveformViewport } from './components/WaveformViewport'
import { getLibreLabApi } from './lib/api'

export function App(): React.JSX.Element {
  const api = useMemo(() => getLibreLabApi(), [])
  const [devices, setDevices] = useState<DeviceDescriptor[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [configuration, setConfiguration] = useState<CaptureConfiguration>(DEFAULT_CAPTURE_CONFIGURATION)
  const [sessions, setSessions] = useState<CaptureSession[]>([
    createMockCapture(DEFAULT_CAPTURE_CONFIGURATION, 0, 'demo')
  ])
  const [activeSessionId, setActiveSessionId] = useState('capture-0')
  const [activePanel, setActivePanel] = useState<PanelId>('capture')
  const [decoderVisible, setDecoderVisible] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [progress, setProgress] = useState<CaptureProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.listDevices().then((found) => {
      setDevices(found)
      setSelectedDeviceId((current) => current || found[0]?.id || '')
    }).catch((reason: unknown) => setError(errorMessage(reason)))
    return api.onCaptureProgress(setProgress)
  }, [])

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId)
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0]

  const visibleSession = useMemo<CaptureSession>(() => {
    if (configuration.mode === activeSession.mode) return activeSession
    return {
      ...activeSession,
      mode: configuration.mode,
      digitalChannels: configuration.mode === 'scope' ? [] : activeSession.digitalChannels,
      analogChannels: configuration.mode === 'logic' ? [] : activeSession.analogChannels
    }
  }, [activeSession, configuration.mode])

  const connect = async (): Promise<void> => {
    if (!selectedDevice) return
    setError(null)
    try {
      if (selectedDevice.connected) {
        await api.disconnect(selectedDevice.id)
        setDevices((current) => current.map((device) => device.id === selectedDevice.id ? { ...device, connected: false } : device))
      } else {
        const connected = await api.connect(selectedDevice.id)
        setDevices((current) => current.map((device) => device.id === connected.id ? connected : device))
      }
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  const capture = async (): Promise<void> => {
    if (!selectedDevice?.connected || capturing) return
    setCapturing(true)
    setError(null)
    try {
      const session = await api.capture(selectedDevice.id, configuration)
      setSessions((current) => [...current, session])
      setActiveSessionId(session.id)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setCapturing(false)
      window.setTimeout(() => setProgress(null), 800)
    }
  }

  const setMode = (mode: InstrumentMode): void => setConfiguration((current) => ({ ...current, mode }))

  const createSession = (): void => {
    const sequence = sessions.length + 1
    const sessionId = `demo-${Date.now()}`
    const session = createMockCapture(configuration, sequence, 'demo')
    setSessions((current) => [...current, { ...session, id: sessionId, name: `Workspace ${sequence}` }])
    setActiveSessionId(sessionId)
  }

  const closeSession = (sessionId: string): void => {
    const remaining = sessions.filter((item) => item.id !== sessionId)
    if (remaining.length === 0) return
    setSessions(remaining)
    if (activeSessionId === sessionId) setActiveSessionId(remaining.at(-1)!.id)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="LibreLab Studio">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>LibreLab</strong><small>Studio</small></div>
        </div>

        <button type="button" className="device-picker" onClick={() => void connect()}>
          <Icons.device />
            <span>
              <strong>{selectedDevice?.model ?? 'Searching for devices'}</strong>
              <small>{selectedDevice?.connected ? `${selectedDevice.transport} · connected` : 'Click to connect simulator'}</small>
            </span>
          <i className={selectedDevice?.connected ? 'online' : ''} />
        </button>

        <div className="segmented mode-picker" aria-label="Instrument mode">
          {(['logic', 'scope', 'mixed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={configuration.mode === mode ? 'active' : ''}
              onClick={() => setMode(mode)}
            >
              {mode === 'mixed' ? 'MSO' : mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`capture-button ${capturing ? 'capturing' : ''}`}
          disabled={!selectedDevice?.connected}
          onClick={() => void capture()}
        >
          {capturing ? <Icons.stop /> : <Icons.play />}
          <span>{capturing ? 'Capturing' : 'Capture'}</span>
        </button>
      </header>

      {(progress || error) && (
        <div className={`status-banner ${error ? 'error' : ''}`} role="status">
          <span>{error ?? progress?.message}</span>
          {progress && !error && <div><i style={{ width: `${progress.value * 100}%` }} /></div>}
          {error && <button type="button" onClick={() => setError(null)}>Dismiss</button>}
        </div>
      )}

      <div className="workspace">
        <section className="timeline-area">
          <div className="session-summary">
            <div><span className="source-badge">{activeSession.source}</span><strong>{activeSession.name}</strong></div>
            <div>
              <span>{activeSession.sampleRate.toLocaleString()} sample/s</span>
              <span>{activeSession.sampleCount.toLocaleString()} samples</span>
            </div>
          </div>
          <WaveformViewport session={visibleSession} decoderVisible={decoderVisible} />
        </section>

        <SidePanel
          active={activePanel}
          configuration={configuration}
          session={visibleSession}
          decoderVisible={decoderVisible}
          onSelect={setActivePanel}
          onConfiguration={setConfiguration}
          onDecoderVisible={setDecoderVisible}
        />
      </div>

      <footer className="session-bar" aria-label="Capture sessions">
        <div className="session-tabs">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={session.id === activeSessionId ? 'active' : ''}
              onClick={() => setActiveSessionId(session.id)}
            >
              <span>{session.name}</span>
              {sessions.length > 1 && (
                <span
                  className="session-close"
                  aria-label={`Close ${session.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeSession(session.id)
                  }}
                ><Icons.close /></span>
              )}
            </button>
          ))}
          <button type="button" className="new-session" aria-label="New session" onClick={createSession}><Icons.plus /></button>
        </div>
        <div className="footer-status"><span className={selectedDevice?.connected ? 'online-dot' : ''} />{selectedDevice?.connected ? 'Ready' : 'Offline demo'}</div>
      </footer>
    </main>
  )
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
