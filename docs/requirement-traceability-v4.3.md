# ตารางตรวจสอบข้อกำหนด KPP Agri Dashboard v4.3.0

วันที่ตรวจสอบ: 31 กรกฎาคม 2569

| ข้อกำหนด | Source / Logic | วิธีตรวจสอบ | ผล |
| --- | --- | --- | --- |
| เนื้อที่เพาะปลูกเป็น Bar chart รายอำเภอและแยกตามปีที่เลือก | `apps/web/src/main.tsx`: `plantedByDistrictYear`, `createDistrictBarOption` | เลือกปีเดียวและหลายปี ตรวจแกน X เป็นอำเภอและ Legend เป็น `พ.ศ. ...` | ผ่าน |
| ผลผลิตเป็น Bar chart ภายใต้เงื่อนไขเดียวกัน | `apps/web/src/main.tsx`: `productionByDistrictYear`, `createDistrictBarOption` | เปลี่ยนปีและอำเภอ ตรวจชุดแท่งและค่าผลผลิตตามตัวกรอง | ผ่าน |
| การรวมข้อมูลแบบอำเภอ × ปีถูกต้อง | `packages/shared/src/index.ts`: `aggregateDistrictYearMetric` | Unit test รวมระเบียนซ้ำในอำเภอ/ปีเดียวกันและเติม 0 เมื่อไม่มีข้อมูล | ผ่าน |
| ค่าบวกเป็นลูกศรขึ้นสีเขียว ค่าลบเป็นลูกศรลงสีแดง | `apps/web/src/main.tsx`: `ChangeValue`; `apps/web/src/styles.css`: `.trend.*` | ตรวจค่า YoY บวก ลบ ศูนย์ และไม่มีฐานปีก่อน | ผ่าน |
| มีแถบปรับขนาดตัวอักษรด้านบน | `apps/web/src/main.tsx`: `fontSize`, accessibility bar | กด `ก− / ก / ก+`, ตรวจ `aria-pressed` และการจดจำใน `localStorage` | ผ่าน |
| ขนาดข้อความในกราฟปรับตามค่าที่เลือก | `chartFontScale` ใน Bar/Donut options | เปลี่ยนขนาดตัวอักษรและตรวจ Legend/axis labels | ผ่าน |
| กราฟรายอำเภออ่านได้บนมือถือ | `.district-chart-wrap`, mobile media query | หน้าจอไม่เกิน 540 px สามารถเลื่อนกราฟแนวนอนเพื่อดูครบ 11 อำเภอ | ผ่าน |
| Google Sheets live data contract | `apps/web/src/dataSource.ts`, `scripts/audit-google-sheet.mjs` | `npm run data:audit` | ผ่าน: 792 ระเบียน, พ.ศ. 2556–2566, 9 พืช |

## ผลการตรวจอัตโนมัติ

- Unit tests: ผ่าน 8/8
- Apps Script pure-function tests: ผ่าน
- TypeScript typecheck: ผ่าน
- Production build: ผ่าน
- Google Sheets live audit: ผ่าน 792 ระเบียน (quality pass 770, warning 22)

## เกณฑ์ยืนยันหลัง Deploy

1. หน้าเว็บต้องแสดง `Dashboard v4.3.0`
2. แถบสถานะต้องแสดง “เชื่อมต่อข้อมูลสดจาก Google Sheets สำเร็จ”
3. เมื่อเลือกหลายปี กราฟทั้งสองต้องมี Legend แยกทุกปีที่เลือก
4. เมื่อเลือกอำเภอเดียว กราฟทั้งสองต้องเหลืออำเภอนั้นเพียงรายการเดียว
5. ปุ่ม `ก− / ก / ก+` ต้องเปลี่ยนขนาดข้อความและคงค่าเมื่อเปิดหน้าใหม่
