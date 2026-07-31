/**
 * KPP Sheet Data Manager
 * Container-bound Google Apps Script for:
 * - Annual_Data / Monthly_Data CRUD
 * - validation and duplicate protection
 * - row-level backups and audit log
 * - full Google Drive backups
 *
 * Install this project from Extensions > Apps Script in the production workbook.
 */

const KPP = Object.freeze({
  VERSION: '1.1.0',
  PROVINCE: 'กำแพงเพชร',
  SHEETS: Object.freeze({
    annual: 'Annual_Data',
    monthly: 'Monthly_Data',
    crops: 'Dim_Crop',
    districts: 'Dim_District',
    audit: '_Audit_Log',
    rowBackups: '_Row_Backups',
  }),
  STATUS: Object.freeze(['active', 'draft', 'archived']),
  MONTHS: Object.freeze([
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ]),
  HEADERS: Object.freeze({
    annual: Object.freeze([
      'record_id', 'province', 'district_code', 'district_name', 'year_be', 'year_ce',
      'crop_code', 'crop_name', 'planted_area_rai', 'harvested_area_rai', 'production_ton',
      'source_yield_planted_kg_per_rai', 'source_yield_harvested_kg_per_rai',
      'calculated_yield_harvested_kg_per_rai', 'yield_variance_pct', 'quality_status',
      'quality_note', 'record_status', 'source_sheet', 'source_row',
    ]),
    monthly: Object.freeze([
      'monthly_record_id', 'province', 'district_code', 'district_name', 'year_be', 'year_ce',
      'month_number', 'month_name_th', 'crop_code', 'crop_name', 'farmer_households',
      'planted_area_rai', 'quality_note', 'quality_status', 'record_status', 'source_sheet',
      'source_row',
    ]),
  }),
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ระบบข้อมูลการเกษตร')
    .addItem('เปิดระบบเพิ่ม/แก้ไข/ลบข้อมูล', 'showDataManager')
    .addSeparator()
    .addItem('ตรวจสอบความถูกต้องของข้อมูล', 'runIntegrityCheckFromMenu')
    .addItem('สำรองไฟล์ไปยัง Google Drive', 'createFullBackupFromMenu')
    .addSeparator()
    .addItem('ติดตั้ง/ซ่อมแซมระบบ', 'installSystem')
    .addToUi();
}

function installSystem() {
  assertProductionWorkbook_();
  ensureSystemSheets_();
  PropertiesService.getDocumentProperties().setProperties({
    KPP_DATA_MANAGER_VERSION: KPP.VERSION,
    KPP_INSTALLED_AT: new Date().toISOString(),
  });
  writeAudit_('INSTALL', 'SYSTEM', '', '', {version: KPP.VERSION});
  SpreadsheetApp.getUi().alert(
    'ติดตั้งสำเร็จ',
    'ระบบเพิ่ม แก้ไข ลบ ตรวจสอบ และสำรองข้อมูลพร้อมใช้งานแล้ว กรุณาเปิดไฟล์ Google Sheet ใหม่หนึ่งครั้ง',
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function showDataManager() {
  assertProductionWorkbook_();
  ensureSystemSheets_();
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('จัดการข้อมูลการเกษตร')
    .setWidth(430);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getBootstrap() {
  assertProductionWorkbook_();
  ensureSystemSheets_();
  return {
    version: KPP.VERSION,
    userEmail: Session.getActiveUser().getEmail() || 'ผู้ใช้ Google Sheet',
    crops: readDimension_(KPP.SHEETS.crops, 'crop_code', 'crop_name'),
    districts: readDimension_(KPP.SHEETS.districts, 'district_code', 'district_name'),
    months: KPP.MONTHS.map((name, index) => ({code: index + 1, name: name})),
    statuses: KPP.STATUS.slice(),
    summary: getSystemSummary(),
  };
}

function getSystemSummary() {
  assertProductionWorkbook_();
  return {
    annual: summarizeSheet_('annual'),
    monthly: summarizeSheet_('monthly'),
  };
}

function listRecords(request) {
  assertProductionWorkbook_();
  const input = request || {};
  const type = normalizeType_(input.type);
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(input.pageSize) || 25));
  const search = String(input.search || '').trim().toLowerCase();
  const status = cleanText_(input.status).toLowerCase();
  if (status && KPP.STATUS.indexOf(status) === -1) throw new Error('ตัวกรองสถานะไม่ถูกต้อง');
  const sheet = getDataSheet_(type);
  const headers = getHeaders_(sheet);
  const idHeader = type === 'annual' ? 'record_id' : 'monthly_record_id';
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {rows: [], total: 0, page: 1, pageSize: pageSize};

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const records = values.map(function(row, offset) {
    const data = rowToObject_(headers, row);
    data._rowNumber = offset + 2;
    return data;
  }).filter(function(record) {
    if (!record[idHeader]) return false;
    if (status && cleanText_(record.record_status).toLowerCase() !== status) return false;
    if (!search) return true;
    return [
      record[idHeader], record.district_name, record.crop_name, record.year_be,
      record.month_name_th, record.record_status,
    ].some(function(value) {
      return String(value || '').toLowerCase().indexOf(search) !== -1;
    });
  }).reverse();

  const total = records.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const start = (safePage - 1) * pageSize;
  return {
    rows: records.slice(start, start + pageSize),
    total: total,
    page: safePage,
    pageSize: pageSize,
  };
}

function summarizeSheet_(type) {
  const sheet = getDataSheet_(type);
  const headers = getHeaders_(sheet);
  const statusColumn = headers.indexOf('record_status');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return summarizeStatuses_([]);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  return summarizeStatuses_(values.filter(function(row) {
    return row[0];
  }).map(function(row) {
    return row[statusColumn];
  }));
}

function summarizeStatuses_(statuses) {
  const summary = {total: 0, active: 0, draft: 0, archived: 0};
  (statuses || []).forEach(function(value) {
    summary.total += 1;
    const status = cleanText_(value).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
  });
  return summary;
}

function getRecord(request) {
  assertProductionWorkbook_();
  const input = request || {};
  const type = normalizeType_(input.type);
  const id = cleanText_(input.id);
  if (!id) throw new Error('ไม่พบรหัสระเบียน');
  const found = findRecord_(type, id);
  if (!found) throw new Error('ไม่พบระเบียน ' + id);
  return found.data;
}

function saveRecord(request) {
  assertProductionWorkbook_();
  const input = request || {};
  const type = normalizeType_(input.type);
  const payload = normalizePayload_(type, input.data || {});
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    ensureSystemSheets_();
    const sheet = getDataSheet_(type);
    const existingId = type === 'annual' ? payload.record_id : payload.monthly_record_id;
    const existing = existingId ? findRecord_(type, existingId) : null;
    const validation = validatePayload_(type, payload, existing ? existing.rowNumber : null);
    if (!validation.valid) throw new Error(validation.errors.join('\n'));

    const rowNumber = existing ? existing.rowNumber : nextWritableRow_(sheet);
    const action = existing ? 'UPDATE' : 'CREATE';
    if (existing) backupRow_(type, action, existing.rowNumber, existing.data);
    prepareTargetRow_(sheet, rowNumber);

    const record = buildRecord_(type, payload, rowNumber);
    const headers = KPP.HEADERS[type];
    sheet.getRange(rowNumber, 1, 1, headers.length)
      .setValues([headers.map(function(header) { return record[header]; })]);
    SpreadsheetApp.flush();
    writeAudit_(action, type, record[headers[0]], rowNumber, {
      businessKey: businessKey_(type, record),
    });
    return {ok: true, action: action, id: record[headers[0]], rowNumber: rowNumber};
  } finally {
    lock.releaseLock();
  }
}

function archiveRecord(request) {
  return changeRecordStatus_(request, 'archived', 'ARCHIVE');
}

function restoreRecord(request) {
  return changeRecordStatus_(request, 'active', 'RESTORE');
}

function deleteRecordPermanently(request) {
  assertProductionWorkbook_();
  const input = request || {};
  const type = normalizeType_(input.type);
  const id = cleanText_(input.id);
  if (String(input.confirmation || '') !== id) {
    throw new Error('กรุณายืนยันการลบด้วยรหัสระเบียนให้ตรงกัน');
  }
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const found = findRecord_(type, id);
    if (!found) throw new Error('ไม่พบระเบียน ' + id);
    backupRow_(type, 'DELETE', found.rowNumber, found.data);
    found.sheet.deleteRow(found.rowNumber);
    writeAudit_('DELETE', type, id, found.rowNumber, {permanent: true});
    return {ok: true, id: id};
  } finally {
    lock.releaseLock();
  }
}

