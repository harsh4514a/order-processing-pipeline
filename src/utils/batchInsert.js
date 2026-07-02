const config = require('../config/env');

const buildBatchInsertQuery = ({ tableName, columns, rowCount, offset = 0 }) => {
  const placeholders = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowPlaceholders = [];
    for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
      const paramPosition = offset + rowIndex * columns.length + colIndex + 1;
      rowPlaceholders.push(`$${paramPosition}`);
    }
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (order_id) DO NOTHING RETURNING id, order_id, customer_id`;
};

const flattenRows = (rows) => rows.flatMap((row) => row);

const insertBatches = async ({
  client,
  tableName,
  columns,
  rows,
  batchSize = config.database.defaultBatchSize,
  statementBaseName = 'batch_insert'
}) => {
  if (!rows.length) {
    return [];
  }

  const insertedRows = [];

  for (let index = 0; index < rows.length; index += batchSize) {
    const chunk = rows.slice(index, index + batchSize);
    const values = flattenRows(chunk);
    const text = buildBatchInsertQuery({ tableName, columns, rowCount: chunk.length });

    const queryConfig = {
    //   name: `${statementBaseName}_${index / batchSize}`,
      text,
      values
    };

    const result = await client.query(queryConfig);
    insertedRows.push(...result.rows);
  }

  return insertedRows;
};

module.exports = {
  buildBatchInsertQuery,
  insertBatches
};
