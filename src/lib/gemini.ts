import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TransactionData {
  isTransaction?: boolean;
  ignoreReason?: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  suggestedCategory?: string;
  merchant?: string;
  reference?: string;
  currency?: string;
  balanceAfter?: number;
}

/**
 * Thrown when the Gemini API reports quota/rate-limit exhaustion. The sync
 * runner catches this specifically, releases its claim on the current email
 * (so it can be retried on the next sync), and aborts the job with a
 * user-facing message instead of marking emails as permanently failed.
 */
export class GeminiQuotaError extends Error {
  constructor(message = 'Gemini quota exhausted') {
    super(message);
    this.name = 'GeminiQuotaError';
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429) return true;
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests')
  );
}

// Rate-limit guard shared across concurrent calls in the same process.
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 2000;

async function rateLimit() {
  const delta = Date.now() - lastRequestTime;
  if (delta < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - delta));
  }
  lastRequestTime = Date.now();
}

// Schema passed to Gemini — guarantees valid JSON, no markdown stripping needed.
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isTransaction: {
      type: SchemaType.BOOLEAN,
      description:
        'True if this email represents a real financial transaction (debit/credit/transfer). ' +
        'False for OTPs, login alerts, promotions, statements, marketing.',
    },
    ignoreReason: {
      type: SchemaType.STRING,
      description: 'If isTransaction is false, short reason why (e.g., "OTP", "promo").',
    },
    type: {
      type: SchemaType.STRING,
      enum: ['income', 'expense'],
      description: 'income = money in (credit), expense = money out (debit).',
    },
    amount: { type: SchemaType.NUMBER, description: 'Numeric amount, no currency symbol.' },
    currency: { type: SchemaType.STRING, description: 'ISO code (NPR, USD, INR, etc.) if detectable.' },
    date: {
      type: SchemaType.STRING,
      description:
        'Transaction date-time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). ' +
        'If the email only gives a date with no time, use T00:00:00. ' +
        'If it gives time without seconds, use :00 for seconds.',
    },
    description: { type: SchemaType.STRING, description: 'Short human-readable description.' },
    merchant: { type: SchemaType.STRING, description: 'Counterparty / merchant name if identifiable.' },
    reference: { type: SchemaType.STRING, description: 'Bank reference / transaction id if present.' },
    balanceAfter: { type: SchemaType.NUMBER, description: 'Account balance after txn, if stated.' },
    suggestedCategory: { type: SchemaType.STRING, description: 'Best-matching category name.' },
  },
  required: ['isTransaction'],
};

export async function parseEmailWithGemini(
  emailContent: string,
  promptTemplate: string,
  userCategories: string[]
): Promise<TransactionData | null> {
  if (!emailContent || emailContent.trim().length === 0) {
    console.error('Empty email content');
    return null;
  }

  await rateLimit();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: responseSchema as any,
    },
  });

  const categoriesList =
    userCategories.length > 0
      ? `\nUser's existing categories (prefer these when matching):\n${userCategories.join(', ')}`
      : '';

  const prompt = `${promptTemplate}
${categoriesList}

Instructions:
- Set isTransaction=false for OTPs, login alerts, promotions, marketing, monthly statements, balance-only alerts.
- Only set isTransaction=true for actual credit/debit/transfer/payment events with a concrete amount.
- Debit / withdrawal / purchase / payment → type="expense".
- Credit / deposit / salary / refund → type="income".
- Return amount as a number without currency symbol or commas.
- Date must be ISO 8601 with time: YYYY-MM-DDTHH:MM:SS (use T00:00:00 if the email has no time).
- Prefer matching suggestedCategory from the user's existing list above when reasonable.

Email content:
${emailContent}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as TransactionData;

    // Early exit for non-transactions — do NOT require other fields.
    if (parsed.isTransaction === false) return parsed;

    if (!parsed.type || !parsed.amount || !parsed.date || !parsed.description) {
      console.error('Missing required transaction fields:', parsed);
      return null;
    }
    if (!['income', 'expense'].includes(parsed.type)) return null;
    // Accept either plain date or full ISO datetime.
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(parsed.date)) return null;

    // Default isTransaction=true if the model didn't set it but returned valid txn fields.
    if (parsed.isTransaction === undefined) parsed.isTransaction = true;

    return parsed;
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.error('Gemini quota exhausted:', error?.message || error);
      throw new GeminiQuotaError(
        'Gemini API quota exhausted. Try again later or check your API plan.'
      );
    }
    console.error('Gemini parse error:', error?.message || error);
    return null;
  }
}

export const DEFAULT_NABIL_BANK_PROMPT = `You are a transaction parser for Nabil Bank notification emails.

Field mapping:
- "Transaction Type" field: Debit → expense, Credit → income
- "Transaction Amount" → amount (numeric only)
- "Transaction Date" (+ "Transaction Time" if separate) → date in ISO 8601 (YYYY-MM-DDTHH:MM:SS). If only a date is given, use T00:00:00.
- "Remarks" → description, and mine it for merchant / reference
- Currency is typically NPR

Category hints:
- NQR / QR payment / merchant purchase → Shopping or merchant-specific
- Utility / electricity / water / internet / telecom → Utilities
- Salary / deposit / remittance → Salary
- ATM withdrawal → Cash Withdrawal
- Bank fees / service charge → Bank Fees
- Fund transfer between own accounts → Transfer`;

export const DEFAULT_GENERIC_BANK_PROMPT = `You are a transaction parser for bank notification emails.
Extract the transaction (if any) from the email. Map debit/withdrawal/payment to expense and credit/deposit/refund to income. Pull out amount, date, merchant / counterparty, and any reference id present.`;
