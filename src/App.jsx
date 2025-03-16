import { useState } from 'react'
import './App.css'
import Navbar from './Components/NavbarSection'
import HerroSection from './Components/HerroSection'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Navbar/>
      <HerroSection/>
      <button class="btn">Button</button>

    </>
  )
}

export default App
