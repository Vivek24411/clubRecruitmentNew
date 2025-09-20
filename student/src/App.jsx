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


const App = () => {
  return (
    <>
    <Routes>
      <Route path='/' element={<ProtectedWrapper><Home/></ProtectedWrapper>}/>
      <Route path='/login' element={<Login/>}/>
      <Route path='/register' element={<Register/>}/>
      <Route path='/profile' element={<ProtectedWrapper><Profile/></ProtectedWrapper>}/>
      <Route path='/session/:sessionId' element={<ProtectedWrapper><Session/></ProtectedWrapper>}/>
      <Route path='/sessions' element={<ProtectedWrapper><Sessions/></ProtectedWrapper>}/>
      <Route path='/event/:eventId' element={<ProtectedWrapper><Event/></ProtectedWrapper>}/>
      <Route path='/events' element={<ProtectedWrapper><Events/></ProtectedWrapper>}/>
      <Route path='/clubs' element={<ProtectedWrapper><Clubs/></ProtectedWrapper>}/>
      <Route path='/club/:clubId' element={<ProtectedWrapper><Club/></ProtectedWrapper>}/>
      <Route path='/events/club/:clubId' element={<ProtectedWrapper><ClubEvents/></ProtectedWrapper>}/>
      <Route path='/sessions/club/:clubId' element={<ProtectedWrapper><ClubSessions/></ProtectedWrapper>}/>
    </Routes>
    <ToastContainer 
      position="top-center"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
    </>
  )
}

export default App