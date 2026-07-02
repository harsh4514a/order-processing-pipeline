const ExcelJS = require('exceljs');
const { registerResourceCloser, unregisterResourceCloser } = require('./resourceTracker');

const normalizeHeader = (value) => String(value || '').trim().toLowerCase();

const parseExcelStream = async ({ filePath, onRow }) => {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    entries: 'emit',
    sharedStrings: 'cache',
    styles: 'cache',
    hyperlinks: 'cache',
    worksheets: 'emit'
  });

  const closer = async () => {
    if (typeof workbookReader.cancel === 'function') {
      await workbookReader.cancel();
    }
  };

  registerResourceCloser(closer);

  let headerMap = null;
  let rowNumber = 0;

  try {
    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        rowNumber += 1;
        const values = row.values.slice(1);

        if (!headerMap) {
          headerMap = values.map((value) => normalizeHeader(value));
          continue;
        }

        const record = {};
        for (let index = 0; index < headerMap.length; index += 1) {
          const key = headerMap[index];
          if (!key) continue;
          record[key] = String(values[index] || '').trim();
        }

        await onRow(record, rowNumber);
      }

      break;
    }
  } finally {
    unregisterResourceCloser(closer);
  }
};

module.exports = {
  parseExcelStream
};
