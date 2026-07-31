# ตารางตรวจสอบข้อกำหนด Dashboard v4.4.0

| ข้อกำหนด | การดำเนินการ | ตำแหน่ง |
| --- | --- | --- |
| ขนาดตัวอักษร `ก / ก+ / ก++` | สามระดับ 100%, 115%, 130% จดจำด้วย local storage และปรับตัวอักษร ECharts | `apps/web/src/main.tsx`, `apps/web/src/styles.css` |
| คลิก Bar Graph เพื่อ Active ปี | ทุก series มีรหัสปี คลิกแท่งแล้วกำหนดตัวกรองปีเป็นปีเดียว อัปเดต Dashboard ทั้งหน้า | `Chart`, `activateYearFromChart` ใน `apps/web/src/main.tsx` |
| รองรับการเข้าถึงโดยไม่ใช้เมาส์ | เพิ่มปุ่มปีใต้กราฟและข้อความสถานะแบบ `aria-live` | `apps/web/src/main.tsx` |
| ระบบ Admin | Container-bound Apps Script ใช้สิทธิ์ Editor ของ Google Sheet ไม่เปิด write API สาธารณะ | `google-apps-script/Code.gs`, `Sidebar.html` |
| Admin เพิ่ม/แก้ไขข้อมูล | ตรวจฟิลด์บังคับ รหัสมิติ ตัวเลขติดลบ และ Business Key ซ้ำก่อนบันทึก | `saveRecord`, `validatePayload_` |
| Admin เก็บ/กู้คืน/ลบ | Soft delete เป็นค่าปกติ; ลบถาวรต้องพิมพ์รหัสและสำรองแถวก่อน | `archiveRecord`, `restoreRecord`, `deleteRecordPermanently` |
| Admin ภาพรวม/ตัวกรอง | สรุปจำนวนตามสถานะและกรอง `active/draft/archived` | `getSystemSummary`, `listRecords`, `Sidebar.html` |
| ตรวจสอบย้อนหลัง | `_Audit_Log`, `_Row_Backups` และสำรองไฟล์ไป Google Drive | `writeAudit_`, `backupRow_`, `createFullBackup` |

## สถาปัตยกรรมความปลอดภัย

Dashboard สาธารณะอ่าน `Annual_Data` แบบ read-only เท่านั้น การเขียนข้อมูลทำภายใน
Google Sheet ผ่าน Container-bound Apps Script และสิทธิ์บัญชี Google ของเจ้าหน้าที่
จึงไม่มีรหัสผ่าน OAuth secret หรือ write token อยู่ใน Frontend
