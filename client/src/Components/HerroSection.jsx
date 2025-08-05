import ArticleSection from "./ArticleSection";
import BlogGrid from "./ฺBlogGrid";
const HerroSection = () => {
  return (
    <div className="bg-white mb-150">
      <div className="flex flex-col md:flex-row items-center justify-center w-full px-10 py-16  md:grid grid-cols-3 gap-10 ">
        <div className="md:w-[343px] md:h-[276px] text-center md:text-left ">
          <h1 className="text-4xl font-bold leading-tight text-[#26231E]">
            McLAREN <span className="text-[#]">THE REAL SUPERCAR</span>,
            <br /> FIERCE ELEGANCE
          </h1>
          <p className="mt-4 text-[#75716B]">
            A light and strong supercar shaped by the forces of nature. Honed by
            the elements. Poised for attack. And ferociously fast. Yet
            beautifully made, tactile and effortlessly usable, every day.
          </p>
        </div>
        <div className=" overflow-hidden rounded-xl shadow-lg hover:scale-110 ease-in-out duration-300  w-full h-full">
          <img
            src="/img/mc_homepage.jpg"
            alt="McLaren Homepage"
            className=" object-cover object-center   "
          />
        </div>

        <div className="mt-6 text-center md:text-left md:ml-20">
          <h3 className="text-xl font-bold text-[#75716B]">The McLaren 720S</h3>
          <p className="mt-3 text-[#75716B] max-w-md">
            The McLaren 720S coupe is purposeful and radical. With apex predator
            responses. This light and strong supercar accelerates from 0-60mph
            in an incredible 2.8 seconds when provoked. And can cover a quarter
            of a mile in 10.4 seconds. From a standing start.
          </p>
          <p className="mt-3 text-[#75716B] max-w-md">
            But raw figures don't reveal the whole story. There is pure driver
            engagement and contemporary luxury here too. In depth. A thrilling,
            accessible, natural balance.
          </p>
          <p className="mt-10 text-[#75716B] max-w-md text-2xl">
            Evolution in full flight.
          </p>
        </div>
      </div>
      <div className="container mx-auto">
        <ArticleSection />
      </div>
      <div>
        <div>
          <BlogGrid />
        </div>
      </div>
    </div>
  );
};
export default HerroSection;
