# คู่มือผู้ดูแลระบบ

Dashboard สาธารณะอ่านข้อมูลจริงจาก `Annual_Data` ใน Google Sheets แบบ read-only ปุ่ม “สำหรับเจ้าหน้าที่” เปิดไฟล์ Google Sheet โดยตรงและอาศัยสิทธิ์บัญชี Google ที่กำหนดใน Drive

ขั้นตอนนำเข้าที่กำหนดไว้:

`Upload → Preview/Mapping → Validate → Commit → Review → Publish`

ใช้ Container-bound Apps Script ภายใน Spreadsheet สำหรับเมนูนำเข้า ตรวจข้อมูลซ้ำ สร้าง Quality Report สำรองข้อมูล และเปลี่ยนสถานะ ห้ามใช้ Frontend เขียนข้อมูลกลับ Sheet โดยตรง

ข้อกำหนดสำคัญ:

- ห้ามเปลี่ยนชื่อหัวคอลัมน์ใน `Annual_Data`
- ใช้ `year_be + crop_code + district_code` เป็น Business Key
- `record_id` ต้องไม่ซ้ำ
- ค่าว่างหมายถึงไม่มีข้อมูล ห้ามแทนด้วยศูนย์
- ตรวจ `Quality_Issues` ก่อนเผยแพร่
- ทำสำรองก่อนการนำเข้าแบบแทนที่หรือการแก้ไขจำนวนมาก
