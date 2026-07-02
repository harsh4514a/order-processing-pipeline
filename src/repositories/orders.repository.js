const logger = require('../logger/logger');
const { getShard, getShardId } = require('../shard');
const { getAllPools, getPoolByShardId } = require('../database/connectionManager');
const { insertBatches } = require('../utils/batchInsert');
const { mapPostgresErrorToAppError } = require('../utils/databaseError');
const { withRetry } = require('../utils/retry');
const config = require('../config/env');

class OrdersRepository {
  constructor() {
    this.columns = ['order_id', 'customer_id', 'order_date', 'order_amount', 'status'];
  }

  async createOrder(orderInput) {
    const { shardId, pool } = getShard(orderInput.customer_id);

    const query = {
      name: 'create_order',
      text: `
        INSERT INTO orders (order_id, customer_id, order_date, order_amount, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id) DO NOTHING
        RETURNING id, order_id, customer_id, order_date, order_amount, status, created_at, updated_at
      `,
      values: [
        orderInput.order_id,
        orderInput.customer_id,
        orderInput.order_date,
        orderInput.order_amount,
        orderInput.status
      ]
    };

    try {
      const result = await pool.query(query);
      return {
        shardId,
        order: result.rows[0] || null
      };
    } catch (error) {
      logger.error({ error, shardId, orderId: orderInput.order_id }, 'Failed to create order');
      throw mapPostgresErrorToAppError(error, 'Unable to create order');
    }
  }

  async createOrdersBatch(orders, options = {}) {
    if (!Array.isArray(orders) || orders.length === 0) {
      return {
        insertedCount: 0,
        insertedOrders: []
      };
    }

    const batchSize = options.batchSize || config.database.defaultBatchSize;
    const ordersByShard = new Map();

    for (const order of orders) {
      const shardId = getShardId(order.customer_id);
      const current = ordersByShard.get(shardId) || [];
      current.push(order);
      ordersByShard.set(shardId, current);
    }

    const shardTransactions = new Map();

    try {
      for (const [shardId] of ordersByShard.entries()) {
        const pool = getPoolByShardId(shardId);
        const client = await pool.connect();
        await client.query('BEGIN');
        shardTransactions.set(shardId, client);
      }

      const insertedOrders = [];

      for (const [shardId, shardOrders] of ordersByShard.entries()) {
        const client = shardTransactions.get(shardId);

        const rows = shardOrders.map((order) => [
          order.order_id,
          order.customer_id,
          order.order_date,
          order.order_amount,
          order.status
        ]);

        const insertedRows = await withRetry({
          retries: 2,
          baseDelayMs: 100,
          task: async () => insertBatches({
            client,
            tableName: 'orders',
            columns: this.columns,
            rows,
            batchSize,
            statementBaseName: `create_orders_batch_shard_${shardId}`
          }),
          onRetry: async ({ attempt, delayMs, error }) => {
            logger.warn(
              {
                shardId,
                attempt,
                delayMs,
                code: error.code,
                reason: error.message
              },
              'Retrying shard batch insert after transient failure'
            );
          }
        });

        insertedOrders.push(
          ...insertedRows.map((row) => ({
            shardId,
            ...row
          }))
        );
      }

      for (const client of shardTransactions.values()) {
        await client.query('COMMIT');
      }

      return {
        insertedCount: insertedOrders.length,
        insertedOrders
      };
    } catch (error) {
      for (const client of shardTransactions.values()) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error({ rollbackError }, 'Rollback failed during batch order insert');
        }
      }

    //   logger.error({ error }, 'Failed to create orders batch');
    console.error("REAL PG ERROR:", error);
    logger.error({ error }, "Failed to create orders batch");
      throw mapPostgresErrorToAppError(error, 'Unable to create orders batch');
    } finally {
      for (const client of shardTransactions.values()) {
        client.release();
      }
    }
  }

  async getOrderById(orderId, customerId = null) {
    const query = {
      name: 'get_order_by_id',
      text: `
        SELECT id, order_id, customer_id, order_date, order_amount, status, created_at, updated_at
        FROM orders
        WHERE order_id = $1
        LIMIT 1
      `,
      values: [orderId]
    };

    try {
      if (customerId) {
        const { shardId, pool } = getShard(customerId);
        const result = await pool.query(query);
        return {
          shardId,
          order: result.rows[0] || null
        };
      }

      const results = await Promise.all(
        getAllPools().map(async ({ shardId, pool }) => {
          const result = await pool.query(query);
          return {
            shardId,
            order: result.rows[0] || null
          };
        })
      );

      return results.find((entry) => entry.order) || { shardId: null, order: null };
    } catch (error) {
      logger.error({ error, orderId, customerId }, 'Failed to fetch order by id');
      throw mapPostgresErrorToAppError(error, 'Unable to fetch order by id');
    }
  }

  async getOrdersByCustomer(customerId, options = {}) {
    const { shardId, pool } = getShard(customerId);
    const limit = Number(options.limit || 100);
    const offset = Number(options.offset || 0);

    const conditions = ['customer_id = $1'];
    const values = [customerId];

    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }

    values.push(limit);
    const limitPosition = values.length;
    values.push(offset);
    const offsetPosition = values.length;

    const query = {
      name: 'get_orders_by_customer',
      text: `
        SELECT id, order_id, customer_id, order_date, order_amount, status, created_at, updated_at
        FROM orders
        WHERE ${conditions.join(' AND ')}
        ORDER BY order_date DESC
        LIMIT $${limitPosition}
        OFFSET $${offsetPosition}
      `,
      values
    };

    try {
      const result = await pool.query(query);

      return {
        shardId,
        orders: result.rows
      };
    } catch (error) {
      logger.error({ error, shardId, customerId }, 'Failed to fetch orders by customer');
      throw mapPostgresErrorToAppError(error, 'Unable to fetch orders by customer');
    }
  }
}

module.exports = new OrdersRepository();
module.exports.OrdersRepository = OrdersRepository;
