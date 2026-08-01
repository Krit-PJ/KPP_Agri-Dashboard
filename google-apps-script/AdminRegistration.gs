/** Secure role requests and two-lane CSV imports (v5). */
const KPP_V5 = Object.freeze({
  roleSheet: '_Admin_Users',
  registrationSheet: 'Registration_Data',
  roles: ['owner', 'admin', 'pending', 'rejected'],
  registrationHeaders: [
    'registration_id','province','district_code','district_name','year_ce','year_be','week_no','month_no',
    'crop_code','crop_name','metric_type','households','plots','area_rai','record_status','import_batch_id',
    'source_file','imported_at','imported_by',
  ],
});

function getAdminAccess() {
  ensureV5Sheets_();
  const email = activeEmail_();
  const role = findRole_(email);
  return {email: email, role: role, canImport: role === 'owner' || role === 'admin'};
}

function requestAssistantAdmin(displayName) {
  ensureV5Sheets_();
  const email = activeEmail_();
  if (!email) throw new Error('ไม่พบอีเมล Google Workspace กรุณาเข้าสู่ระบบด้วยบัญชีหน่วยงาน');
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP_V5.roleSheet);
  const existing = findRoleRow_(email);
  if (existing) return {ok: true, status: existing.role};
  sheet.appendRow([email, cleanText_(displayName) || email, 'pending', new Date(), '', '', '']);
  writeAudit_('ADMIN_REQUEST', 'SYSTEM', email, '', {displayName: displayName});
  return {ok: true, status: 'pending'};
}

function decideAdminRequest(request) {
  assertAdmin_('owner');
  const input = request || {};
  const email = cleanText_(input.email).toLowerCase();
  const decision = input.approve ? 'admin' : 'rejected';
  const found = findRoleRow_(email);
  if (!found) throw new Error('ไม่พบคำขอของ ' + email);
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP_V5.roleSheet);
  sheet.getRange(found.row, 3, 1, 4).setValues([[decision, found.requestedAt, new Date(), activeEmail_()]]);
  writeAudit_('ADMIN_DECISION', 'SYSTEM', email, found.row, {decision: decision});
  return {ok: true, email: email, role: decision};
}

function listAdminRequests() {
  assertAdmin_('owner');
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP_V5.roleSheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getDisplayValues().map(function(row) {
    return {email: row[0], displayName: row[1], role: row[2], requestedAt: row[3], approvedAt: row[4], approvedBy: row[5]};
  });
}

/**
 * request.kind: unified | registration
 * request.csv: UTF-8 CSV text. Registration imports must include cropCode,
 * cropName and metricType (planted/harvested) selected by the admin.
 */
function importCsvV5(request) {
  assertAdmin_();
  const input = request || {};
  if (input.kind === 'unified') return importUnifiedCsv_(input);
  if (input.kind === 'registration') return importRegistrationCsv_(input);
  throw new Error('ประเภทชุดข้อมูลต้องเป็น unified หรือ registration');
}

function importUnifiedCsv_(input) {
  const rows = Utilities.parseCsv(String(input.csv || ''));
  if (rows.length < 2) throw new Error('ไฟล์ CSV ไม่มีข้อมูล');
  const expected = KPP.HEADERS.annual;
  assertCsvHeaders_(rows[0], expected);
  const batch = Utilities.getUuid();
  const sheet = getDataSheet_('annual');
  const normalized = rows.slice(1).filter(nonEmptyRow_).map(function(row) {
    const object = rowToObject_(expected, row);
    const payload = normalizePayload_('annual', object);
    const validation = validatePayload_('annual', payload, null);
    if (!validation.valid) throw new Error(validation.errors.join('\n'));
    return expected.map(function(header) { return buildRecord_('annual', payload, sheet.getLastRow() + 1)[header]; });
  });
  appendRows_(sheet, normalized, expected.length);
  writeAudit_('IMPORT_UNIFIED', 'annual', batch, '', {rows: normalized.length});
  return {ok: true, batchId: batch, rows: normalized.length};
}

