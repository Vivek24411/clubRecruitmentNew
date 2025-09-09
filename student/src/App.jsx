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
      <Route path='/profile' element={<Profile/>}/>
      <Route path='/session/:sessionId' element={<Session/>}/>
      <Route path='/sessions' element={<Sessions/>}/>
      <Route path='/event/:eventId' element={<Event/>}/>
      <Route path='/events' element={<Events/>}/>
      <Route path='/clubs' element={<Clubs/>}/>
      <Route path='/club/:clubId' element={<Club/>}/>
      <Route path='/events/club/:clubId' element={<ClubEvents/>}/>
      <Route path='/sessions/club/:clubId' element={<ClubSessions/>}/>
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