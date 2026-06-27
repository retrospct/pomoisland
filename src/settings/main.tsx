import '@fontsource/fraunces/400.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@shared/tokens.css'
import './settings.css'

import { loadAuroraSample } from '@shared/sound'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsApp } from './SettingsApp'

void loadAuroraSample(new URL('../shared/assets/aurora.wav', import.meta.url).href)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
)
