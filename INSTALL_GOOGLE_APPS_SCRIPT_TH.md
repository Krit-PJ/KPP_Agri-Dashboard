# ติดตั้งระบบเพิ่ม แก้ไข และลบข้อมูลใน Google Sheet

ไฟล์เป้าหมาย:

`KPP Agricultural Data – Google Sheets Ready`

ระบบนี้เป็น Container-bound Google Apps Script จึงต้องผูกกับ Google Sheet เป้าหมาย
หนึ่งครั้ง หลังติดตั้งแล้วเจ้าหน้าที่ใช้เมนูใน Sheet ได้ทันที ไม่ต้อง Deploy Web App
และไม่ต้องตั้งค่า API URL ใน GitHub

## ไฟล์ที่ใช้

- `google-apps-script/Code.gs`
- `google-apps-script/Sidebar.html`
- `google-apps-script/appsscript.json`

## ขั้นตอนติดตั้ง

1. เปิด Google Sheet เป้าหมายด้วยบัญชีที่เป็นเจ้าของหรือ Editor
2. เลือก `ส่วนขยาย > Apps Script`
3. เปิดไฟล์ `Code.gs` ใน Apps Script Editor ลบโค้ดตัวอย่าง แล้ววางเนื้อหาจาก
   `google-apps-script/Code.gs`
4. กดเครื่องหมาย `+` ข้าง Files เลือก `HTML` ตั้งชื่อ `Sidebar` แล้ววางเนื้อหา
   จาก `google-apps-script/Sidebar.html`
5. เปิด `Project Settings` แล้วเปิดตัวเลือก `Show "appsscript.json" manifest file
   in editor`
6. กลับไปหน้า Editor เปิด `appsscript.json` และแทนที่ด้วยไฟล์
   `google-apps-script/appsscript.json`
7. กดบันทึก เลือกฟังก์ชัน `installSystem` แล้วกด `Run`
8. เลือกบัญชี Google และอนุญาตสิทธิ์ Google Sheets, Google Drive และอีเมลผู้ใช้
9. กลับไปเปิด Google Sheet ใหม่
10. เลือกเมนู `ระบบข้อมูลการเกษตร > เปิดระบบเพิ่ม/แก้ไข/ลบข้อมูล`

## ผลหลังติดตั้ง

ระบบสร้างชีตภายในสองชีตและซ่อนไว้อัตโนมัติ:

- `_Audit_Log` บันทึกผู้ใช้ เวลา และกิจกรรม
- `_Row_Backups` สำรองข้อมูลเดิมก่อนแก้ไข เก็บถาวร หรือลบ

Sidebar รองรับ:

- เพิ่มและแก้ไขข้อมูลรายปี
- เพิ่มและแก้ไขข้อมูลรายเดือน
- ค้นหาและแบ่งหน้า
- เก็บถาวรและกู้คืน
- ลบถาวรด้วยการพิมพ์รหัสยืนยัน
- ตรวจ Record ID และ Business Key ซ้ำ
- สำรอง Google Sheet ทั้งไฟล์ใน Google Drive

## แนวทางลบข้อมูล

ใช้ `เก็บ` เป็นวิธีปกติ ข้อมูลจะเปลี่ยนเป็น `archived` และหายจาก Dashboard แต่ยัง
กู้คืนได้ ใช้ `ลบ` เฉพาะเมื่อต้องการลบแถวจริง ระบบจะสำรองข้อมูลเดิมไว้ก่อนเสมอ

## การอัปเดตโค้ดในอนาคต

แทนที่ `Code.gs` หรือ `Sidebar.html` ด้วยไฟล์รุ่นใหม่ กดบันทึก แล้วเปิด Google Sheet
ใหม่ ไม่ต้องรัน `installSystem` ซ้ำ เว้นแต่มีการแจ้งให้ติดตั้ง/ซ่อมแซมโครงสร้างระบบ
