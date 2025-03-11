
const Navbar = () => {
    return (
        <nav className="md:flex  md:justify-between md:mx-auto shadow-sm flex justify-between bg-red-900 h-[80px] md:items-center w-[99%] border-b rounded-3xl  ">
                <div className="md:ml-1 ml-1 ">
                        <img className="h-20" src="./src/assets/logo/ironman-icon.png"alt="logo"></img>
                </div>
                <div className="hidden md:flex gap-4">
                    <div class=" mx-auto md:pl-120 mr-20 mt-3">

                        <ul class="flex flex-col md:flex-row md:gap-10 gap-2 ">
                        <li
                            class="text-white hover:text-amber-300 hover:underline hover:underline-offset-8 hover:decoration-[#fae588e8] cursor-pointer ">
                            Home</li>
                        <li
                            class="text-white hover:text-amber-300 hover:underline hover:underline-offset-8 hover:decoration-[#fae588e8] cursor-pointer ">
                            About</li>
                        <li
                            class="text-white hover:text-amber-300 hover:underline hover:underline-offset-8 hover:decoration-[#fae588e8] cursor-pointer ">
                            contact</li>
                            <li
                            class="text-white hover:text-amber-300 hover:underline hover:underline-offset-8 hover:decoration-[#fae588e8] cursor-pointer ">
                            Help</li>
                        </ul>
                        
                        
                        
                        
                    </div>
                        <button  className="w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  mr-2 md:rounded-3xl  hover:shadow-md cursor-pointer">Log in</button>
                        <button className= " w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  md:w-47px md:w-24px md:mr-10 md:rounded-3xl hover:shadow-md cursor-pointer">Sign up</button>
                </div>
                <div className="flex  md:hidden items-center justify-center ">
                    <div className= "md:mr-10 mr-10"  data-collapse-toggle="navbar-default"><img src="./src/assets/logo/hamberger.svg "
                    alt="load"></img></div>
              </div>
              <script src="https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js"></script>
        </nav>


    )
}
export default Navbar;