import { NavLink, Route, Routes } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import TailorPage from './pages/TailorPage'
import SavedPage from './pages/SavedPage'
import InterviewPrepPage from './pages/InterviewPrepPage'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3.5 sm:py-2 ${
    isActive ? 'bg-ink-600 text-white font-semibold shadow-sm' : 'text-fg-muted hover:bg-well hover:text-fg'
  }`

export default function App() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-600 text-white shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M7 17L17 7M17 7H9M17 7V15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-base font-semibold tracking-tight text-fg">Job Hunt Assistant</span>
          </div>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Tailor
            </NavLink>
            <NavLink to="/interview" className={navLinkClass}>
              Interview Prep
            </NavLink>
            <NavLink to="/saved" className={navLinkClass}>
              Saved
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<TailorPage />} />
          <Route path="/interview" element={<InterviewPrepPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
