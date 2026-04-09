import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TransactionData {
  emailIndex: number;
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
/**
 * Thrown for any transient/retryable Gemini error (429 quota, 503 overloaded,
 * 500 internal, network failures). The sync runner catches this, releases
 * email claims so they can be retried on the next sync, and aborts the job
 * with a user-facing message.
 */
export class GeminiRetryableError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiRetryableError';
    this.status = status;
  }
}

// Keep the old export name so syncRunner import still works.
export { GeminiRetryableError as GeminiQuotaError };

function isRetryableError(err: any): boolean {
  if (!err) return false;
  const status = err.status;
  // 429 = rate limit / quota, 503 = overloaded, 500 = internal error
  if (status === 429 || status === 503 || status === 500) return true;
  // Google's structured error payload (gRPC-style reason).
  const details = err.errorDetails;
  if (Array.isArray(details)) {
    for (const d of details) {
      if (d?.reason === 'RESOURCE_EXHAUSTED') return true;
    }
  }
  // Network-level failures (fetch failed, ECONNRESET, timeout, etc.)
  const msg = String(err.message || '').toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('econnreset') || msg.includes('etimedout')) {
    return true;
  }
  return false;
}

function retryableMessage(err: any): string {
  const status = err?.status;
  if (status === 429) return 'Gemini API quota exhausted. Try again later or check your API plan.';
  if (status === 503) return 'Gemini is temporarily overloaded. Please try syncing again in a few minutes.';
  if (status === 500) return 'Gemini returned an internal error. Please try again later.';
  return `Gemini temporarily unavailable: ${err?.message || 'unknown error'}. Please retry.`;
}

// Rate-limit guard — 5 RPM on free tier → 1 request per 13s (with margin).
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 13_000;

async function rateLimit() {
  const delta = Date.now() - lastRequestTime;
  if (delta < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - delta));
  }
  lastRequestTime = Date.now();
}

// Batch response schema — array of per-email results.
const batchResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      emailIndex: {
        type: SchemaType.INTEGER,
        description: 'Zero-based index matching the email in the input list.',
      },
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
          'EXACT transaction date and time from the email in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). ' +
          'Look for fields like "Transaction Date", "Transaction Time", "Date & Time", timestamps, ' +
          'or any date/time mentioned in the email body. Combine separate date and time fields into one value. ' +
          'If only a date is present with absolutely no time, use T00:00:00. ' +
          'If time is present without seconds, append :00 for seconds.',
      },
      description: { type: SchemaType.STRING, description: 'Short human-readable description of the transaction.' },
      merchant: {
        type: SchemaType.STRING,
        description:
          'Counterparty / merchant / payee name. Extract from "Remarks", "To", "Paid to", ' +
          'merchant name fields, or any identifiable party in the email.',
      },
      reference: { type: SchemaType.STRING, description: 'Bank reference / transaction id if present.' },
      balanceAfter: { type: SchemaType.NUMBER, description: 'Account balance after txn, if stated.' },
      suggestedCategory: {
        type: SchemaType.STRING,
        description:
          'Best-matching category. FIRST try the user\'s existing categories. ' +
          'If none fit, INFER a sensible category from the merchant name, remarks, or transaction context ' +
          '(e.g., "Daraz" → Shopping, "Nepal Electricity" → Utilities, "Salary" → Salary, ' +
          '"ATM" → Cash Withdrawal, "Netflix" → Entertainment).',
      },
    },
    required: ['emailIndex', 'isTransaction'],
  },
};

export interface BatchEmailInput {
  index: number;
  body: string;
}

/**
 * Parse a batch of emails in a single Gemini call. Returns a Map keyed by
 * email index → parsed result (or null if validation failed).
 */
