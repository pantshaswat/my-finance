import mongoose, { Schema, Document } from 'mongoose';

export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ISyncJobBankResult {
  bankEmail: string;
  fetched: number;
  parsed: number;
  ignored: number;
  skipped: number;
  failed: number;
  error?: string;
}

export interface ISyncJob extends Document {
  userId: mongoose.Types.ObjectId;
  status: SyncJobStatus;
  startedAt: Date;
  finishedAt?: Date;
  totals: {
    fetched: number;
    parsed: number;
    ignored: number;
    skipped: number;
    failed: number;
  };
  perBank: ISyncJobBankResult[];
  currentBank?: string;
  currentMessage?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SyncJobSchema = new Schema<ISyncJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    totals: {
      fetched: { type: Number, default: 0 },
      parsed: { type: Number, default: 0 },
      ignored: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    perBank: [
      {
        bankEmail: String,
        fetched: { type: Number, default: 0 },
        parsed: { type: Number, default: 0 },
        ignored: { type: Number, default: 0 },
        skipped: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        error: String,
      },
    ],
    currentBank: { type: String },
    currentMessage: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

SyncJobSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.SyncJob ||
  mongoose.model<ISyncJob>('SyncJob', SyncJobSchema);
