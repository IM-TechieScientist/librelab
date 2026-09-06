import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react'
import type { CaptureSession } from '../../../shared/contracts'
import { formatDuration } from '../lib/format'

interface Props {
  session: CaptureSession
  decoderVisible: boolean
}

interface ViewRange {
  start: number
  end: number
}

const DIGITAL_HEIGHT = 70
const ANALOG_HEIGHT = 120
const ANNOTATION_HEIGHT = 46
const AXIS_HEIGHT = 34

export function WaveformViewport({ session, decoderVisible }: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 900, height: 500 })
  const [view, setView] = useState<ViewRange>({ start: 0, end: session.sampleCount })
  const [dragOrigin, setDragOrigin] = useState<{ x: number; view: ViewRange } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [markers, setMarkers] = useState<number[]>([])

  useEffect(() => setView({ start: 0, end: session.sampleCount }), [session.id, session.sampleCount])

  useEffect(() => {
    if (!wrapRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(240, Math.floor(entry.contentRect.height))
      })
    })
    observer.observe(wrapRef.current)
    return () => observer.disconnect()
  }, [])

  const tracks = useMemo(
    () => [
      ...session.digitalChannels.map((channel) => ({ ...channel, type: 'digital' as const })),
      ...session.analogChannels.map((channel) => ({ ...channel, type: 'analog' as const }))
    ],
    [session]
  )

  const contentHeight =
    AXIS_HEIGHT +
    session.digitalChannels.length * DIGITAL_HEIGHT +
    session.analogChannels.length * ANALOG_HEIGHT +
    (decoderVisible && session.annotations.length ? ANNOTATION_HEIGHT : 0)

  const sampleAt = useCallback(
    (clientX: number): number => {
      const bounds = canvasRef.current?.getBoundingClientRect()
      if (!bounds) return view.start
      const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width))
      return Math.round(view.start + ratio * (view.end - view.start))
    },
    [view]
  )

  const onWheel = (event: WheelEvent<HTMLCanvasElement>): void => {
    event.preventDefault()
    const span = view.end - view.start
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const delta = ((event.deltaX || event.deltaY) / size.width) * span
      setView(clampView({ start: view.start + delta, end: view.end + delta }, session.sampleCount))
      return
    }
    const anchor = sampleAt(event.clientX)
    const factor = Math.exp(event.deltaY * 0.0015)
    const nextSpan = Math.max(32, Math.min(session.sampleCount, span * factor))
    const position = (anchor - view.start) / span
    setView(
      clampView(
        { start: anchor - nextSpan * position, end: anchor + nextSpan * (1 - position) },
        session.sampleCount
      )
    )
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(size.width * ratio)
    canvas.height = Math.floor(Math.max(size.height, contentHeight) * ratio)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${Math.max(size.height, contentHeight)}px`

    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    const width = size.width
    const height = Math.max(size.height, contentHeight)
    const span = view.end - view.start
    const xFor = (sample: number): number => ((sample - view.start) / span) * width

    context.fillStyle = '#090c11'
    context.fillRect(0, 0, width, height)

    context.font = '11px Inter, system-ui, sans-serif'
    context.textBaseline = 'middle'
    for (let grid = 0; grid <= 10; grid += 1) {
      const x = (grid / 10) * width
      context.strokeStyle = grid === 0 || grid === 10 ? '#27303d' : '#19202a'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(Math.round(x) + 0.5, AXIS_HEIGHT)
      context.lineTo(Math.round(x) + 0.5, height)
      context.stroke()
      context.fillStyle = '#778397'
      const seconds = (view.start + (grid / 10) * span) / session.sampleRate
      context.fillText(formatDuration(seconds), Math.min(width - 58, x + 6), AXIS_HEIGHT / 2)
    }

    let y = AXIS_HEIGHT
    for (const channel of session.digitalChannels) {
      drawTrackDivider(context, y, width)
      const high = y + 17
      const low = y + DIGITAL_HEIGHT - 17
      context.strokeStyle = channel.color
      context.lineWidth = 1.5
      context.beginPath()
      const first = Math.max(0, Math.floor(view.start))
      const last = Math.min(session.sampleCount - 1, Math.ceil(view.end))
      let previous = channel.samples[first]
      context.moveTo(0, previous ? high : low)
      for (let sample = first + 1; sample <= last; sample += 1) {
        const value = channel.samples[sample]
        if (value !== previous) {
          const x = xFor(sample)
          context.lineTo(x, previous ? high : low)
          context.lineTo(x, value ? high : low)
          previous = value
        }
      }
      context.lineTo(width, previous ? high : low)
      context.stroke()
      y += DIGITAL_HEIGHT
    }

    for (const channel of session.analogChannels) {
      drawTrackDivider(context, y, width)
      const top = y + 10
      const bottom = y + ANALOG_HEIGHT - 10
      context.strokeStyle = channel.color
      context.globalAlpha = 0.9
      context.lineWidth = 1.25
      context.beginPath()
      for (let pixel = 0; pixel < width; pixel += 1) {
        const from = Math.max(0, Math.floor(view.start + (pixel / width) * span))
        const to = Math.min(
          session.sampleCount,
          Math.max(from + 1, Math.ceil(view.start + ((pixel + 1) / width) * span))
        )
        let minimum = Number.POSITIVE_INFINITY
        let maximum = Number.NEGATIVE_INFINITY
        for (let sample = from; sample < to; sample += 1) {
          minimum = Math.min(minimum, channel.samples[sample])
          maximum = Math.max(maximum, channel.samples[sample])
        }
        const yFor = (value: number): number => bottom - (value / 3.3) * (bottom - top)
        context.moveTo(pixel + 0.5, yFor(minimum))
        context.lineTo(pixel + 0.5, yFor(maximum))
      }
      context.stroke()
      context.globalAlpha = 1
      y += ANALOG_HEIGHT
    }

    if (decoderVisible && session.annotations.length) {
      drawTrackDivider(context, y, width)
      session.annotations.forEach((annotation) => {
        if (annotation.endSample < view.start || annotation.startSample > view.end) return
        const left = Math.max(0, xFor(annotation.startSample))
        const right = Math.min(width, xFor(annotation.endSample))
        const boxWidth = Math.max(2, right - left)
        context.fillStyle = `${annotation.color}22`
        context.strokeStyle = `${annotation.color}aa`
        roundedRect(context, left + 1, y + 8, boxWidth - 2, 28, 5)
        context.fill()
        context.stroke()
        if (boxWidth > 18) {
          context.save()
          context.beginPath()
          context.rect(left + 4, y + 8, boxWidth - 8, 28)
          context.clip()
          context.fillStyle = '#dbeafe'
          context.fillText(boxWidth > 72 ? annotation.text : annotation.shortText, left + 7, y + 22)
          context.restore()
        }
      })
    }

    markers.forEach((sample, index) => {
      if (sample < view.start || sample > view.end) return
      const x = xFor(sample)
      context.strokeStyle = index === 0 ? '#fbbf24' : '#fb7185'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(x, AXIS_HEIGHT)
      context.lineTo(x, height)
      context.stroke()
      context.fillStyle = context.strokeStyle
      context.fillText(index === 0 ? 'A' : 'B', x + 5, AXIS_HEIGHT + 10)
    })

    if (hover !== null && hover >= view.start && hover <= view.end) {
      const x = xFor(hover)
      context.strokeStyle = '#94a3b866'
      context.setLineDash([3, 4])
      context.beginPath()
      context.moveTo(x, AXIS_HEIGHT)
      context.lineTo(x, height)
      context.stroke()
      context.setLineDash([])
    }
  }, [contentHeight, decoderVisible, hover, markers, session, size, view])

  useEffect(() => draw(), [draw])

  const markerDelta = markers.length === 2 ? Math.abs(markers[1] - markers[0]) / session.sampleRate : null

  return (
    <div className="waveform-shell" data-testid="waveform-shell">
      <div className="channel-rail" style={{ minHeight: contentHeight }}>
        <div className="axis-rail">Channels</div>
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`channel-card ${track.type}`}
            style={{ height: track.type === 'digital' ? DIGITAL_HEIGHT : ANALOG_HEIGHT }}
          >
            <span className="channel-color" style={{ backgroundColor: track.color }} />
            <div>
              <strong>{track.id}</strong>
              <span>{track.name}</span>
            </div>
            <small>GPIO {track.gpio}</small>
          </div>
        ))}
        {decoderVisible && session.annotations.length > 0 && (
          <div className="decoder-label" style={{ height: ANNOTATION_HEIGHT }}>
            <span className="channel-color" style={{ backgroundColor: '#38bdf8' }} />
            <div><strong>I²C</strong><span>Protocol</span></div>
          </div>
        )}
      </div>
      <div className="canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${session.mode} waveform with ${session.digitalChannels.length} digital and ${session.analogChannels.length} analog channels`}
          data-testid="waveform-canvas"
          onWheel={onWheel}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragOrigin({ x: event.clientX, view })
          }}
          onPointerMove={(event) => {
            setHover(sampleAt(event.clientX))
            if (!dragOrigin) return
            const span = dragOrigin.view.end - dragOrigin.view.start
            const delta = ((dragOrigin.x - event.clientX) / size.width) * span
            setView(
              clampView(
                { start: dragOrigin.view.start + delta, end: dragOrigin.view.end + delta },
                session.sampleCount
              )
            )
          }}
          onPointerUp={(event) => {
            if (Math.abs((dragOrigin?.x ?? event.clientX) - event.clientX) < 3) {
              const sample = sampleAt(event.clientX)
              setMarkers((current) => (current.length >= 2 ? [sample] : [...current, sample]))
            }
            setDragOrigin(null)
          }}
          onPointerLeave={() => {
            setHover(null)
            setDragOrigin(null)
          }}
        />
        <div className="viewport-hud">
          <span>{formatDuration((view.end - view.start) / session.sampleRate)} window</span>
          {hover !== null && <span>{formatDuration(hover / session.sampleRate)}</span>}
          {markerDelta !== null && <span>A–B {formatDuration(markerDelta)}</span>}
          <button type="button" onClick={() => setView({ start: 0, end: session.sampleCount })}>Fit</button>
        </div>
      </div>
    </div>
  )
}

function clampView(view: ViewRange, sampleCount: number): ViewRange {
  const span = Math.min(sampleCount, Math.max(32, view.end - view.start))
  let start = view.start
  if (start < 0) start = 0
  if (start + span > sampleCount) start = sampleCount - span
  return { start, end: start + span }
}

function drawTrackDivider(context: CanvasRenderingContext2D, y: number, width: number): void {
  context.strokeStyle = '#1b222d'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, y + 0.5)
  context.lineTo(width, y + 0.5)
  context.stroke()
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeWidth = Math.max(0, width)
  const safeRadius = Math.min(radius, safeWidth / 2, height / 2)
  context.beginPath()
  context.roundRect(x, y, safeWidth, height, safeRadius)
}