function runIntegrityCheck() {
  assertProductionWorkbook_();
  const result = {
    checkedAt: new Date().toISOString(),
    annual: inspectDataSheet_('annual'),
    monthly: inspectDataSheet_('monthly'),
  };
  writeAudit_('INTEGRITY_CHECK', 'SYSTEM', '', '', result);
  return result;
}

function runIntegrityCheckFromMenu() {
  const result = runIntegrityCheck();
  const total = result.annual.issueCount + result.monthly.issueCount;
  SpreadsheetApp.getUi().alert(
    total === 0 ? 'ตรวจสอบผ่าน' : 'พบรายการที่ต้องตรวจสอบ',
    'Annual_Data: ' + result.annual.issueCount + ' รายการ\n' +
      'Monthly_Data: ' + result.monthly.issueCount + ' รายการ',
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function createFullBackup() {
  assertProductionWorkbook_();
  const spreadsheet = SpreadsheetApp.getActive();
  const sourceFile = DriveApp.getFileById(spreadsheet.getId());
  const parents = sourceFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const stamp = Utilities.formatDate(new Date(), KPP_TIMEZONE_(), 'yyyyMMdd-HHmmss');
  const copy = sourceFile.makeCopy(spreadsheet.getName() + ' - Backup ' + stamp, parent);
  writeAudit_('FULL_BACKUP', 'SYSTEM', copy.getId(), '', {url: copy.getUrl()});
  return {ok: true, name: copy.getName(), url: copy.getUrl()};
}

function createFullBackupFromMenu() {
  const result = createFullBackup();
  SpreadsheetApp.getUi().alert(
    'สำรองข้อมูลสำเร็จ',
    result.name + '\n' + result.url,
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function changeRecordStatus_(request, status, action) {
  assertProductionWorkbook_();
  const input = request || {};
  const type = normalizeType_(input.type);
  const id = cleanText_(input.id);
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const found = findRecord_(type, id);
    if (!found) throw new Error('ไม่พบระเบียน ' + id);
    backupRow_(type, action, found.rowNumber, found.data);
    const column = found.headers.indexOf('record_status') + 1;
    found.sheet.getRange(found.rowNumber, column).setValue(status);
    writeAudit_(action, type, id, found.rowNumber, {status: status});
    return {ok: true, id: id, status: status};
  } finally {
    lock.releaseLock();
  }
}

function validatePayload_(type, payload, excludeRow) {
  const errors = [];
  const year = toNumberOrNull_(payload.year_be);
  if (!Number.isInteger(year) || year < 2400 || year > 2700) {
    errors.push('ปี พ.ศ. ต้องเป็นจำนวนเต็มระหว่าง 2400–2700');
  }
  if (!cleanText_(payload.district_code)) errors.push('กรุณาเลือกอำเภอ');
  if (!cleanText_(payload.crop_code)) errors.push('กรุณาเลือกชนิดพืช');
  if (KPP.STATUS.indexOf(cleanText_(payload.record_status) || 'active') === -1) {
    errors.push('สถานะระเบียนไม่ถูกต้อง');
  }

  const numericFields = type === 'annual'
    ? ['planted_area_rai', 'harvested_area_rai', 'production_ton',
      'source_yield_planted_kg_per_rai', 'source_yield_harvested_kg_per_rai']
    : ['farmer_households', 'planted_area_rai'];
  numericFields.forEach(function(field) {
    const value = toNumberOrNull_(payload[field]);
    if (value !== null && value < 0) errors.push(field + ' ห้ามติดลบ');
  });

  if (type === 'monthly') {
    const month = toNumberOrNull_(payload.month_number);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push('เดือนต้องอยู่ระหว่าง 1–12');
    }
  }

  if (!dimensionExists_(KPP.SHEETS.districts, 'district_code', payload.district_code)) {
    errors.push('รหัสอำเภอไม่อยู่ใน Dim_District');
  }
  if (!dimensionExists_(KPP.SHEETS.crops, 'crop_code', payload.crop_code)) {
    errors.push('รหัสพืชไม่อยู่ใน Dim_Crop');
  }
  if (errors.length === 0 && hasDuplicateBusinessKey_(type, payload, excludeRow)) {
    errors.push('ข้อมูลซ้ำ: Business Key นี้มีอยู่แล้วในระบบ');
  }
  return {valid: errors.length === 0, errors: errors};
}

function normalizePayload_(type, data) {
  const payload = {};
  Object.keys(data || {}).forEach(function(key) {
    payload[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
  });
  payload.year_be = toNumberOrNull_(payload.year_be);
  payload.district_code = cleanText_(payload.district_code);
  payload.crop_code = cleanText_(payload.crop_code);
  payload.record_status = cleanText_(payload.record_status) || 'active';
  payload.source_sheet = cleanText_(payload.source_sheet) || 'Data Manager';
  payload.source_row = toNumberOrNull_(payload.source_row);
  if (type === 'annual') {
    [
      'planted_area_rai', 'harvested_area_rai', 'production_ton',
      'source_yield_planted_kg_per_rai', 'source_yield_harvested_kg_per_rai',
    ].forEach(function(key) { payload[key] = toNumberOrNull_(payload[key]); });
    payload.record_id = cleanText_(payload.record_id);
  } else {
    payload.month_number = toNumberOrNull_(payload.month_number);
    payload.farmer_households = toNumberOrNull_(payload.farmer_households);
    payload.planted_area_rai = toNumberOrNull_(payload.planted_area_rai);
    payload.monthly_record_id = cleanText_(payload.monthly_record_id);
  }
  return payload;
}

function buildRecord_(type, payload, rowNumber) {
  const district = dimensionByCode_(KPP.SHEETS.districts, 'district_code', payload.district_code);
  const crop = dimensionByCode_(KPP.SHEETS.crops, 'crop_code', payload.crop_code);
  const year = Number(payload.year_be);
  const record = Object.assign({}, payload, {
    province: KPP.PROVINCE,
    district_name: district.district_name,
    crop_name: crop.crop_name,
    year_ce: '=E' + rowNumber + '-543',
    source_row: payload.source_row === null ? '' : payload.source_row,
  });

  if (type === 'annual') {
    record.record_id = payload.record_id ||
      ['ANN', year, payload.crop_code, payload.district_code].join('-');
    record.calculated_yield_harvested_kg_per_rai =
      '=IF(J' + rowNumber + '=0,IF(K' + rowNumber + '=0,0,""),K' + rowNumber + '*1000/J' + rowNumber + ')';
    record.yield_variance_pct =
      '=IF(OR(M' + rowNumber + '="",M' + rowNumber + '=0,N' + rowNumber + '=""),"",ABS(N' + rowNumber + '-M' + rowNumber + ')/M' + rowNumber + ')';
    record.quality_status =
      '=IF(OR(J' + rowNumber + '>I' + rowNumber + ',AND(ISNUMBER(O' + rowNumber + '),O' + rowNumber + '>0.05)),"warning","valid")';
    record.quality_note =
      '=IF(J' + rowNumber + '>I' + rowNumber + ',"harvested_area_gt_planted_area","")' +
      '&IF(AND(O' + rowNumber + '<>"",O' + rowNumber + '>0.05),IF(J' + rowNumber + '>I' + rowNumber + ',"; ","")&"yield_variance_gt_5pct","")';
  } else {
    record.monthly_record_id = payload.monthly_record_id ||
      ['MON', year, pad2_(payload.month_number), payload.crop_code, payload.district_code].join('-');
    record.month_name_th = KPP.MONTHS[Number(payload.month_number) - 1];
    record.quality_note =
      '=IF($A' + rowNumber + '="","",IF(OR(K' + rowNumber + '="",L' + rowNumber + '=""),"missing_farmer_households_or_planted_area",""))';
    record.quality_status =
      '=IF($A' + rowNumber + '="","",IF(OR(K' + rowNumber + '="",L' + rowNumber + '=""),"incomplete","valid"))';
  }
  return record;
}

function inspectDataSheet_(type) {
  const sheet = getDataSheet_(type);
  const headers = getHeaders_(sheet);
  const idHeader = type === 'annual' ? 'record_id' : 'monthly_record_id';
  const lastRow = sheet.getLastRow();
  const values = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const seenIds = {};
  const seenKeys = {};
  const issues = [];
  values.forEach(function(row, offset) {
    const data = rowToObject_(headers, row);
    const rowNumber = offset + 2;
    const id = data[idHeader];
    if (!id) return;
    const key = businessKey_(type, data);
    if (seenIds[id]) issues.push({row: rowNumber, issue: 'duplicate_id', value: id});
    if (seenKeys[key]) issues.push({row: rowNumber, issue: 'duplicate_business_key', value: key});
    seenIds[id] = true;
    seenKeys[key] = true;
    if (!data.year_be || !data.crop_code || !data.district_code) {
      issues.push({row: rowNumber, issue: 'missing_required_value', value: id});
    }
  });
  return {recordCount: values.filter(function(row) { return row[0]; }).length, issueCount: issues.length, issues: issues.slice(0, 100)};
}

function hasDuplicateBusinessKey_(type, payload, excludeRow) {
  const sheet = getDataSheet_(type);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const target = businessKey_(type, payload);
  return values.some(function(row, offset) {
    const rowNumber = offset + 2;
    return rowNumber !== excludeRow && row[0] && businessKey_(type, rowToObject_(headers, row)) === target;
  });
}

function businessKey_(type, data) {
  const parts = [String(data.year_be || ''), cleanText_(data.crop_code), cleanText_(data.district_code)];
  if (type === 'monthly') parts.push(String(Number(data.month_number) || ''));
  return parts.join('|');
}

function findRecord_(type, id) {
  const sheet = getDataSheet_(type);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < idValues.length; index += 1) {
    if (idValues[index][0] === id) {
      const rowNumber = index + 2;
      // Use raw/effective values so numeric fields can be loaded back into HTML
      // number inputs without locale separators such as "1,318".
      const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
      return {sheet: sheet, headers: headers, rowNumber: rowNumber, data: rowToObject_(headers, values)};
    }
  }
  return null;
}

function prepareTargetRow_(sheet, rowNumber) {
  if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rowNumber - sheet.getMaxRows());
  const lastDataRow = Math.min(sheet.getLastRow(), rowNumber - 1);
  if (lastDataRow >= 2 && rowNumber > sheet.getLastRow()) {
    const width = getHeaders_(sheet).length;
    sheet.getRange(lastDataRow, 1, 1, width).copyTo(
      sheet.getRange(rowNumber, 1, 1, width),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false,
    );
    sheet.getRange(lastDataRow, 1, 1, width).copyTo(
      sheet.getRange(rowNumber, 1, 1, width),
      SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
      false,
    );
  }
}

function nextWritableRow_(sheet) {
  return Math.max(2, sheet.getLastRow() + 1);
}

function ensureSystemSheets_() {
  const spreadsheet = SpreadsheetApp.getActive();
  let audit = spreadsheet.getSheetByName(KPP.SHEETS.audit);
  if (!audit) {
    audit = spreadsheet.insertSheet(KPP.SHEETS.audit);
    audit.getRange(1, 1, 1, 8).setValues([[
      'timestamp', 'user_email', 'action', 'data_type', 'record_id', 'row_number', 'details_json', 'version',
    ]]).setFontWeight('bold');
    audit.setFrozenRows(1);
    audit.hideSheet();
  }
  let backups = spreadsheet.getSheetByName(KPP.SHEETS.rowBackups);
  if (!backups) {
    backups = spreadsheet.insertSheet(KPP.SHEETS.rowBackups);
    backups.getRange(1, 1, 1, 8).setValues([[
      'timestamp', 'user_email', 'action', 'data_type', 'record_id', 'original_row', 'row_json', 'version',
    ]]).setFontWeight('bold');
    backups.setFrozenRows(1);
    backups.hideSheet();
  }
}

function backupRow_(type, action, rowNumber, data) {
  ensureSystemSheets_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP.SHEETS.rowBackups);
  const idHeader = type === 'annual' ? 'record_id' : 'monthly_record_id';
  sheet.appendRow([
    new Date(), Session.getActiveUser().getEmail() || '', action, type,
    data[idHeader] || '', rowNumber, JSON.stringify(data), KPP.VERSION,
  ]);
}

