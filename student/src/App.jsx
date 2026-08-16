import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedWrapper from './pages/ProtectedWrapper'
import StudentLayout from './components/StudentLayout'

const Home = React.lazy(() => import('./pages/Home'))
const Register = React.lazy(() => import('./pages/Register'))
const Login = React.lazy(() => import('./pages/Login'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Session = React.lazy(() => import('./pages/Session'))
const Sessions = React.lazy(() => import('./pages/Sessions'))
const Event = React.lazy(() => import('./pages/Event'))
const Events = React.lazy(() => import('./pages/Events'))
const Clubs = React.lazy(() => import('./pages/Clubs'))
const Club = React.lazy(() => import('./pages/Club'))
const ClubEvents = React.lazy(() => import('./pages/ClubEvents'))
const ClubSessions = React.lazy(() => import('./pages/ClubSessions'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const MyApplications = React.lazy(() => import('./pages/MyApplications'))
const Notifications = React.lazy(() => import('./pages/Notifications'))

const preloadRoutes = () => Promise.allSettled([
  import('./pages/Home'), import('./pages/Register'), import('./pages/Login'),
  import('./pages/Profile'), import('./pages/Session'), import('./pages/Sessions'),
  import('./pages/Event'), import('./pages/Events'), import('./pages/Clubs'),
  import('./pages/Club'), import('./pages/ClubEvents'), import('./pages/ClubSessions'),
  import('./pages/ForgotPassword'), import('./pages/MyApplications'), import('./pages/Notifications'),
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
      <Route path='/' element={<StudentLayout><Home/></StudentLayout>}/>
      <Route path='/login' element={<Login/>}/>
      <Route path='/register' element={<Register/>}/>
      <Route path='/profile' element={<ProtectedWrapper><Profile/></ProtectedWrapper>}/>
      <Route path='/session/:sessionId' element={<StudentLayout><Session/></StudentLayout>}/>
      <Route path='/sessions' element={<StudentLayout><Sessions/></StudentLayout>}/>
      <Route path='/event/:eventId' element={<StudentLayout><Event/></StudentLayout>}/>
      <Route path='/events' element={<StudentLayout><Events/></StudentLayout>}/>
      <Route path='/clubs' element={<StudentLayout><Clubs/></StudentLayout>}/>
      <Route path='/club/:clubId' element={<StudentLayout><Club/></StudentLayout>}/>
      <Route path='/events/club/:clubId' element={<StudentLayout><ClubEvents/></StudentLayout>}/>
      <Route path='/sessions/club/:clubId' element={<StudentLayout><ClubSessions/></StudentLayout>}/>
      <Route path='/forgotPassword' element={<ForgotPassword/>}/>
      <Route path='/applications' element={<ProtectedWrapper><MyApplications/></ProtectedWrapper>}/>
      <Route path='/notifications' element={<ProtectedWrapper><Notifications/></ProtectedWrapper>}/>
    </Routes></React.Suspense>
    <ToastContainer
      position="bottom-right"
      autoClose={3500}
      hideProgressBar
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
    </>
  )
}

export default App
