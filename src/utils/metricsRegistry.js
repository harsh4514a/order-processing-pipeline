const metrics = {
  processedFiles: 0,
  processedRows: 0,
  insertedRows: 0,
  failedRows: 0,
  totalProcessingTimeMs: 0,
  totalUploadTimeMs: 0
};

const recordUploadSummary = ({
  processedRows = 0,
  insertedRows = 0,
  failedRows = 0,
  processingTimeMs = 0,
  uploadTimeMs = 0
}) => {
  metrics.processedFiles += 1;
  metrics.processedRows += Number(processedRows);
  metrics.insertedRows += Number(insertedRows);
  metrics.failedRows += Number(failedRows);
  metrics.totalProcessingTimeMs += Number(processingTimeMs);
  metrics.totalUploadTimeMs += Number(uploadTimeMs);
};

const getMetrics = () => {
  const divisor = metrics.processedFiles || 1;

  return {
    processedFiles: metrics.processedFiles,
    processedRows: metrics.processedRows,
    insertedRows: metrics.insertedRows,
    failedRows: metrics.failedRows,
    averageProcessingTimeMs: Number((metrics.totalProcessingTimeMs / divisor).toFixed(2)),
    averageUploadTimeMs: Number((metrics.totalUploadTimeMs / divisor).toFixed(2))
  };
};

module.exports = {
  recordUploadSummary,
  getMetrics
};
