# ตารางตรวจสอบข้อกำหนด KPP Agri Dashboard v4.4.1

วันที่ตรวจสอบ: 31 กรกฎาคม 2569

| ข้อกำหนด | การดำเนินการ | วิธีตรวจสอบ | ผล |
| --- | --- | --- | --- |
| ระบบต้องเปิดได้แม้ Google Sheets ใช้งานไม่ได้ | เริ่ม React state จาก `bundledSnapshot` และโหลด Google Sheets เบื้องหลัง | Build ต้องมี snapshot; `npm test` ตรวจ 792 ระเบียน; UI ไม่ผูกการ render เริ่มต้นกับคำขอเครือข่าย | ผ่าน |
| fallback ต้องไม่ขึ้นกับ hosting path | import `crop-annual.json` เข้า production bundle ใน `dataSource.ts` | `npm run build` สำเร็จด้วย `base: "./"` และ asset ทุกไฟล์ใช้ relative URL | ผ่าน |
| แสดงสถานะเมื่อใช้ข้อมูลสำรอง | แสดงแถบ `data-connection fallback` พร้อม warning และปุ่มโหลดใหม่ | ตรวจ JSX และ TypeScript | ผ่าน |
| ตรึงตัวเลือกปีไว้ด้านบน | `.year-filter-card { position: sticky; top: 84px }` ใต้เมนู Desktop | ตรวจ CSS production build | ผ่าน |
| รองรับหน้าจอมือถือ | ใช้ `top: 74px` และให้ `.year-options` เลื่อนแนวนอน | ตรวจ media query ที่ความกว้างไม่เกิน 820 px | ผ่าน |
| รักษาความสามารถรุ่น 4.4.0 | กราฟคลิกเลือกปี, `ก / ก+ / ก++`, Admin และ CRUD คงอยู่ | Unit tests, Apps Script tests, TypeScript และ build | ผ่าน |

## สาเหตุที่ Production เปิดไม่ได้ตามที่รายงาน

GitHub Pages ตอบสนองปกติและ asset ทุกไฟล์คืนสถานะ HTTP 200 แต่ JavaScript ที่เผยแพร่จริงยังระบุรุ่น `4.4.0` ไม่ใช่ `4.4.1` จึงยังไม่ได้รับกลไกเริ่ม Dashboard จาก snapshot แบบทันที การแก้ไขจะมีผลเมื่อ push และ deploy Source รุ่น `4.4.1` ผ่าน GitHub Actions สำเร็จแล้ว

## คำสั่งตรวจรับ

```bash
npm test
npm run typecheck
npm run data:audit
npm run build
```
