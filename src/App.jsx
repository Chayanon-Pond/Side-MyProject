import { useState } from 'react'
import './App.css'
import Navbar from './Components/NavbarSection'
import HerroSection from './Components/HerroSection'
import FooterSection from './Components/FooterSection'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Navbar/>
      <HerroSection/>
      <FooterSection/>

    </>
  )
}

export default App