function writeAudit_(action, type, id, rowNumber, details) {
  ensureSystemSheets_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(KPP.SHEETS.audit);
  sheet.appendRow([
    new Date(), Session.getActiveUser().getEmail() || '', action, type,
    id || '', rowNumber || '', JSON.stringify(details || {}), KPP.VERSION,
  ]);
}

function getDataSheet_(type) {
  const name = KPP.SHEETS[type];
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีต ' + name);
  const expected = KPP.HEADERS[type];
  const actual = getHeaders_(sheet);
  const missing = expected.filter(function(header) { return actual.indexOf(header) === -1; });
  if (missing.length) throw new Error(name + ' ขาดหัวคอลัมน์: ' + missing.join(', '));
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
}

function readDimension_(sheetName, codeHeader, nameHeader) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีต ' + sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues()
    .map(function(row) { return rowToObject_(headers, row); })
    .filter(function(row) { return row[codeHeader] && row.record_status !== 'archived'; })
    .map(function(row) { return {code: row[codeHeader], name: row[nameHeader]}; });
}

function dimensionByCode_(sheetName, codeHeader, code) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('ไม่พบข้อมูลมิติใน ' + sheetName);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    const row = rowToObject_(headers, values[index]);
    if (row[codeHeader] === code) return row;
  }
  throw new Error('ไม่พบรหัส ' + code + ' ใน ' + sheetName);
}

