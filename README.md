# Dashboard สถานการณ์การเพาะปลูกพืช จังหวัดกำแพงเพชร

เว็บ Dashboard แบบ responsive สำหรับข้อมูลพืชเศรษฐกิจ 9 ชนิด 11 อำเภอ พัฒนาด้วย React + TypeScript โดยใช้ GitHub Pages เป็น Frontend และ Google Sheets เป็นฐานข้อมูลหลัก

## เริ่มใช้งานในเครื่อง

```bash
npm install
npm test
npm run dev
```

Dashboard จะอ่านข้อมูลล่าสุดจากชีต `Annual_Data` โดยตรง หาก Google Sheets ไม่พร้อมชั่วคราว ระบบจะใช้ข้อมูล live ล่าสุดที่บันทึกไว้ในอุปกรณ์ และใช้ JSON snapshot เป็น fallback ลำดับสุดท้าย

## สถาปัตยกรรม

```mermaid
flowchart LR
  A["เจ้าหน้าที่"] --> B["Google Sheets / Drive"]
  B -->|"Annual_Data (read-only)"| C["GitHub Pages"]
  C --> D["Dashboard สาธารณะ"]
  A --> E["Container-bound Apps Script"]
  E --> B
```

หน้าเว็บอ่านเฉพาะข้อมูลสาธารณะ ไม่มี service-account key, OAuth secret หรือคำสั่งเขียน การนำเข้า ตรวจสอบ และเผยแพร่ข้อมูลทำใน Google Sheets ผ่าน Container-bound Apps Script ตามสิทธิ์ของเจ้าหน้าที่

## โครงสร้าง

- `apps/web` Dashboard สาธารณะ
- `apps/web/src/dataSource.ts` ตัวเชื่อม Google Sheets, parser, cache และ fallback
- `packages/shared` data contract และสูตรคำนวณร่วม
- `scripts/import` profiling/normalization จาก Excel
- `data/schema` ผล profiling แบบ machine-readable
- `docs` ระเบียบวิธี สถาปัตยกรรม และคู่มือ

โฟลเดอร์ `apps/api` เก็บต้นแบบ API จากระยะก่อนหน้าเพื่ออ้างอิง แต่ไม่อยู่ใน production build ของสถาปัตยกรรม GitHub Pages + Google Sheets

## ตั้งค่าแหล่งข้อมูล

ค่าปริยายชี้ไปยังไฟล์ `KPP Agricultural Data – Google Sheets Ready` และแท็บ `Annual_Data` แล้ว หากต้องการเปลี่ยน ให้คัดลอก `.env.example` เป็น `.env.local` และแก้:

```dotenv
VITE_GOOGLE_SHEET_ID=1lxQ5rS9xHTq_LlFTSQehsJSk-lTk4HzhlS8hq_0t47U
VITE_GOOGLE_SHEET_TAB=Annual_Data
```

ตัวแปรเหล่านี้เป็นรหัสแหล่งข้อมูลสาธารณะ ไม่ใช่ secret

## ตรวจสอบและ Build

```bash
npm run typecheck
npm test
npm run build
```

## Deploy บน GitHub Pages

1. สร้าง GitHub repository และ push โค้ดไปยัง branch `main`
2. เปิด Settings → Pages
3. เลือก Source เป็น `GitHub Actions`
4. Workflow `.github/workflows/ci-pages.yml` จะทดสอบและ deploy `apps/web/dist`
5. ตรวจว่า Google Sheet อนุญาต `Anyone with the link: Viewer`

ไฟล์ JSON ใน `apps/web/public/data` เป็นเพียง snapshot สำรอง ไม่ใช่ฐานข้อมูลหลัก
