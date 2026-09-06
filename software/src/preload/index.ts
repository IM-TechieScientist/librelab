import { contextBridge, ipcRenderer } from 'electron'
import {
  ipcChannels,
  type CaptureConfiguration,
  type CaptureProgress,
  type LibreLabApi
} from '../shared/contracts'

const api: LibreLabApi = {
  listDevices: () => ipcRenderer.invoke(ipcChannels.listDevices),
  connect: (deviceId) => ipcRenderer.invoke(ipcChannels.connect, deviceId),
  disconnect: (deviceId) => ipcRenderer.invoke(ipcChannels.disconnect, deviceId),
  capture: (deviceId: string, configuration: CaptureConfiguration) =>
    ipcRenderer.invoke(ipcChannels.capture, deviceId, configuration),
  onCaptureProgress: (callback: (progress: CaptureProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: CaptureProgress): void => callback(progress)
    ipcRenderer.on(ipcChannels.captureProgress, listener)
    return () => ipcRenderer.removeListener(ipcChannels.captureProgress, listener)
  }
}

contextBridge.exposeInMainWorld('librelab', api)
