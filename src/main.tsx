import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Each version is its own lazy chunk, so a page only loads that version's components and CSS.
// v6 is the site: it lives at / (and still at /version6). v1 moved to /version1; v2 at /version2 (3D G hero), v3 at /version3 (live-run hero), v4 at /version4
// (v2 + the real Grain mark, a loading intro, and switchable palettes), v5 at /version5 (v4 with the gyroscope hero),
// v6 at /version6 (v4 after Shiva's review: fog mark instead of the 3D one, fog nav tabs). Each folder is a full copy.
const path = window.location.pathname
const App = /^\/version2\/g-lab\/?$/.test(path)
  ? lazy(() => import('./version2/brand/GLab.tsx'))   // scratch page for choosing the v2 G mark
  : /^\/version2(\/|$)/.test(path)
    ? lazy(() => import('./version2/App.tsx'))
    : /^\/version3(\/|$)/.test(path)
      ? lazy(() => import('./version3/App.tsx'))
      : /^\/version4(\/|$)/.test(path)
        ? lazy(() => import('./version4/App.tsx'))
        : /^\/version5(\/|$)/.test(path)
          ? lazy(() => import('./version5/App.tsx'))
          : /^\/version1(\/|$)/.test(path)
            ? lazy(() => import('./v1/App.tsx'))
            : lazy(() => import('./version6/App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
