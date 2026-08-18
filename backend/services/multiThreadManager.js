const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class MultiThreadManager {
  constructor() {
    this.jobs = new Map(); // jobId -> job details
    this.jobHistory = []; // list of completed/cancelled jobs
    this.workerScriptPath = path.join(__dirname, '../workers/dataBatchWorker.js');
  }

  /**
   * Start a multi-threaded batch processing job
   */
  async startJob({ userId, taskType = 'ACCOUNT_CHECK', items = [], threadCount = 4, options = {}, io = null }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required and must not be empty');
    }

    const availableCpus = os.cpus().length || 4;
    const actualThreads = Math.min(Math.max(1, parseInt(threadCount, 10) || 4), 32);

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const totalItems = items.length;

    // Split items into chunks for each worker thread
    const chunks = this._splitIntoChunks(items, actualThreads);

    const job = {
      jobId,
      userId,
      taskType,
      totalItems,
      threadCount: chunks.length,
      chunks,
      status: 'RUNNING',
      startTime: Date.now(),
      endTime: null,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      workers: [], // array of worker objects
      workerStates: {}, // workerId -> { status, progress, total, memory }
      results: [],
      options
    };

    this.jobs.set(jobId, job);

    // Initialize Worker instances
    chunks.forEach((chunkItems, index) => {
      const workerId = index + 1;
      
      job.workerStates[workerId] = {
        workerId,
        status: 'STARTING',
        processed: 0,
        total: chunkItems.length,
        success: 0,
        error: 0,
        memoryUsedMb: 0
      };

      const worker = new Worker(this.workerScriptPath, {
        workerData: {
          workerId,
          taskType,
          items: chunkItems,
          options
        }
      });

      job.workers.push({ workerId, instance: worker });

      // Worker message handling
      worker.on('message', (msg) => {
        this._handleWorkerMessage(jobId, workerId, msg, io);
      });

      // Worker error handling
      worker.on('error', (err) => {
        console.error(`Worker #${workerId} error in job ${jobId}:`, err);
        if (job.workerStates[workerId]) {
          job.workerStates[workerId].status = 'ERROR';
          job.workerStates[workerId].error = err.message;
        }
        this._checkJobCompletion(jobId, io);
      });

      // Worker exit handling
      worker.on('exit', (code) => {
        if (code !== 0 && job.workerStates[workerId]?.status !== 'COMPLETED') {
          console.warn(`Worker #${workerId} exited with code ${code}`);
        }
      });

      job.workerStates[workerId].status = 'PROCESSING';
    });

    // Notify initial state via socket
    if (io && userId) {
      io.to(userId).emit('multi_thread_start', {
        jobId,
        taskType,
        totalItems,
        threadCount: job.threadCount,
        startTime: job.startTime
      });
    }

    return {
      jobId,
      status: 'RUNNING',
      totalItems,
      threadCount: job.threadCount,
      cpusAvailable: availableCpus
    };
  }

  /**
   * Handle incoming messages from worker thread
   */
  _handleWorkerMessage(jobId, workerId, msg, io) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (msg.type === 'WORKER_PROGRESS') {
      const state = job.workerStates[workerId];
      if (state) {
        state.processed = msg.processedCount;
        state.success = msg.successCount;
        state.error = msg.errorCount;
        state.memoryUsedMb = msg.memoryUsage;
        state.status = 'PROCESSING';
      }

      this._recalculateJobProgress(job);

      if (io && job.userId) {
        io.to(job.userId).emit('multi_thread_progress', {
          jobId,
          processedCount: job.processedCount,
          totalItems: job.totalItems,
          successCount: job.successCount,
          errorCount: job.errorCount,
          workerStates: job.workerStates,
          itemsPerSec: this._calculateItemsPerSec(job)
        });
      }
    } else if (msg.type === 'WORKER_DONE') {
      const state = job.workerStates[workerId];
      if (state) {
        state.status = 'COMPLETED';
        state.processed = msg.stats.total;
        state.success = msg.stats.successCount;
        state.error = msg.stats.errorCount;
        state.memoryUsedMb = msg.stats.memoryUsedMb;
      }

      if (Array.isArray(msg.results)) {
        job.results.push(...msg.results);
      }

      this._recalculateJobProgress(job);
      this._checkJobCompletion(jobId, io);
    } else if (msg.type === 'WORKER_ERROR') {
      const state = job.workerStates[workerId];
      if (state) {
        state.status = 'ERROR';
        state.error = msg.error;
      }
      this._checkJobCompletion(jobId, io);
    }
  }

  _recalculateJobProgress(job) {
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalError = 0;

    Object.values(job.workerStates).forEach((w) => {
      totalProcessed += w.processed || 0;
      totalSuccess += w.success || 0;
      totalError += w.error || 0;
    });

    job.processedCount = totalProcessed;
    job.successCount = totalSuccess;
    job.errorCount = totalError;
  }

  _calculateItemsPerSec(job) {
    const elapsedSec = (Date.now() - job.startTime) / 1000 || 0.1;
    return Math.round((job.processedCount / elapsedSec) * 100) / 100;
  }

  _checkJobCompletion(jobId, io) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const allFinished = Object.values(job.workerStates).every(
      (w) => w.status === 'COMPLETED' || w.status === 'ERROR' || w.status === 'CANCELLED'
    );

    if (allFinished && job.status === 'RUNNING') {
      job.status = 'COMPLETED';
      job.endTime = Date.now();
      job.durationMs = job.endTime - job.startTime;
      job.itemsPerSec = this._calculateItemsPerSec(job);

      // Sort results by index
      job.results.sort((a, b) => a.index - b.index);

      // Save summary to history
      const historyEntry = {
        jobId: job.jobId,
        userId: job.userId,
        taskType: job.taskType,
        totalItems: job.totalItems,
        threadCount: job.threadCount,
        successCount: job.successCount,
        errorCount: job.errorCount,
        durationMs: job.durationMs,
        itemsPerSec: job.itemsPerSec,
        completedAt: new Date(job.endTime).toISOString()
      };

      this.jobHistory.unshift(historyEntry);
      if (this.jobHistory.length > 50) this.jobHistory.pop();

      if (io && job.userId) {
        io.to(job.userId).emit('multi_thread_completed', {
          jobId,
          totalItems: job.totalItems,
          successCount: job.successCount,
          errorCount: job.errorCount,
          durationMs: job.durationMs,
          itemsPerSec: job.itemsPerSec,
          sampleResults: job.results.slice(0, 20)
        });
      }
    }
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.jobId,
      taskType: job.taskType,
      status: job.status,
      totalItems: job.totalItems,
      processedCount: job.processedCount,
      successCount: job.successCount,
      errorCount: job.errorCount,
      threadCount: job.threadCount,
      startTime: job.startTime,
      durationMs: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime,
      itemsPerSec: this._calculateItemsPerSec(job),
      workerStates: job.workerStates,
      resultCount: job.results.length,
      sampleResults: job.results.slice(0, 50)
    };
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'CANCELLED';
    job.endTime = Date.now();

    job.workers.forEach(({ workerId, instance }) => {
      try {
        instance.terminate();
        if (job.workerStates[workerId]) {
          job.workerStates[workerId].status = 'CANCELLED';
        }
      } catch (err) {
        console.error(`Error terminating worker #${workerId}:`, err);
      }
    });

    return true;
  }

  getJobHistory(userId) {
    if (!userId) return this.jobHistory;
    return this.jobHistory.filter((j) => j.userId === userId);
  }

  getJobResults(jobId) {
    const job = this.jobs.get(jobId);
    return job ? job.results : null;
  }

  _splitIntoChunks(array, chunksCount) {
    const result = [];
    const count = Math.min(array.length, chunksCount);
    const chunkSize = Math.ceil(array.length / count);

    for (let i = 0; i < count; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      if (start < array.length) {
        result.push(array.slice(start, end));
      }
    }

    return result;
  }
}

module.exports = new MultiThreadManager();
