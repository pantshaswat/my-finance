import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Date;
  source: 'manual' | 'email';
  emailId?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  source: { type: String, enum: ['manual', 'email'], default: 'manual' },
  emailId: { type: String },
}, { timestamps: true });

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ emailId: 1 }, { sparse: true, unique: true });

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);