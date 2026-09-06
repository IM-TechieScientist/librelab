import { useState } from 'react'
import type { CaptureConfiguration, CaptureSession } from '../../../shared/contracts'
import { formatDuration, formatFrequency } from '../lib/format'
import { Icons } from './Icons'

export type PanelId = 'capture' | 'analyzers' | 'measurements' | 'outputs' | 'buses'

interface Props {
  active: PanelId
  configuration: CaptureConfiguration
  session: CaptureSession
  decoderVisible: boolean
  onSelect: (panel: PanelId) => void
  onConfiguration: (configuration: CaptureConfiguration) => void
  onDecoderVisible: (visible: boolean) => void
}

const panels: Array<{ id: PanelId; label: string; icon: () => React.JSX.Element }> = [
  { id: 'capture', label: 'Capture', icon: Icons.sliders },
  { id: 'analyzers', label: 'Analyzers', icon: Icons.decode },
  { id: 'measurements', label: 'Measurements', icon: Icons.measure },
  { id: 'outputs', label: 'Outputs', icon: Icons.output },
  { id: 'buses', label: 'Buses', icon: Icons.bus }
]

export function SidePanel(props: Props): React.JSX.Element {
  return (
    <aside className="inspector">
      <nav className="panel-tabs" aria-label="Instrument panels">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className={props.active === panel.id ? 'active' : ''}
            aria-label={panel.label}
            title={panel.label}
            onClick={() => props.onSelect(panel.id)}
          >
            <panel.icon />
          </button>
        ))}
      </nav>
      <div className="panel-content">
        {props.active === 'capture' && <CapturePanel {...props} />}
        {props.active === 'analyzers' && <AnalyzerPanel {...props} />}
        {props.active === 'measurements' && <MeasurementPanel session={props.session} />}
        {props.active === 'outputs' && <OutputsPanel />}
        {props.active === 'buses' && <BusesPanel />}
      </div>
    </aside>
  )
}

