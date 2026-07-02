const { validateOrderRow } = require('../src/utils/orderRowValidator');

describe('orderRowValidator', () => {
  test('accepts valid row and normalizes output', () => {
    const seen = new Set();
    const result = validateOrderRow({
      row: {
        order_id: ' O-1 ',
        customer_id: ' C-1 ',
        order_date: '2026-06-30',
        order_amount: '99.99',
        status: ' pending '
      },
      rowNumber: 2,
      seenOrderIds: seen
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedRow.status).toBe('Pending');
  });

  test('rejects invalid status', () => {
    const result = validateOrderRow({
      row: {
        order_id: 'O-1',
        customer_id: 'C-1',
        order_date: '2026-06-30',
        order_amount: '10.50',
        status: 'Shipped'
      },
      rowNumber: 3,
      seenOrderIds: new Set()
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('status is invalid');
  });

  test('rejects duplicate order_id within file', () => {
    const seen = new Set(['O-1']);
    const result = validateOrderRow({
      row: {
        order_id: 'O-1',
        customer_id: 'C-1',
        order_date: '2026-06-30',
        order_amount: '10.50',
        status: 'Pending'
      },
      rowNumber: 3,
      seenOrderIds: seen
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('order_id must be unique');
  });
});
