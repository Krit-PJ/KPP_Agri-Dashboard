# ความปลอดภัย

- ห้ามเก็บ service-account key, OAuth client secret หรือ Drive credential ใน frontend/repository
- จำกัด CORS เฉพาะ origin ที่อนุญาต
- Public API read-only; write API ต้อง authenticated และ authorized
- ตรวจ payload, จำกัดขนาด, rate limit และใช้ security headers
- Redact token/ข้อมูลลับออกจาก structured log และ audit log
- ใช้ user-managed service account และแชร์เฉพาะ Spreadsheet/Drive folder ที่จำเป็น
