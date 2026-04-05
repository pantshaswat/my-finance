import mongoose, { Schema, Document } from 'mongoose';

export type ProcessedEmailStatus =
  | 'processing'
  | 'parsed'
  | 'skipped'
  | 'ignored'
  | 'failed';

export interface IProcessedEmail extends Document {
  userId: mongoose.Types.ObjectId;
  bankEmail: string;
  emailId: string;
  status: ProcessedEmailStatus;
  reason?: string;
  attempts: number;
  transactionId?: mongoose.Types.ObjectId;
  emailDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessedEmailSchema = new Schema<IProcessedEmail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bankEmail: { type: String, required: true },
    emailId: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'parsed', 'skipped', 'ignored', 'failed'],
      required: true,
    },
    reason: { type: String },
    attempts: { type: Number, default: 1 },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    emailDate: { type: Date },
  },
  { timestamps: true }
);

// Unique per (user, email) — prevents double-processing across sync runs.
ProcessedEmailSchema.index({ userId: 1, emailId: 1 }, { unique: true });
ProcessedEmailSchema.index({ userId: 1, bankEmail: 1, createdAt: -1 });

export default mongoose.models.ProcessedEmail ||
  mongoose.model<IProcessedEmail>('ProcessedEmail', ProcessedEmailSchema);
