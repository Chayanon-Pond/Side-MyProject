import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className=" md:flex  md:justify-between md:mx-auto shadow-sm flex justify-between bg-[#1c1c1c] md:items-center w-full  sticky top-0">
      <div className="md:ml-1 ml-1 h-28 ">
        <Link to="/">
          <img
            className="h-28"
            src="/logo/Porsche_car_logo.png"
            alt="logo"
          ></img>
        </Link>
      </div>
      <div className="hidden md:flex gap-4">
        <div className=" mx-auto md:pl-120 mr-20 mt-3">
          <ul className="flex flex-col md:flex-row md:gap-10 gap-2 ">
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
              Home
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
              About
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
              contact
            </li>
            <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
              Help
            </li>
          </ul>
        </div>
        <button className="w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  mr-2 md:rounded-3xl  hover:shadow-md cursor-pointer">
          <Link to="/login">Log in</Link>
        </button>
        <button className=" w-[127px] h-[48px] bg-black text-white border px-4 py-2  hover:bg-gray-800  md:w-47px md:w-24px md:mr-10 md:rounded-3xl hover:shadow-md cursor-pointer">
          <Link to="/register">Sign up</Link>
        </button>
      </div>
      <div className="flex  md:hidden items-center justify-center ">
        <button
          className="md:mr-10 mr-10"
          data-collapse-toggle="navbar-hamburger"
          type="button"
        >
          <img src="/logo/hamberger.svg" alt="hamburger menu"></img>
        </button>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js"></script>
    </nav>
  );
};
export default Navbar;