function CapturePanel({ configuration, onConfiguration }: Props): React.JSX.Element {
  const update = <K extends keyof CaptureConfiguration>(key: K, value: CaptureConfiguration[K]): void =>
    onConfiguration({ ...configuration, [key]: value })

  return (
    <section>
      <PanelHeading eyebrow="Acquisition" title="Capture settings" />
      <Field label="Sample rate">
        <select
          aria-label="Sample rate"
          value={configuration.sampleRate}
          onChange={(event) => update('sampleRate', Number(event.target.value))}
        >
          {[100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map((rate) => (
            <option key={rate} value={rate}>{formatFrequency(rate)}</option>
          ))}
        </select>
      </Field>
      <Field label="Samples">
        <select
          aria-label="Sample count"
          value={configuration.sampleCount}
          onChange={(event) => update('sampleCount', Number(event.target.value))}
        >
          {[1024, 2048, 4096, 8192, 16384, 65536].map((count) => (
            <option key={count} value={count}>{count.toLocaleString()}</option>
          ))}
        </select>
      </Field>
      <Field label="Trigger">
        <select
          aria-label="Trigger mode"
          value={configuration.trigger}
          onChange={(event) => update('trigger', event.target.value as CaptureConfiguration['trigger'])}
        >
          <option value="auto">Automatic</option>
          <option value="rising">Rising edge</option>
          <option value="falling">Falling edge</option>
          <option value="high">High level</option>
          <option value="low">Low level</option>
        </select>
      </Field>
      {configuration.mode !== 'scope' && (
        <Field label="Digital channels">
          <input
            aria-label="Digital channel count"
            type="range"
            min="1"
            max="8"
            value={configuration.digitalChannelCount}
            onChange={(event) => update('digitalChannelCount', Number(event.target.value))}
          />
          <output>{configuration.digitalChannelCount}</output>
        </Field>
      )}
      <div className="info-card">
        <span>Capture duration</span>
        <strong>{formatDuration(configuration.sampleCount / configuration.sampleRate)}</strong>
      </div>
    </section>
  )
}

function AnalyzerPanel({ decoderVisible, onDecoderVisible, session }: Props): React.JSX.Element {
  return (
    <section>
      <PanelHeading eyebrow="Decode" title="Protocol analyzers" action="Add" />
      <label className="analyzer-card">
        <span className="protocol-dot" style={{ background: '#38bdf8' }} />
        <span><strong>I²C</strong><small>D0 clock · D1 data</small></span>
        <input
          aria-label="Show I2C decoder"
          type="checkbox"
          checked={decoderVisible}
          onChange={(event) => onDecoderVisible(event.target.checked)}
        />
      </label>
      <button type="button" className="add-analyzer"><Icons.plus /> Add analyzer</button>
      <div className="decode-summary">
        <span>Decoded frames</span>
        <strong>{decoderVisible ? session.annotations.length : 0}</strong>
      </div>
      <p className="panel-note">The simulator supplies deterministic I²C annotations. The native decoder worker will replace this source while keeping the same UI model.</p>
    </section>
  )
}

function MeasurementPanel({ session }: { session: CaptureSession }): React.JSX.Element {
  const digital = session.digitalChannels[0]
  let edges = 0
  if (digital) {
    for (let index = 1; index < digital.samples.length; index += 1) {
      if (digital.samples[index] !== digital.samples[index - 1]) edges += 1
    }
  }
  const duration = session.sampleCount / session.sampleRate
  const frequency = duration > 0 ? edges / 2 / duration : 0

  return (
    <section>
      <PanelHeading eyebrow="Inspect" title="Measurements" action="Add" />
      <div className="metric-grid">
        <Metric label="Frequency" value={formatFrequency(frequency)} />
        <Metric label="Edges" value={edges.toLocaleString()} />
        <Metric label="Duration" value={formatDuration(duration)} />
        <Metric label="Samples" value={session.sampleCount.toLocaleString()} />
      </div>
      <p className="panel-note">Click the timeline to place markers A and B. A third click starts a new marker pair.</p>
    </section>
  )
}

function OutputsPanel(): React.JSX.Element {
  const [square, setSquare] = useState(false)
  const [pwm, setPwm] = useState(false)
  return (
    <section>
      <PanelHeading eyebrow="Generate" title="Outputs" />
      <OutputCard title="Pattern generator" description="D0–D3 · 10 ksample/s" />
      <ToggleCard title="Square wave" description="GPIO15 · 1 kHz" active={square} onChange={setSquare} />
      <ToggleCard title="PWM output" description="GPIO13 · 1 kHz · 50%" active={pwm} onChange={setPwm} />
      <p className="panel-note">Output controls are simulated in this milestone and will be routed through the native device engine.</p>
    </section>
  )
}

function BusesPanel(): React.JSX.Element {
  const [bus, setBus] = useState<'UART' | 'I²C' | 'SPI'>('UART')
  const [lines, setLines] = useState(['LibreLab simulated UART ready.'])
  const [message, setMessage] = useState('hello')
  return (
    <section>
      <PanelHeading eyebrow="Gateway" title="Bus console" />
      <div className="segmented compact">
        {(['UART', 'I²C', 'SPI'] as const).map((item) => (
          <button key={item} type="button" className={bus === item ? 'active' : ''} onClick={() => setBus(item)}>{item}</button>
        ))}
      </div>
      <div className="terminal" aria-label={`${bus} simulated terminal`}>
        {lines.map((line, index) => <div key={`${line}-${index}`}><span>›</span> {line}</div>)}
      </div>
      <form
        className="terminal-input"
        onSubmit={(event) => {
          event.preventDefault()
          if (!message.trim()) return
          setLines((current) => [...current, `${bus}: ${message}`, `RX: ${message}`])
          setMessage('')
        }}
      >
        <input aria-label="Bus message" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button type="submit">Send</button>
      </form>
    </section>
  )
}

function PanelHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }): React.JSX.Element {
  return <header className="panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action && <button type="button">{action}</button>}</header>
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return <label className="field"><span>{label}</span><div>{children}</div></label>
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function OutputCard({ title, description }: { title: string; description: string }): React.JSX.Element {
  return <button type="button" className="output-card"><span><strong>{title}</strong><small>{description}</small></span><span className="edit-label">Edit</span></button>
}

function ToggleCard({ title, description, active, onChange }: { title: string; description: string; active: boolean; onChange: (value: boolean) => void }): React.JSX.Element {
  return <label className="output-card"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={active} onChange={(event) => onChange(event.target.checked)} /></label>
}
