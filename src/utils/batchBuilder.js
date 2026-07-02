const createBatchBuilder = ({ batchSize, onBatch }) => {
  let currentBatch = [];
  let batchCounter = 0;

  const flush = async () => {
    if (currentBatch.length === 0) {
      return;
    }

    batchCounter += 1;
    const batchToSend = currentBatch;
    currentBatch = [];
    await onBatch(batchToSend, batchCounter);
  };

  const push = async (item) => {
    currentBatch.push(item);
    if (currentBatch.length >= batchSize) {
      await flush();
    }
  };

  const finalize = async () => {
    await flush();
    return {
      totalBatches: batchCounter
    };
  };

  return {
    push,
    flush,
    finalize
  };
};

module.exports = {
  createBatchBuilder
};
