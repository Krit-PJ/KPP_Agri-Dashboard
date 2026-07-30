# Data Dictionary

คีย์ธุรกิจข้อมูลรายปีคือ `(district_code, year_be, crop_id)` สำหรับระเบียนที่ยังไม่ถูกลบ

| Field | Type | Description |
|---|---|---|
| record_id | UUID | รหัสถาวรของระเบียน |
| district_code | string | รหัสอำเภอ |
| year_be / year_ce | integer | ปี พ.ศ. / ค.ศ. |
| crop_id | string | รหัสพืชมาตรฐาน |
| planted_area_rai | number/null | พื้นที่เพาะปลูก (ไร่) |
| harvested_area_rai | number/null | พื้นที่เก็บเกี่ยว (ไร่) |
| production_ton | number/null | ผลผลิต (ตัน) |
| calculated_yield_kg_rai | number/null | ผลผลิตคำนวณต่อพื้นที่เก็บเกี่ยว |
| data_status | enum | draft/published/archived |
| quality_status | enum | pass/warning/error |
| source_sheet / source_row | string/integer | ตำแหน่งต้นทาง |