export async function parseBatchEmailsWithGemini(
  emails: BatchEmailInput[],
  promptTemplate: string,
  userCategories: string[]
): Promise<Map<number, TransactionData | null>> {
  const results = new Map<number, TransactionData | null>();
  if (emails.length === 0) return results;

  await rateLimit();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: batchResponseSchema as any,
    },
  });

  const categoriesList =
    userCategories.length > 0
      ? `\nUser's existing categories (prefer these when matching):\n${userCategories.join(', ')}`
      : '';

  const emailBlocks = emails
    .map((e) => `--- EMAIL [${e.index}] ---\n${e.body}`)
    .join('\n\n');

  const prompt = `${promptTemplate}
${categoriesList}

Instructions:
- You are given ${emails.length} email(s) below, each labeled with an index [0], [1], etc.
- Return a JSON array with one result object per email. Each object MUST include "emailIndex" matching the email's index.
- Set isTransaction=false for OTPs, login alerts, promotions, marketing, monthly statements, balance-only alerts.
- Only set isTransaction=true for actual credit/debit/transfer/payment events with a concrete amount.
- Debit / withdrawal / purchase / payment → type="expense".
- Credit / deposit / salary / refund → type="income".
- Return amount as a number without currency symbol or commas.

DATE & TIME — THIS IS CRITICAL:
- Extract the EXACT date AND time from the email. Look for "Transaction Date", "Transaction Time", "Date & Time", "Date", "Time", timestamps, or any date/time text in the body.
- If date and time are in separate fields (e.g., "Transaction Date: 2025-03-15" and "Transaction Time: 14:30:45"), combine them: "2025-03-15T14:30:45".
- Output format MUST be ISO 8601: YYYY-MM-DDTHH:MM:SS
- ONLY use T00:00:00 if the email genuinely contains no time information at all.

CATEGORY:
- First try to match one of the user's existing categories listed above.
- If no existing category fits, infer a sensible category from the merchant name, remarks, or transaction description (e.g., restaurant → Food & Dining, electricity bill → Utilities, ATM → Cash Withdrawal, online shopping → Shopping, subscription → Entertainment).

MERCHANT:
- Extract from Remarks, "Paid to", "Transferred to", merchant name, counterparty, or any identifiable party.

${emailBlocks}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as TransactionData[];

    if (!Array.isArray(parsed)) {
      console.error('Gemini batch response is not an array');
      return results;
    }

    for (const item of parsed) {
      if (item.emailIndex == null || item.emailIndex < 0) continue;

      // Non-transaction — accept as-is.
      if (item.isTransaction === false) {
        results.set(item.emailIndex, item);
        continue;
      }

      // Validate transaction fields.
      if (!item.type || !item.amount || !item.date || !item.description) {
        results.set(item.emailIndex, null);
        continue;
      }
      if (!['income', 'expense'].includes(item.type)) {
        results.set(item.emailIndex, null);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(item.date)) {
        results.set(item.emailIndex, null);
        continue;
      }

      if (item.isTransaction === undefined) item.isTransaction = true;
      results.set(item.emailIndex, item);
    }

    return results;
  } catch (error: any) {
    if (isRetryableError(error)) {
      const msg = retryableMessage(error);
      console.error('Gemini retryable error:', error?.message || error);
      throw new GeminiRetryableError(msg, error?.status);
    }
    // Non-retryable (bad JSON, validation, etc.) — return empty so caller
    // marks individual emails as failed (they won't magically work next time).
    console.error('Gemini batch parse error:', error?.message || error);
    return results;
  }
}

export const DEFAULT_NABIL_BANK_PROMPT = `You are a transaction parser for Nabil Bank notification emails.

Field mapping:
- "Transaction Type" field: Debit → expense, Credit → income
- "Transaction Amount" → amount (numeric only)
- "Transaction Date" AND "Transaction Time" → combine into ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS). These are often in separate fields — you MUST combine them. Never drop the time.
- "Remarks" → description, and extract merchant / payee name from it
- "Reference No" or similar → reference
- "Available Balance" or "Balance" → balanceAfter
- Currency is NPR unless stated otherwise

Category inference from remarks/merchant:
- QR payment / NQR / merchant purchase → infer from merchant name (e.g., "Daraz" → Shopping, "Foodmandu" → Food & Dining)
- Utility / electricity / water / internet / telecom → Utilities
- Salary / deposit / remittance → Salary
- ATM withdrawal → Cash Withdrawal
- Bank fees / service charge / SMS charge → Bank Fees
- Fund transfer between own accounts → Transfer
- If the merchant or remarks clearly suggest a category, use that even if not in the user's list`;

export const DEFAULT_GENERIC_BANK_PROMPT = `You are a transaction parser for bank notification emails.

Extract every transaction from the emails. For each:
- Map debit/withdrawal/payment to expense, credit/deposit/refund to income.
- Extract the EXACT date AND time. Look for "Date", "Time", "Date & Time", timestamps — combine if separate. Output as YYYY-MM-DDTHH:MM:SS.
- Extract amount as a plain number (no currency symbols or commas).
- Identify the merchant/payee/counterparty from remarks, "Paid to", "Transferred to", or any identifiable party.
- Infer a meaningful category from the merchant name or transaction context if the user's categories don't cover it (e.g., restaurant → Food & Dining, electricity → Utilities, ATM → Cash Withdrawal, subscription → Entertainment, online store → Shopping).`;