function importRegistrationCsv_(input) {
  const cropCode = cleanText_(input.cropCode);
  const cropName = cleanText_(input.cropName);
  const metric = cleanText_(input.metricType).toLowerCase();
  if (!cropCode || !cropName) throw new Error('กรุณาเลือกชนิดพืชก่อนนำเข้า');
  if (['planted','harvested'].indexOf(metric) === -1) throw new Error('กรุณาเลือกพื้นที่ปลูกหรือพื้นที่เก็บเกี่ยว');
  const rows = Utilities.parseCsv(String(input.csv || ''));
  const required = ['NO','จังหวัด/อำเภอ/ตำบล','ปีเดือน/สัปดาห์(order)','ครัวเรือน','แปลง','เนื้อที่(ไร่)'];
  if (rows.length < 2) throw new Error('ไฟล์ CSV ไม่มีข้อมูล');
  assertCsvHeaders_(rows[0], required);
  const batch = Utilities.getUuid();
  const importedAt = new Date();
  const values = rows.slice(1).filter(nonEmptyRow_).filter(function(row) {
    return /^62-\d{2}$/.test(cleanText_(row[0])) && cleanText_(row[0]) !== '62-00';
  }).map(function(row) {
    const period = Number(cleanText_(row[2]));
    const yearCe = Math.floor(period / 100);
    const week = period % 100;
    if (yearCe < 2000 || week < 1 || week > 53) throw new Error('ปี/สัปดาห์ไม่ถูกต้อง: ' + row[2]);
    const districtCode = cleanText_(row[0]);
    const districtName = cleanText_(row[1]).replace(/^\s+/, '');
    const area = parsePositiveNumberV5_(row[5], 'เนื้อที่');
    const month = isoWeekMonthV5_(yearCe, week);
    const id = [districtCode, yearCe, week, cropCode, metric].join('-');
    return [id,'กำแพงเพชร',districtCode,districtName,yearCe,yearCe+543,week,month,cropCode,cropName,metric,
      parsePositiveNumberV5_(row[3],'ครัวเรือน'),parsePositiveNumberV5_(row[4],'แปลง'),area,'published',batch,
      cleanText_(input.sourceFile),importedAt,activeEmail_()];
  });
  if (!values.length) throw new Error('ไม่พบแถวระดับอำเภอ (รหัสรูปแบบ 62-01 ถึง 62-11)');
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP_V5.registrationSheet);
  appendRows_(sheet, values, KPP_V5.registrationHeaders.length);
  writeAudit_('IMPORT_REGISTRATION', 'registration', batch, '', {rows: values.length, crop: cropCode, metric: metric});
  return {ok: true, batchId: batch, rows: values.length};
}

function ensureV5Sheets_() {
  const ss = SpreadsheetApp.getActive();
  let roles = ss.getSheetByName(KPP_V5.roleSheet);
  if (!roles) roles = ss.insertSheet(KPP_V5.roleSheet);
  if (roles.getLastRow() === 0) roles.appendRow(['email','display_name','role','requested_at','approved_at','approved_by','note']);
  let data = ss.getSheetByName(KPP_V5.registrationSheet);
  if (!data) data = ss.insertSheet(KPP_V5.registrationSheet);
  if (data.getLastRow() === 0) data.appendRow(KPP_V5.registrationHeaders);
  roles.hideSheet();
}
function activeEmail_() { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); }
function findRole_(email) { const found = findRoleRow_(email); return found ? found.role : 'viewer'; }
function findRoleRow_(email) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP_V5.roleSheet);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,7).getValues();
  for (let i=0;i<rows.length;i++) if (String(rows[i][0]).toLowerCase() === email) return {row:i+2,role:String(rows[i][2]),requestedAt:rows[i][3]};
  return null;
}
function assertAdmin_(required) {
  ensureV5Sheets_();
  const role = findRole_(activeEmail_());
  if (required === 'owner' && role !== 'owner') throw new Error('เฉพาะผู้ดูแลหลักเท่านั้น');
  if (!required && ['owner','admin'].indexOf(role) === -1) throw new Error('บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแลระบบ');
}
function assertCsvHeaders_(actual, expected) { expected.forEach(function(h,i){ if (cleanText_(actual[i]) !== h) throw new Error('หัวคอลัมน์ไม่ถูกต้อง ตำแหน่ง '+(i+1)+' ต้องเป็น '+h); }); }
function nonEmptyRow_(row) { return row.some(function(cell){ return cleanText_(cell); }); }
function appendRows_(sheet, rows, width) { if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,width).setValues(rows); }
function parsePositiveNumberV5_(value,label) { const n=Number(String(value||'').replace(/,/g,'')); if(!isFinite(n)||n<0) throw new Error(label+' ไม่ใช่ตัวเลขที่ถูกต้อง'); return n; }
function isoWeekMonthV5_(year,week) { return new Date(Date.UTC(year,0,4+(week-1)*7)).getUTCMonth()+1; }
