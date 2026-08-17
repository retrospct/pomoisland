import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@shared/tokens.css'
import '../island/island.css'
import './tasks.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TasksWindowApp } from './TasksWindowApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TasksWindowApp />
  </StrictMode>,
)
