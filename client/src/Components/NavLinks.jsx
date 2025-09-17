import React from "react";
import { Link } from "react-router-dom";

const NavLinks = ({ onClick = () => {}, className = "" }) => {
  return (
    <ul className={`flex flex-col md:flex-row md:gap-10 gap-2 ${className}`}>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/" className="block" onClick={onClick}>Home</Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/about" className="block" onClick={onClick}>About</Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/contact" className="block" onClick={onClick}>Contact</Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/help" className="block" onClick={onClick}>Help</Link>
      </li>
    </ul>
  );
};

export default NavLinks;
