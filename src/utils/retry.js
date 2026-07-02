const wait = async (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const defaultIsRetriable = (error) => {
  const retriableCodes = new Set([
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN',
    'ENOTFOUND',
    'ECONNREFUSED',
    '40001',
    '40P01',
    '53300',
    '55000',
    '08006',
    '57P01'
  ]);

  if (!error) {
    return false;
  }

  if (retriableCodes.has(error.code)) {
    return true;
  }

  const statusCode = Number(error.code);
  return Number.isInteger(statusCode) && statusCode >= 500;
};

const withRetry = async ({
  task,
  retries = 3,
  baseDelayMs = 150,
  maxDelayMs = 2000,
  isRetriable = defaultIsRetriable,
  onRetry = async () => {}
}) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await task(attempt);
    } catch (error) {
      if (attempt >= retries || !isRetriable(error)) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * (2 ** attempt), maxDelayMs);
      await onRetry({ attempt: attempt + 1, delayMs, error });
      await wait(delayMs);
      attempt += 1;
    }
  }

  throw new Error('Retry exhausted unexpectedly');
};

module.exports = {
  withRetry,
  defaultIsRetriable
};
