import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted rather than pulled from a font CDN: one less third party in the
// critical path, no render-blocking cross-origin request, and the display face
// is guaranteed present on the very first paint of the title card.
import '@fontsource/cormorant-garamond/300.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
