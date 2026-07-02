const closers = new Set();

const registerResourceCloser = (closer) => {
  if (typeof closer === 'function') {
    closers.add(closer);
  }
};

const unregisterResourceCloser = (closer) => {
  closers.delete(closer);
};

const closeTrackedResources = async () => {
  const tasks = Array.from(closers).map(async (closer) => {
    try {
      await closer();
    } catch (error) {
      return error;
    }
    return null;
  });

  await Promise.all(tasks);
};

module.exports = {
  registerResourceCloser,
  unregisterResourceCloser,
  closeTrackedResources
};
