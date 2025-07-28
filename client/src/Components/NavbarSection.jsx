
const Navbar = () => {
    return (
        <nav className=" md:flex  md:justify-between md:mx-auto shadow-sm flex justify-between bg-[#1c1c1c] md:items-center w-full  sticky top-0">
                <div className="md:ml-1 ml-1 h-28 ">
                        <img className="h-28" src="./src/assets/logo/Porsche_car_logo.png"alt="logo" ></img>
                </div>
                <div className="hidden md:flex gap-4">
                    <div class=" mx-auto md:pl-120 mr-20 mt-3">

                        <ul class="flex flex-col md:flex-row md:gap-10 gap-2 ">
                        <li
                            class="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
                            Home</li>
                        <li
                            class="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
                            About</li>
                        <li
                            class="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
                            contact</li>
                            <li
                            class="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
                            Help</li>
                        </ul>
                        
                        
                    </div>
                        <button  className="w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  mr-2 md:rounded-3xl  hover:shadow-md cursor-pointer">Log in</button>
                        <button className= " w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  md:w-47px md:w-24px md:mr-10 md:rounded-3xl hover:shadow-md cursor-pointer">Sign up</button>
                </div>
                <div className="flex  md:hidden items-center justify-center ">
                    <button className= "md:mr-10 mr-10"  data-collapse-toggle="navbar-hamburger" type="button"><img src="./src/assets/logo/hamberger.svg "
                    alt="load"></img></button>
                    
              </div>
              <script src="https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js"></script>
        </nav>


    )
}
export default Navbar;