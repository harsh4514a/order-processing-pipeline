-- order_id index is critical for exact-lookup reads and duplicate detection.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);

-- customer_id index is critical because sharding uses customer_id and customer history queries filter by it.
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- order_date index accelerates time-window analytics and recency-based scans.
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- status index accelerates operational dashboards and filtered state transitions.
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
