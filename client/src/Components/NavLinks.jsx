import React from "react";
import { Link } from "react-router-dom";

const NavLinks = ({ onClick, className }) => {
  return (
    <ul className={className || "flex flex-col md:flex-row md:gap-10 gap-2"}>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/" className="block" onClick={onClick}>
          Home
        </Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/about" onClick={onClick}>
          About
        </Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/contact" onClick={onClick}>
          Contact
        </Link>
      </li>
      <li className="text-white hover:text-white hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
        <Link to="/help" onClick={onClick}>
          Help
        </Link>
      </li>
    </ul>
  );
};

export default NavLinks;
