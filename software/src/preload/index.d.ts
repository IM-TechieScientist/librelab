import type { LibreLabApi } from '../shared/contracts'

declare global {
  interface Window {
    librelab?: LibreLabApi
  }
}

export {}
