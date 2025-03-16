function FooterSection() {
  return (
    <footer className="bg-black text-white">
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-wrap justify-between gap-6 py-6  border-gray-800">
                <div className="flex flex-wrap  gap-x-8 gap-y-4">
                    <h3 className="text-[16] hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">Get in touch</h3>
                    <div className="flex flex-row gap-4">
                        <img src="./src/assets/logo/linkedin-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/facebook-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/twitter-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/instagram-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/discord-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/github-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/youtube-logo.png" className="cursor-pointer"/>
                        <img src="./src/assets/logo/tiktok-logo.png" className="cursor-pointer"/>

                    </div>
                  
                
                 </div>
                 <div className="hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
                        <h3>Home Page</h3>
                </div>

            </div>
        </div>
    </footer>
  );
}
export default FooterSection;