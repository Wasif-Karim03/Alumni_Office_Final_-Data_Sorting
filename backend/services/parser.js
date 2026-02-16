/**
 * CSV and Excel parsing and file type detection
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const CATEGORY_MARKERS = ['Guest Form Data', 'Profile Data', 'Sub Events Attending', 'UTM Parameters'];

/** Check if buffer looks like Excel (XLS/XLSX) by magic bytes */
function isExcelBuffer(buffer) {
  const arr = new Uint8Array(buffer.slice(0, 8));
  // XLSX: PK (ZIP)
  if (arr[0] === 0x50 && arr[1] === 0x4b) return true;
  // XLS: D0 CF 11 E0 (OLE compound document)
  if (arr[0] === 0xd0 && arr[1] === 0xcf && arr[2] === 0x11 && arr[3] === 0xe0) return true;
  return false;
}

/** Parse Excel buffer to array of row objects */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false });
  return rows.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== '')
  );
}

/**
 * Detect if file is CRM (Raiser's Edge) or Registration (AlumniEvent) based on column headers
 */
export function detectFileType(headers) {
  const cols = headers.map((h) => String(h || '').toLowerCase().trim());

  // Raiser's Edge / CRM: giving, constituency, class year, wealth, etc.
  const isCRM = cols.some(
    (c) =>
      c.includes('lt giving') ||
      c.includes('lifetime giving') ||
      c.includes('constituency code') ||
      c.includes('constituency') ||
      c === 'cl yr' ||
      (c.includes('class year') && !c.includes('n/a')) ||
      c.includes('internal gift capacity') ||
      c.includes('we range') ||
      c.includes('wealth engine') ||
      c.includes('last gift amount') ||
      c.includes('annual fund')
  );

  // AlumniEvent / Registration: registration id, guest type, sub-events
  const isRegistration = cols.some(
    (c) =>
      c.includes('registration id') ||
      c.includes('guest type') ||
      c.includes('guest full name') ||
      c.includes('guest first name') ||
      c.includes('guest last name') ||
      c.includes('registration status') ||
      c.includes('registration date')
  );

  return { isCRM, isRegistration };
}

/**
 * Parse CSV buffer to array of row objects
 */
function parseCSV(buffer) {
  const parsed = Papa.parse(buffer.toString('utf-8'), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`Failed to parse CSV: ${parsed.errors[0].message}`);
  }

  // Filter out completely empty rows
  let rows = parsed.data.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== '')
  );

  return rows;
}

/**
 * Parse file buffer (CSV or Excel) to array of row objects
 */
export function parseFile(buffer) {
  if (isExcelBuffer(buffer)) {
    return parseExcel(buffer);
  }
  return parseCSV(buffer);
}

/**
 * Handle 2-row header in registration file.
 * If first row (keys) contains category markers, use row 0 values as headers and remap from row 1.
 */
export function handleRegistrationHeader(rows) {
  if (rows.length === 0) return rows;

  // Keys come from CSV line 1 (category row); values of row 0 come from CSV line 2 (actual headers)
  const firstRowKeys = Object.keys(rows[0] || {});
  const firstRowVals = Object.values(rows[0] || {});
  const isCategoryRow =
    firstRowKeys.some((k) => typeof k === 'string' && CATEGORY_MARKERS.includes(k.trim())) ||
    firstRowVals.some((v) => typeof v === 'string' && CATEGORY_MARKERS.includes(v.trim()));

  if (!isCategoryRow) return rows;

  const headerRow = rows[0];
  const origKeys = Object.keys(headerRow);
  const newHeaders = origKeys.map((origKey) => {
    const val = headerRow[origKey];
    return val && typeof val === 'string' && val.trim() !== ''
      ? val.trim()
      : origKey;
  });

  return rows.slice(1).map((row) => {
    const newRow = {};
    origKeys.forEach((key, i) => {
      newRow[newHeaders[i] || key] = row[key];
    });
    return newRow;
  });
}

/**
 * Parse and prepare both files, return { crmRows, regRows } with auto-detection and swap
 */
export function parseAndDetectFiles(buffer1, buffer2) {
  let rows1 = parseFile(buffer1);
  let rows2 = parseFile(buffer2);

  if (rows1.length === 0) throw new Error('File 1 appears to be empty or unreadable.');
  if (rows2.length === 0) throw new Error('File 2 appears to be empty or unreadable.');

  // Handle 2-row header BEFORE detection (registration exports often have category row first)
  rows1 = handleRegistrationHeader(rows1);
  rows2 = handleRegistrationHeader(rows2);

  const headers1 = Object.keys(rows1[0] || {});
  const headers2 = Object.keys(rows2[0] || {});

  const type1 = detectFileType(headers1);
  const type2 = detectFileType(headers2);

  let crmRows = rows1;
  let regRows = rows2;

  if (type1.isRegistration && type2.isCRM) {
    crmRows = rows2;
    regRows = rows1;
  } else if (type1.isCRM && type2.isRegistration) {
    crmRows = rows1;
    regRows = rows2;
  } else if (!type1.isCRM && !type1.isRegistration && !type2.isCRM && !type2.isRegistration) {
    const sample1 = headers1.slice(0, 6).join(', ');
    const sample2 = headers2.slice(0, 6).join(', ');
    throw new Error(
      `Neither file matches the expected format. File 1 columns: ${sample1}... File 2 columns: ${sample2}... ` +
        'Raiser\'s Edge needs: LT Giving, Constituency Code, CL YR, or Internal Gift Capacity. ' +
        'AlumniEvent needs: Registration ID, Guest Type, Guest Full Name, or Registration Status.'
    );
  } else if (!type1.isCRM && !type1.isRegistration) {
    const sample = headers1.slice(0, 8).join(', ');
    throw new Error(
      `File 1 does not match expected format. Found columns: ${sample}${headers1.length > 8 ? '...' : ''}. ` +
        'Raiser\'s Edge needs: LT Giving, Constituency Code, or CL YR. AlumniEvent needs: Registration ID, Guest Type, or Guest Full Name.'
    );
  } else if (!type2.isCRM && !type2.isRegistration) {
    const sample = headers2.slice(0, 8).join(', ');
    throw new Error(
      `File 2 does not match expected format. Found columns: ${sample}${headers2.length > 8 ? '...' : ''}. ` +
        'Raiser\'s Edge needs: LT Giving, Constituency Code, or CL YR. AlumniEvent needs: Registration ID, Guest Type, or Guest Full Name.'
    );
  }

  if (regRows.length === 0) return { crmRows, regRows };

  return { crmRows, regRows };
}

/**
 * Parse a single file when only AlumniEvent registration is uploaded.
 * Returns { crmRows: [], regRows } — crmRows empty when no RE file.
 */
export function parseSingleFile(buffer) {
  let rows = parseFile(buffer);
  if (rows.length === 0) throw new Error('File appears to be empty or unreadable.');

  rows = handleRegistrationHeader(rows);
  const headers = Object.keys(rows[0] || {});
  const { isRegistration } = detectFileType(headers);

  if (!isRegistration) {
    throw new Error(
      'Single-file mode requires AlumniEvent (Almnabase) registration data. ' +
        'This file looks like Raiser\'s Edge — upload it together with an AlumniEvent export for full analysis.'
    );
  }

  return { crmRows: [], regRows: rows };
}
