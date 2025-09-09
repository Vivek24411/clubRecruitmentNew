import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Session from './pages/Session'
import Sessions from './pages/Sessions'
import AddSession from './pages/AddSession'
import Event from './pages/Event'
import Events from './pages/Events'
import AddEvent from './pages/AddEvent'
import UserProtectedWrapper from './pages/UserProtectedWrapper'
import EventRegisteredStudents from './pages/EventRegisteredStudents'

const App = () => {
  return (
    <>
    <Routes>
    <Route path='/' element={<UserProtectedWrapper><Dashboard /></UserProtectedWrapper>} />
    <Route path='/login' element={<Login />} />
    <Route path='/profile' element={<UserProtectedWrapper><Profile /></UserProtectedWrapper>} />
    <Route path='/session/:sessionId' element={<UserProtectedWrapper><Session /></UserProtectedWrapper>} />
    <Route path='/sessions' element={<UserProtectedWrapper><Sessions /></UserProtectedWrapper>} />
    <Route path='/addSession' element={<UserProtectedWrapper><AddSession /></UserProtectedWrapper>} />
    <Route path='/event/:eventId' element={<UserProtectedWrapper><Event /></UserProtectedWrapper>} />
    <Route path='/events' element={<UserProtectedWrapper><Events /></UserProtectedWrapper>} />
    <Route path='/addEvent' element={<UserProtectedWrapper><AddEvent /></UserProtectedWrapper>} />
    <Route path='/event-applications/:eventId' element={<UserProtectedWrapper><EventRegisteredStudents /></UserProtectedWrapper>} />
    </Routes>
    </>
  )
}

export default App