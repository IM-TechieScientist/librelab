import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { ipcChannels, type CaptureConfiguration } from '../shared/contracts'
import { MockDeviceService } from './mockDeviceService'

const devices = new MockDeviceService()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#090c11',
    title: 'LibreLab Studio',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle(ipcChannels.listDevices, () => devices.listDevices())
  ipcMain.handle(ipcChannels.connect, (_event, deviceId: string) => devices.connect(deviceId))
  ipcMain.handle(ipcChannels.disconnect, (_event, deviceId: string) => devices.disconnect(deviceId))
  ipcMain.handle(
    ipcChannels.capture,
    (event, deviceId: string, configuration: CaptureConfiguration) =>
      devices.capture(deviceId, configuration, (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send(ipcChannels.captureProgress, progress)
      })
  )
}

app.whenReady().then(() => {
  app.setAppUserModelId('org.fossasia.librelab.studio')
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
