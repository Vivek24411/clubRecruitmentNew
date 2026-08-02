import React from 'react'
import { Routes, Route } from 'react-router-dom'
import DashBoard from './pages/DashBoard'
import Sessions from './pages/Sessions'
import Session from './pages/Session'
import Events from './pages/Events'
import Event from './pages/Event'
import Profile from './pages/Profile'
import Login from './pages/Login'
import UserProtectedWrapper from './pages/UserProtectedWrapper'
import AddClub from './pages/AddClub'
import Clubs from './pages/Clubs'
import Club from './pages/Club'
import Students from './pages/Students'
import Settings from './pages/Settings'
import AuditLogs from './pages/AuditLogs'

const App = () => {
  return (
    <>
    <Routes>
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
    </Routes>
    </>
  )
}

export default App
