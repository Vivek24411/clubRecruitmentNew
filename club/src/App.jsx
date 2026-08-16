import React from 'react'
import { Routes, Route } from 'react-router-dom'
import UserProtectedWrapper from './pages/UserProtectedWrapper'

const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Login = React.lazy(() => import('./pages/Login'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Session = React.lazy(() => import('./pages/Session'))
const Sessions = React.lazy(() => import('./pages/Sessions'))
const AddSession = React.lazy(() => import('./pages/AddSession'))
const Event = React.lazy(() => import('./pages/Event'))
const Events = React.lazy(() => import('./pages/Events'))
const AddEvent = React.lazy(() => import('./pages/AddEvent'))
const EventRegisteredStudents = React.lazy(() => import('./pages/EventRegisteredStudents'))
const EditEvent = React.lazy(() => import('./pages/EditEvent'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))

const preloadRoutes = () => Promise.allSettled([
  import('./pages/Dashboard'), import('./pages/Login'), import('./pages/Profile'),
  import('./pages/Session'), import('./pages/Sessions'), import('./pages/AddSession'),
  import('./pages/Event'), import('./pages/Events'), import('./pages/AddEvent'),
  import('./pages/EventRegisteredStudents'), import('./pages/EditEvent'), import('./pages/ForgotPassword'),
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
    <Route path='/' element={<UserProtectedWrapper><Dashboard /></UserProtectedWrapper>} />
    <Route path='/login' element={<Login />} />
    <Route path='/forgotPassword' element={<ForgotPassword />} />
    <Route path='/profile' element={<UserProtectedWrapper><Profile /></UserProtectedWrapper>} />
    <Route path='/session/:sessionId' element={<UserProtectedWrapper><Session /></UserProtectedWrapper>} />
    <Route path='/sessions' element={<UserProtectedWrapper><Sessions /></UserProtectedWrapper>} />
    <Route path='/addSession' element={<UserProtectedWrapper><AddSession /></UserProtectedWrapper>} />
    <Route path='/event/:eventId' element={<UserProtectedWrapper><Event /></UserProtectedWrapper>} />
    <Route path='/events' element={<UserProtectedWrapper><Events /></UserProtectedWrapper>} />
    <Route path='/addEvent' element={<UserProtectedWrapper><AddEvent /></UserProtectedWrapper>} />
    <Route path='/event-applications/:eventId' element={<UserProtectedWrapper><EventRegisteredStudents /></UserProtectedWrapper>} />
    <Route path='/events/:eventId/edit' element={<UserProtectedWrapper><EditEvent /></UserProtectedWrapper>} />
    </Routes></React.Suspense>
    </>
  )
}

export default App
