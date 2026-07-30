# KPP Sheet Data Manager

ระบบหลังบ้านแบบ Container-bound Apps Script สำหรับไฟล์ `KPP Agricultural Data – Google Sheets Ready`

ความสามารถ:

- เพิ่ม แก้ไข ค้นหา และแบ่งหน้าข้อมูล `Annual_Data` และ `Monthly_Data`
- เก็บถาวร/กู้คืนข้อมูลโดยเปลี่ยน `record_status`
- ลบถาวรโดยบังคับพิมพ์รหัสยืนยัน
- สำรองค่าก่อนแก้ไข เก็บถาวร และลบ ลง `_Row_Backups`
- บันทึกกิจกรรมลง `_Audit_Log`
- ป้องกัน Record ID และ Business Key ซ้ำ
- ตรวจรหัสพืชและอำเภอกับตารางมิติ
- คำนวณสูตรและสถานะคุณภาพให้อัตโนมัติ
- สำรอง Google Sheet ทั้งไฟล์ไปยังโฟลเดอร์เดียวกันใน Google Drive

## ติดตั้งครั้งแรก

1. เปิด Google Sheet เป้าหมาย
2. เลือก `ส่วนขยาย > Apps Script`
3. แทนที่เนื้อหา `Code.gs` ด้วยไฟล์ `Code.gs` ชุดนี้
4. เพิ่มไฟล์ HTML ชื่อ `Sidebar` แล้ววางเนื้อหาจาก `Sidebar.html`
5. เปิด Project Settings และเลือกแสดงไฟล์ manifest จากนั้นแทนที่ `appsscript.json`
6. บันทึก และรันฟังก์ชัน `installSystem` หนึ่งครั้ง
7. อนุญาตสิทธิ์ Google Sheets, Google Drive และอีเมลผู้ใช้
8. เปิด Google Sheet ใหม่ แล้วใช้เมนู `ระบบข้อมูลการเกษตร`

ไม่ต้อง Deploy เป็น Web App และไม่ต้องนำ URL ของ Apps Script ไปใส่ใน GitHub Frontend

## การลบ

- `เก็บ`: เปลี่ยน `record_status` เป็น `archived` ข้อมูลจะไม่แสดงบน Dashboard แต่กู้คืนได้
- `ลบ`: ลบแถวจริงหลังพิมพ์รหัสยืนยัน โดยระบบสำรอง JSON ของแถวเดิมไว้ใน `_Row_Backups` ก่อนเสมอ

## Business Key

- รายปี: `year_be + crop_code + district_code`
- รายเดือน: `year_be + crop_code + district_code + month_number`

## หมายเหตุด้านสิทธิ์

Sidebar ทำงานจาก Google Sheet และใช้สิทธิ์ของผู้ใช้ที่เปิดไฟล์ จึงให้สิทธิ์ `Editor` เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาต ส่วนผู้ชม Dashboard ใช้ข้อมูลแบบ read-only ผ่าน GitHub Pages
