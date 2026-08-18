const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

if (isMainThread) {
  /**
   * Helper function to run CPU intensive tasks in worker thread
   */
  function runCpuTask(taskType, data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { taskType, data }
      });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  module.exports = { runCpuTask };
} else {
  // Worker thread execution
  const { taskType, data } = workerData;

  try {
    if (taskType === 'VERIFY_HMAC') {
      const { payloadStr, secret, expectedSignature } = data;
      const computed = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      const valid = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedSignature));
      parentPort.postPath({ valid, computed });
    } else if (taskType === 'NORMALIZE_MATERIALS') {
      const { materials } = data;
      if (!materials || !Array.isArray(materials)) {
        parentPort.postMessage([]);
      } else {
        const map = {};
        materials.forEach((m) => {
          if (typeof m === 'string') {
            map[m] = (map[m] || 0) + 1;
          } else if (m && typeof m === 'object' && m.name) {
            map[m.name] = (map[m.name] || 0) + (m.quantity || 1);
          }
        });
        const result = Object.keys(map).map((name) => ({ name, quantity: map[name] }));
        parentPort.postMessage(result);
      }
    } else {
      parentPort.postMessage({ success: true });
    }
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
}
