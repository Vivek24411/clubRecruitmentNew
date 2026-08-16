import React from 'react'
import { Routes, Route } from 'react-router-dom'
import UserProtectedWrapper from './pages/UserProtectedWrapper'

const DashBoard = React.lazy(() => import('./pages/DashBoard'))
const Sessions = React.lazy(() => import('./pages/Sessions'))
const Session = React.lazy(() => import('./pages/Session'))
const Events = React.lazy(() => import('./pages/Events'))
const Event = React.lazy(() => import('./pages/Event'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Login = React.lazy(() => import('./pages/Login'))
const AddClub = React.lazy(() => import('./pages/AddClub'))
const Clubs = React.lazy(() => import('./pages/Clubs'))
const Club = React.lazy(() => import('./pages/Club'))
const Students = React.lazy(() => import('./pages/Students'))
const Settings = React.lazy(() => import('./pages/Settings'))
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'))

const preloadRoutes = () => Promise.allSettled([
  import('./pages/DashBoard'), import('./pages/Sessions'), import('./pages/Session'),
  import('./pages/Events'), import('./pages/Event'), import('./pages/Profile'), import('./pages/Login'),
  import('./pages/AddClub'), import('./pages/Clubs'), import('./pages/Club'),
  import('./pages/Students'), import('./pages/Settings'), import('./pages/AuditLogs'),
])

function RouteFallback() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-paper px-6 text-ink" role="status" aria-live="polite">
      <div className="text-center">
        <p className="display text-2xl">Discovr</p>
        <div className="mx-auto mt-4 h-0.5 w-20 animate-pulse bg-accent" />
        <p className="mt-4 text-sm text-ink-3">Loading page…</p>
      </div>
    </div>
  )
}

const App = () => {
  React.useEffect(() => {
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(() => { void preloadRoutes() }, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => { void preloadRoutes() }, 500)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <>
    <React.Suspense fallback={<RouteFallback />}><Routes>
      <Route path='/' element={<UserProtectedWrapper><DashBoard/></UserProtectedWrapper>} />
      <Route path='/events' element={<UserProtectedWrapper><Events/></UserProtectedWrapper>} />
      <Route path='/event/:eventId' element={<UserProtectedWrapper><Event/></UserProtectedWrapper>} />
      <Route path='/sessions' element={<UserProtectedWrapper><Sessions/></UserProtectedWrapper>} />
      <Route path='/session/:sessionId' element={<UserProtectedWrapper><Session/></UserProtectedWrapper>} />
      <Route path='/profile' element={<UserProtectedWrapper><Profile/></UserProtectedWrapper>} />
      <Route path='/login' element={<Login/>}/>
      <Route path='/addClub' element={<UserProtectedWrapper><AddClub/></UserProtectedWrapper>} />
      <Route path='/clubs' element={<UserProtectedWrapper><Clubs/></UserProtectedWrapper>} />
      <Route path='/club/:clubId' element={<UserProtectedWrapper><Club/></UserProtectedWrapper>} />
      <Route path='/students' element={<UserProtectedWrapper><Students/></UserProtectedWrapper>} />
      <Route path='/settings' element={<UserProtectedWrapper><Settings/></UserProtectedWrapper>} />
      <Route path='/audit-logs' element={<UserProtectedWrapper><AuditLogs/></UserProtectedWrapper>} />
    </Routes></React.Suspense>
    </>
  )
}

export default App
