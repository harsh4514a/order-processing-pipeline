const { parseCsvStream } = require('./csvStreamParser');
const { parseExcelStream } = require('./excelStreamParser');

const resolveParser = (mimetype, originalname) => {
  const ext = String(originalname || '').toLowerCase().split('.').pop();

  if (mimetype === 'text/csv' || ext === 'csv') {
    return parseCsvStream;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    ext === 'xlsx'
  ) {
    return parseExcelStream;
  }

  return null;
};

module.exports = {
  resolveParser
};
