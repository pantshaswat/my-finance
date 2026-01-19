import mongoose, { Schema, Document } from 'mongoose';

export interface IBankPrompt extends Document {
  userId: mongoose.Types.ObjectId;
  bankEmail: string;
  promptTemplate: string;
  linkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BankPromptSchema = new Schema<IBankPrompt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bankEmail: { type: String, required: true },
  promptTemplate: { type: String, required: true },
  linkedAt: { type: Date, default: Date.now },
}, { timestamps: true });

BankPromptSchema.index({ userId: 1, bankEmail: 1 }, { unique: true });

export default mongoose.models.BankPrompt || mongoose.model<IBankPrompt>('BankPrompt', BankPromptSchema);