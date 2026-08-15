import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedWrapper from './pages/ProtectedWrapper'
import Profile from './pages/Profile'
import Session from './pages/Session'
import Sessions from './pages/Sessions'
import Event from './pages/Event'
import Events from './pages/Events'
import Clubs from './pages/Clubs'
import Club from './pages/Club'
import ClubEvents from './pages/ClubEvents'
import ClubSessions from './pages/ClubSessions'
import ForgotPassword from './pages/ForgotPassword'
import MyApplications from './pages/MyApplications'
import Notifications from './pages/Notifications'
import StudentLayout from './components/StudentLayout'

const App = () => {
  return (
    <>
    <Routes>
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
    </Routes>
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
