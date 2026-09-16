import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The site's two faces — one editorial serif (with its italic) and one sans —
// are declared in `index.css` and served from `public/assets/fonts`. Cormorant
// Garamond and Inter used to be pulled in here as a second, parallel pairing;
// standardising on the Reposé faces retired both, so the @fontsource imports
// have gone with them.
import './index.css'
import App from './App.tsx'

// Before anything renders, not in an effect. The browser restores a reload's
// scroll position as the document grows and re-tries it up to the load event;
// `App` used to switch restoration to manual from a `useEffect`, which runs
// only after the first commit — so on a slow parse the restore could already
// have landed, and the preloader (which holds the page wherever it finds it)
// then kept the visitor mid-film with an empty canvas. Stated here it is in
// force before the document has any height to restore into.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