function dimensionExists_(sheetName, codeHeader, code) {
  try {
    dimensionByCode_(sheetName, codeHeader, cleanText_(code));
    return true;
  } catch (error) {
    return false;
  }
}

function rowToObject_(headers, row) {
  const result = {};
  headers.forEach(function(header, index) {
    if (header) result[header] = row[index] === undefined ? '' : row[index];
  });
  return result;
}

function normalizeType_(type) {
  const value = String(type || '').toLowerCase();
  if (value !== 'annual' && value !== 'monthly') throw new Error('ประเภทข้อมูลไม่ถูกต้อง');
  return value;
}

function cleanText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function toNumberOrNull_(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function pad2_(value) {
  return String(Number(value)).padStart(2, '0');
}

function KPP_TIMEZONE_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'Asia/Bangkok';
}

function assertProductionWorkbook_() {
  const spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet) throw new Error('สคริปต์นี้ต้องผูกกับ Google Sheet');
  if (!spreadsheet.getSheetByName(KPP.SHEETS.annual) ||
      !spreadsheet.getSheetByName(KPP.SHEETS.monthly)) {
    throw new Error('ไม่พบ Annual_Data หรือ Monthly_Data กรุณาตรวจว่าเปิด Script จากไฟล์ฐานข้อมูลที่ถูกต้อง');
  }
}
