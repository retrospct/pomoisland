import type { PomApi } from './types'

declare global {
  interface Window {
    api: PomApi
  }
}

export {}
