import React, { useState } from "react";
import BackButton from "../Components/ui/BackButton";

const Contact = () => {
  const [copied, setCopied] = useState(false);
  const [githubCopied, setGithubCopied] = useState(false);
  const email = "chayanon.kmutnb@gmail.com";
  const github = "https://github.com/Chayanon-Pond";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const copyGithub = async () => {
    try {
      await navigator.clipboard.writeText(github);
      setGithubCopied(true);
      setTimeout(() => setGithubCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md border border-gray-100">
        <div className="p-6">
          <BackButton className="mb-4" />

          <h1 className="text-2xl font-bold mb-2 text-gray-900">ติดต่อ</h1>
          <p className="text-gray-600 mb-6">
            หากต้องการติดต่อหรือเสนอความคิดเห็นเกี่ยวกับโปรเจคนี้
            สามารถติดต่อได้ตามช่องทางด้านล่าง
          </p>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <svg
                  className="w-6 h-6 text-blue-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 12H8m8 0c0 2-2 4-4 4s-4-2-4-4m8 0V6a2 2 0 00-2-2H6a2 2 0 00-2 2v6"
                  />
                </svg>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="text-gray-800 font-medium">{email}</div>
                </div>
              </div>
              <div className="mt-3 sm:mt-0 flex w-full sm:w-auto items-center sm:space-x-2">
                <button
                  onClick={copyEmail}
                  className="flex-1 sm:flex-none w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm text-center cursor-pointer"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={`mailto:${email}`}
                  className="flex-1 sm:flex-none w-full sm:w-auto mt-2 sm:mt-0 sm:ml-0 px-3 py-2 border text-black border-gray-200 rounded text-sm text-center hover:bg-gray-100"
                >
                  Send
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <svg
                  className="w-6 h-6 text-gray-800 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577 0-.285-.01-1.04-.015-2.04-3.338.727-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.47-2.382 1.235-3.222-.124-.303-.535-1.523.116-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.653 1.653.242 2.873.118 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.807 5.625-5.48 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.903-.015 3.297 0 .32.192.694.8.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                <div>
                  <div className="text-sm text-gray-500">GitHub</div>
                  <a
                    href="https://github.com/Chayanon-Pond"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 font-medium hover:underline"
                  >
                    github.com/Chayanon-Pond
                  </a>
                </div>
              </div>
                <div className="mt-3 sm:mt-0 flex w-full sm:w-auto items-center sm:space-x-2">
                  <button
                    onClick={copyGithub}
                    className="flex-1 sm:flex-none w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm text-center cursor-pointer"
                  >
                    {githubCopied ? "Copied" : "Copy"}
                  </button>
                <a
                  href="https://github.com/Chayanon-Pond"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 border border-gray-200 rounded text-sm text-center hover:bg-gray-100 text-black"
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
