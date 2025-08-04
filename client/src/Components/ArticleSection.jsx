
function ArticleSection () {
  return (
    <section className="bg-gray-500 rounded-xl container mx-auto  px-2 py-4 mb-30">
      <div className="md:flex md:flex-row md:justify-between ">
        <div className="hidden md:flex">
          <div className="tabs tabs-box ">
              <input type="radio" name="my_tabs_1" className="tab" aria-label="McLaren 720S" />
              <input type="radio" name="my_tabs_1" className="tab" aria-label="McLaren GTS" defaultChecked />
              <input type="radio" name="my_tabs_1" className="tab" aria-label="McLaren W1" />
              <input type="radio" name="my_tabs_1" className="tab" aria-label="Urus" />
          </div>
        </div>
        <div className="md:flex md:flex-row md:justify-center md:items-center md:gap-10 ">
            <label className="input bg-white">
                <svg className=" h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></g></svg>
                <input type="search" required placeholder="Search" className=" text-black"/>
            </label>
        </div>
        <div className=" md:flex-row md:justify-center md:items-center md:gap-10 md:hidden mt-6">
            <select defaultValue="Pick a color" className="select bg-white text-black">
                <option disabled={true}>Pick a color</option>
                <option>Crimson</option>
                <option>Amber</option>
                <option>Velvet</option>
            </select>
        </div>
      </div>
          
      
    </section>
  )
}
export default ArticleSection