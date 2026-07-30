# สถาปัตยกรรม

Frontend เป็น static SPA บน GitHub Pages และอ่าน `Annual_Data` จาก Google Sheets แบบ read-only ผ่าน Google Visualization CSV endpoint ส่วน Google Drive ใช้จัดเก็บไฟล์ต้นทางและไฟล์สำรอง

## ขอบเขตหน้าที่

1. GitHub Pages: แสดงผล กรอง คำนวณ KPI และทำ visualization
2. Google Sheets: ฐานข้อมูลหลัก โดย `Annual_Data` เป็น public read model
3. Google Drive: ไฟล์ต้นทาง สำรอง และเอกสารที่เกี่ยวข้อง
4. Container-bound Apps Script: นำเข้า ตรวจสอบ ทำสำรอง และจัดการสถานะ
5. Frontend cache: เก็บข้อมูล live ล่าสุดใน browser เพื่อรองรับการเชื่อมต่อสะดุด
6. Static JSON snapshot: fallback ลำดับสุดท้ายเท่านั้น

Frontend ห้ามเขียนกลับ Google Sheets และห้ามมี secret ใด ๆ ใน repository ข้อมูลที่ไม่ควรเปิดเผยต้องไม่อยู่ใน `Annual_Data` ที่เผยแพร่สาธารณะ

## ลำดับการอ่านข้อมูล

1. Google Sheets `Annual_Data`
2. ข้อมูล live ล่าสุดใน local storage
3. JSON snapshot ที่มากับ deployment

ตัวเชื่อมข้อมูลตรวจหัวคอลัมน์บังคับ แปลงค่าตัวเลขโดยคงค่าว่างเป็น `null` แปลง `record_status=active` เป็นข้อมูลเผยแพร่ และแปลง `quality_status=valid` เป็นสถานะผ่านสำหรับการแสดงผล
