const fs = require('fs');
const csv = require('csv-parser');
const { registerResourceCloser, unregisterResourceCloser } = require('./resourceTracker');

const parseCsvStream = async ({ filePath, onRow }) => new Promise((resolve, reject) => {
  let rowNumber = 1;
  let settled = false;

  const settleOnce = (handler) => (value) => {
    if (settled) return;
    settled = true;
    handler(value);
  };

  const onResolve = settleOnce(resolve);
  const onReject = settleOnce(reject);

  const readStream = fs.createReadStream(filePath);
  const closer = () => {
    readStream.destroy();
  };

  registerResourceCloser(closer);

  const parser = csv({
      mapHeaders: ({ header }) => String(header || '').trim().toLowerCase(),
      mapValues: ({ value }) => String(value || '').trim()
    });

  parser.on('data', (data) => {
    parser.pause();
    rowNumber += 1;

    Promise.resolve(onRow(data, rowNumber))
      .then(() => parser.resume())
      .catch((error) => onReject(error));
  });

  parser.on('error', (error) => onReject(error));
  parser.on('end', () => {
    unregisterResourceCloser(closer);
    onResolve();
  });

  readStream.on('error', (error) => onReject(error));
  readStream.pipe(parser);
});

module.exports = {
  parseCsvStream
};
