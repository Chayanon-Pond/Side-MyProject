import React from "react";
import Navbar from "../Components/NavbarSection";
import HerroSection from "../Components/HerroSection";
import FooterSection from "../Components/FooterSection";

const Home = () => {
  return (
    <>
      <div>
        <div className="bg-white">
          <Navbar />
          <HerroSection />
          <FooterSection />
        </div>
      </div>
    </>
  );
};

export default Home;
