# การตรวจสอบ Google Sheets Live Data — Dashboard v4.2.0

## สถานะที่ตรวจสอบ

- แหล่งข้อมูล: Google Sheets แท็บ `Annual_Data`
- ผลการเชื่อมต่อ: สำเร็จ
- จำนวนระเบียน: 792
- ช่วงปี พ.ศ.: 2556–2566
- ชนิดพืช: 9 ชนิด (`C01–C09`)
- สถานะเผยแพร่: 792 ระเบียน
- คุณภาพข้อมูล: ผ่าน 770 ระเบียน และควรตรวจสอบ 22 ระเบียน

ผลข้างต้นได้จากคำสั่ง `npm run data:audit` เมื่อวันที่ 31 กรกฎาคม 2569
การตรวจครั้งใหม่อาจได้จำนวนหรือเวลาที่ต่างออกไปหากมีการแก้ข้อมูลใน Google Sheets

## Data Contract ที่แก้ไข

| รหัสใน Google Sheets | รหัสภายใน Dashboard | ชนิดพืช |
| --- | --- | --- |
| C01 | rice_offseason | ข้าวนาปรัง |
| C02 | rice_main | ข้าวนาปี |
| C03 | maize_1 | ข้าวโพดรุ่น 1 |
| C04 | maize_2 | ข้าวโพดรุ่น 2 |
| C05 | cassava | มันสำปะหลัง |
| C06 | oil_palm | ปาล์มน้ำมัน |
| C07 | rubber | ยางพารา |
| C08 | sugarcane | อ้อย |
| C09 | banana_egg | กล้วยไข่ |

## ลำดับแหล่งข้อมูล

1. อ่าน CSV สดจาก Google Sheets ด้วย `cache: no-store`
2. แปลงและตรวจ Data Contract ก่อนส่งให้ Dashboard
3. หากเชื่อมต่อไม่ได้ ใช้ cache รุ่น `v3` ที่ผ่านการตรวจรหัสพืช
4. หากไม่มี cache ที่ใช้ได้ ใช้ JSON snapshot เป็นลำดับสุดท้าย

หน้า Dashboard แสดงสถานะให้ผู้ใช้แยกได้ว่าเป็น `Google Sheets`,
`ข้อมูลล่าสุดในอุปกรณ์` หรือ `ชุดข้อมูลสำรอง`

## เงื่อนไขยอมรับก่อน Deploy

```bash
npm ci
npm run typecheck
npm test
npm run data:audit
npm run build
```

ทุกคำสั่งต้องผ่าน และผล audit ต้องมีพืชครบ 9 ชนิด จากนั้นจึง push ขึ้น `main`
และตรวจ GitHub Actions ให้ขั้น test/build/deploy สำเร็จ

หน้า Production ถือว่าอัปเดตถูกต้องเมื่อแสดง `Dashboard v4.2.0`
และสถานะแหล่งข้อมูลเป็น `Google Sheets` พร้อมจำนวนระเบียนที่ไม่เป็นศูนย์
