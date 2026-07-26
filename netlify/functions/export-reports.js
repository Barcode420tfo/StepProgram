const ExcelJS = require('exceljs');

const MAX_SHEETS = 10;
const MAX_ROWS_PER_SHEET = 50000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function addWorksheet(workbook, definition) {
  const name = String(definition.name || 'Report').slice(0, 31);
  const headers = Array.isArray(definition.headers) ? definition.headers.map(String) : [];
  const rows = Array.isArray(definition.rows) ? definition.rows : [];
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(42, Math.max(14, header.length + 3)),
  }));
  rows.forEach((row) => sheet.addRow(row));

  if (headers.length) {
    sheet.autoFilter = { from: 'A1', to: { row: 1, column: headers.length } };
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    sheet.getRow(1).height = 32;
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: 'top', wrapText: true };
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const sheets = Array.isArray(payload.sheets) ? payload.sheets : [];
    if (!sheets.length || sheets.length > MAX_SHEETS) {
      return json(400, { error: 'Invalid spreadsheet tabs' });
    }
    if (sheets.some((sheet) => !Array.isArray(sheet.rows) || sheet.rows.length > MAX_ROWS_PER_SHEET)) {
      return json(400, { error: 'A report contains too many rows to export' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'STEP Network Live Ops';
    workbook.created = new Date();
    sheets.forEach((sheet) => addWorksheet(workbook, sheet));

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="STEP-all-reports.xlsx"',
        'Cache-Control': 'no-cache, no-store',
      },
      body: Buffer.from(buffer).toString('base64'),
    };
  } catch (error) {
    console.error('Report export failed', error);
    return json(500, { error: error.message || 'Could not create spreadsheet' });
  }
};
