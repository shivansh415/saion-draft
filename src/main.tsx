import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The site's two faces — one editorial serif (with its italic) and one sans —
// are declared in `index.css` and served from `public/assets/fonts`. Cormorant
// Garamond and Inter used to be pulled in here as a second, parallel pairing;
// standardising on the Reposé faces retired both, so the @fontsource imports
// have gone with them.
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
