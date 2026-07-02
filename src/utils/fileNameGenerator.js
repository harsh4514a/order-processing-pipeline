const path = require('path');
const { randomUUID } = require('crypto');
const { sanitizeFileName } = require('./fileNameSanitizer');

const generateUploadFileName = (originalName) => {
  const safeName = sanitizeFileName(originalName);
  const extension = path.extname(safeName).toLowerCase() || '.csv';
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ]/g, '')
    .slice(0, 15);

  return `orders-${timestamp}-${randomUUID()}${extension}`;
};

module.exports = {
  generateUploadFileName
};
