const logger = require('../logger/logger');

// Centralizes invalid-row logging to keep upload service logic readable.
// Note: Do not log full row payloads if they may contain large fields.
const logInvalidRow = ({ rowNumber, reason, row, seenOrderIdsCount, countersSnapshot }) => {
  // Only include a minimal subset of the row for observability.
  const safeOrderId = row && row.order_id ? String(row.order_id).slice(0, 128) : null;

  logger.warn(
    {
      rowNumber,
      reason,
      order_id: safeOrderId,
      failedRows: countersSnapshot?.failedRows ?? null,
      totalRows: countersSnapshot?.totalRows ?? null,
      seenOrderIdsCount: seenOrderIdsCount ?? null
    },
    'Invalid order row skipped'
  );
};

module.exports = {
  logInvalidRow
};

