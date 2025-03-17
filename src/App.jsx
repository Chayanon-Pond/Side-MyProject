import { useState } from 'react'
import './App.css'
import Navbar from './Components/NavbarSection'
import HerroSection from './Components/HerroSection'
import FooterSection from './Components/FooterSection'

function App() {

  return (
    <div className='bg-white'>
      <Navbar/>
      <HerroSection/>
      <FooterSection/>

    </div>
  )
}

export default App
