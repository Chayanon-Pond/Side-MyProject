import React, { useState } from "react";
import BackButton from "../Components/ui/BackButton";
import { Link } from "react-router-dom";

const faqs = [
  {
    q: "จะลงทะเบียนหรือเข้าสู่ระบบได้อย่างไร?",
    a: (
      <>
        ไปที่หน้า{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register
        </Link>{" "}
        เพื่อสร้างบัญชีใหม่ หรือไปที่{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Login
        </Link>{" "}
        หากมีบัญชีอยู่แล้ว หากลืมรหัสผ่านให้ไปที่{" "}
        <Link to="/reset-password" className="text-blue-600 hover:underline">
          Reset Password
        </Link>
        หรือสามารถใช้ Email: chayanon.5723@gmail.com Password: ppond333
      </>
    ),
  },
  {
    q: "ฉันสามารถอัปโหลดรูปภาพสำหรับบทความได้หรือไม่?",
    a: "การอัปโหลดภาพรองรับผ่านหน้าจัดการบทความสำหรับผู้ดูแลระบบ รูปภาพที่อัปโหลดจะเก็บบน Cloudinary หรือโฟลเดอร์เก็บไฟล์ของเซิร์ฟเวอร์ ขึ้นอยู่กับการตั้งค่า",
  },
  {
    q: "มีข้อจำกัดในการคอมเมนต์หรือไม่?",
    a: "ผู้ใช้ต้องล็อกอินก่อนโพสต์คอมเมนต์ ความยาวคอมเมนต์จำกัดไม่เกิน 1000 ตัวอักษร และระบบอาจมีการกรองคำหยาบหรือเนื้อหาที่ไม่เหมาะสม",
  },
  {
    q: "ฉันจะแจ้งบั๊กหรือขอฟีเจอร์ใหม่ได้ที่ไหน?",
    a: "คุณสามารถติดต่อผู้พัฒนาโดยตรงจากหน้า Contact หรือลง issue ใน GitHub repository ของโปรเจค",
  },
];

const Help = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6 sm:p-8">
        <div className="flex items-start sm:items-center justify-between mb-4">
          <div>
            <BackButton className="mb-2" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              ศูนย์ช่วยเหลือ
            </h1>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          รวมคำถามที่พบบ่อยและคำแนะนำการใช้งานเบื้องต้น
          หากต้องการความช่วยเหลือเพิ่มเติม โปรดไปที่หน้า Contact
        </p>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-md overflow-hidden"
            >
              <button
                onClick={() => toggle(i)}
                className="w-full text-left px-4 py-3 bg-white flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-expanded={openIndex === i}
              >
                <span className="text-gray-800 font-medium text-sm sm:text-base">
                  {f.q}
                </span>
                <svg
                  className={
                    openIndex === i ? "w-5 h-5 transform rotate-180" : "w-5 h-5"
                  }
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div
                className={`px-4 overflow-hidden bg-gray-50 transition-all duration-200 ${
                  openIndex === i ? "py-3" : "py-0"
                }`}
                style={{ maxHeight: openIndex === i ? "300px" : "0" }}
              >
                <div className="text-gray-700 text-sm sm:text-base">{f.a}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          ยังไม่เจอคำตอบ? ไปที่หน้า{" "}
          <Link to="/contact" className="text-blue-600 hover:underline">
            Contact
          </Link>{" "}
          เพื่อส่งข้อความถึงผู้พัฒนา
        </div>
      </div>
    </div>
  );
};

export default Help;
