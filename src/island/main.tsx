import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/500-italic.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@shared/tokens.css'
import '@shared/notch.css'
import './animations.css'
import './island.css'

import { loadAuroraSample } from '@shared/sound'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IslandApp } from './IslandApp'

void loadAuroraSample(new URL('../shared/assets/aurora.wav', import.meta.url).href)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IslandApp />
  </StrictMode>,
)
