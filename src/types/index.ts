export interface Transaction {
  _id: string;
  userId: string;
  categoryId: Category | string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  source: 'manual' | 'email';
  emailId?: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  createdAt: string;
}

export interface BankPrompt {
  _id: string;
  userId: string;
  bankEmail: string;
  promptTemplate: string;
}

export interface Analytics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, { income: number; expense: number }>;
  transactionCount: number;
}