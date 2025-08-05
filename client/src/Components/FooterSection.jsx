import { Link } from "react-router-dom";

function FooterSection() {
  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-between gap-6 py-6  border-gray-800">
          <div className="flex flex-wrap  gap-x-8 gap-y-4">
            <h3 className="text-[16] hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer">
              Get in touch
            </h3>
            <div className="flex flex-row gap-4">
              <img
                src="/logo/linkedin-logo.png"
                className="cursor-pointer"
                alt="LinkedIn"
              />
              <img
                src="/logo/facebook-logo.png"
                className="cursor-pointer"
                alt="Facebook"
              />
              <img
                src="/logo/twitter-logo.png"
                className="cursor-pointer"
                alt="Twitter"
              />
              <img
                src="/logo/instagram-logo.png"
                className="cursor-pointer"
                alt="Instagram"
              />
              <img
                src="/logo/discord-logo.png"
                className="cursor-pointer"
                alt="Discord"
              />
              <img
                src="/logo/github-logo.png"
                className="cursor-pointer"
                alt="GitHub"
              />
              <img
                src="/logo/youtube-logo.png"
                className="cursor-pointer"
                alt="YouTube"
              />
              <img
                src="/logo/tiktok-logo.png"
                className="cursor-pointer"
                alt="TikTok"
              />
            </div>
          </div>
          <div className="hover:underline hover:underline-offset-8 hover:decoration-white cursor-pointer ">
            <Link to="/">
              <h3>Home Page</h3>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default FooterSection;
