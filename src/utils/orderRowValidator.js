const { ORDER_STATUSES } = require('../constants/orderStatus');

const normalizeString = (value) => String(value || '').trim();

const parseOrderDate = (value) => {
  const raw = normalizeString(value);
  const parsedDate = new Date(raw);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
};

const parsePositiveAmount = (value) => {
  const normalized = normalizeString(value);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed.toFixed(2);
};

const normalizeStatus = (value) => {
  const normalized = normalizeString(value);
  const canonical = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  if (!ORDER_STATUSES.has(canonical)) {
    return null;
  }

  return canonical;
};

const validateOrderRow = ({ row, rowNumber, seenOrderIds }) => {
  const orderId = normalizeString(row.order_id);
  const customerId = normalizeString(row.customer_id);
  const orderDate = parseOrderDate(row.order_date);
  const orderAmount = parsePositiveAmount(row.order_amount);
  const status = normalizeStatus(row.status);

  const failures = [];

  if (!orderId) {
    failures.push('order_id is required');
  } else if (seenOrderIds.has(orderId)) {
    failures.push('order_id must be unique within uploaded file');
  }

  if (!customerId) {
    failures.push('customer_id is required');
  }

  if (!orderDate) {
    failures.push('order_date must be a valid date');
  }

  if (!orderAmount) {
    failures.push('order_amount must be a positive decimal');
  }

  if (!status) {
    failures.push('status is invalid');
  }

  if (failures.length > 0) {
    return {
      valid: false,
      reason: failures.join(', ')
    };
  }

  seenOrderIds.add(orderId);

  return {
    valid: true,
    normalizedRow: {
      order_id: orderId,
      customer_id: customerId,
      order_date: orderDate,
      order_amount: orderAmount,
      status
    }
  };
};

module.exports = {
  validateOrderRow,
  parseOrderDate,
  parsePositiveAmount,
  normalizeStatus
};
