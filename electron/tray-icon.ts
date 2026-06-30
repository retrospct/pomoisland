import { app, nativeImage, screen } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Resolve a tray PNG from `build/tray/` (dev) or `Resources/tray/` (packaged). */
function trayAssetPath(name: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'tray', name)
  }
  return join(__dirname, '../../build/tray', name)
}

/** Best available menu-bar icon for the current macOS scale factor. */
export function loadTrayIcon(): Electron.NativeImage {
  const scale = process.platform === 'darwin' ? screen.getPrimaryDisplay().scaleFactor : 1
  const candidates =
    scale >= 2
      ? ['trayIcon@2x.png', 'trayIcon-22@2x.png', 'trayIcon-22.png', 'trayIcon.png']
      : ['trayIcon.png', 'trayIcon-22.png', 'trayIcon@2x.png']

  for (const name of candidates) {
    const path = trayAssetPath(name)
    if (!existsSync(path)) continue
    const img = nativeImage.createFromPath(path)
    if (!img.isEmpty()) return img
  }

  return nativeImage.createEmpty()
}
