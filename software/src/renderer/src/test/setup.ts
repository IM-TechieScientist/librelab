import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  measureText: vi.fn(() => ({ width: 42 })),
  moveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  roundRect: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  stroke: vi.fn()
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => canvasContext)
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({
    bottom: 500,
    height: 500,
    left: 0,
    right: 900,
    toJSON: () => ({}),
    top: 0,
    width: 900,
    x: 0,
    y: 0
  })
})

HTMLCanvasElement.prototype.setPointerCapture = vi.fn()

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    this.callback([
      {
        borderBoxSize: [],
        contentBoxSize: [],
        contentRect: {
          bottom: 500,
          height: 500,
          left: 0,
          right: 900,
          top: 0,
          width: 900,
          x: 0,
          y: 0,
          toJSON: () => ({})
        },
        devicePixelContentBoxSize: [],
        target
      }
    ], this)
  }

  disconnect(): void {}
  unobserve(): void {}
})

Object.defineProperty(window, 'devicePixelRatio', {
  configurable: true,
  value: 1
})
