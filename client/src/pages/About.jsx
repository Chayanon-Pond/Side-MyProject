import React from "react";
import BackButton from "../Components/ui/BackButton";

const About = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-6 sm:p-10">
      <BackButton className="mb-4" />

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">
        เกี่ยวกับโปรเจค
      </h1>

      <p className="text-gray-700 mb-6 text-sm sm:text-base">
        โปรเจคนี้เป็นเว็บไซต์ที่เกี่ยวกับรถยนต์ สำหรับแสดงบทความ ข่าวสาร
        และรายละเอียดรถรุ่นต่างๆ โดยมุ่งเน้นไปที่การนำเสนอข้อมูลคุณภาพ
        รูปภาพประกอบ และการแชร์ข้อมูลระหว่างผู้ใช้
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            คุณสมบัติหลัก
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm sm:text-base">
            <li>อ่านบทความและรายละเอียดรถยนต์ (รีวิว, ข้อมูลเทคนิค, รูปภาพ)</li>
            <li>ระบบคอมเมนต์และการตอบกลับเพื่อแลกเปลี่ยนความคิดเห็น</li>
            <li>ระบบการแจ้งเตือนสำหรับคอนเทนต์ใหม่</li>
            <li>บัญชีผู้ใช้: ลงชื่อเข้าใช้, ลงทะเบียน, รีเซ็ตรหัสผ่าน</li>
            <li>ส่วนจัดการสำหรับผู้ดูแลระบบ (เพิ่ม/แก้ไข/ลบบทความ)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            เทคโนโลยีที่ใช้
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm sm:text-base">
            <li>Frontend: React + Vite + Tailwind CSS</li>
            <li>Backend: Node.js (Express) และฐานข้อมูล PostgreSQL</li>
            <li>การอัปโหลดรูปภาพ: Cloudinary หรือไฟล์เซิร์ฟเวอร์</li>
            <li>การตรวจสอบสิทธิ์: JWT</li>
          </ul>
        </div>
      </div>

      <p className="text-gray-700 text-sm sm:text-base">
        หากต้องการความช่วยเหลือเพิ่มเติม หรือต้องการเสนอฟีเจอร์ใหม่
        สามารถติดต่อผู้พัฒนาได้ผ่านหน้า Contact หรือสร้าง issue ใน repository
      </p>
    </div>
  </div>
);

export default About;
