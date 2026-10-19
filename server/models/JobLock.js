import mongoose from 'mongoose';

const jobLockSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lockedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index in Mongo
    },
    lockedBy: {
      type: String,
      default: 'worker'
    }
  },
  {
    timestamps: true
  }
);

const JobLock = mongoose.model('JobLock', jobLockSchema);

export default JobLock;

/**
 * Acquire distributed job lock in MongoDB
 * Prevents overlapping cron/job executions
 */
export const acquireMongoLock = async (jobName, ttlMs = 5 * 60 * 1000) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const lockId = `${process.pid}_${Date.now()}`;

  try {
    const lock = await JobLock.findOneAndUpdate(
      {
        jobName,
        $or: [
          { expiresAt: { $lt: now } },
          { expiresAt: { $exists: false } }
        ]
      },
      {
        jobName,
        lockedAt: now,
        expiresAt,
        lockedBy: lockId
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    if (lock && lock.lockedBy === lockId) {
      return async () => {
        try {
          await JobLock.deleteOne({ jobName, lockedBy: lockId });
        } catch (e) {
          // ignore release error
        }
      };
    }
    return null;
  } catch (error) {
    // Duplicate key error (code 11000) means lock is currently held by an active job
    if (error.code === 11000) {
      return null;
    }
    throw error;
  }
};
