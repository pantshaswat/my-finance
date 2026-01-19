import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TransactionData {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  suggestedCategory?: string;
}

// Simple rate limiter
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

async function rateLimitedDelay() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

export async function parseEmailWithGemini(
  emailContent: string,
  promptTemplate: string,
  userCategories: string[]
): Promise<TransactionData | null> {
  // Check if email content is empty
  if (!emailContent || emailContent.trim().length === 0) {
    console.error('Empty email content provided');
    return null;
  }

  await rateLimitedDelay();

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash', // Use stable free tier model
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    }
  });

  const categoriesList = userCategories.length > 0 
    ? `\n\nUser's existing categories: ${userCategories.join(', ')}`
    : '';

  const prompt = `${promptTemplate}${categoriesList}

Email Content:
${emailContent}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON with NO additional text, NO markdown formatting, NO code blocks
2. The response must be a single JSON object
3. Type must be exactly "income" or "expense" (lowercase)
4. Amount must be a number without currency symbols
5. Date must be in YYYY-MM-DD format
6. All fields are required

Required JSON structure:
{
  "type": "income" or "expense",
  "amount": number,
  "date": "YYYY-MM-DD",
  "description": "brief description",
  "suggestedCategory": "category name"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Gemini response:', text.substring(0, 200)); // Log first 200 chars
    
    // Remove any markdown formatting if present
    const cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')
      .trim();
    
    const parsed = JSON.parse(cleanText);
    
    // Validate parsed data
    if (!parsed.type || !parsed.amount || !parsed.date || !parsed.description) {
      console.error('Missing required fields in parsed data:', parsed);
      return null;
    }

    if (!['income', 'expense'].includes(parsed.type)) {
      console.error('Invalid transaction type:', parsed.type);
      return null;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(parsed.date)) {
      console.error('Invalid date format:', parsed.date);
      return null;
    }

    console.log('Successfully parsed transaction:', parsed);
    return parsed;
  } catch (error: any) {
    // Handle rate limiting
    if (error?.status === 429) {
      console.error('Rate limit exceeded. Waiting 5 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return null; // Return null, don't retry automatically to avoid recursion
    }
    console.error('Gemini parsing error:', error);
    return null;
  }
}

export const DEFAULT_NABIL_BANK_PROMPT = `You are a transaction parser for Nabil Bank emails. Extract transaction details and return ONLY a JSON object.

FIELD MAPPING:
- Transaction Type field shows "Debit" or "Credit"
  * Debit = expense (money going out of account)
  * Credit = income (money coming into account)
- Transaction Amount = extract the numeric value only
- Transaction Date = convert to YYYY-MM-DD format
- Remarks field = use for description

CATEGORY MATCHING RULES:
- Match keywords in Remarks to user's existing categories when possible
- NQR/QR payments = "Shopping" or merchant-specific category
- Bill payments = "Utilities"
- Salary/deposits = "Salary"
- ATM withdrawals = "Cash Withdrawal"
- Bank fees = "Bank Fees"
- If no match, suggest a logical new category

IMPORTANT:
- Return ONLY the JSON object
- NO explanatory text before or after
- NO markdown code blocks
- Ensure all fields are present and correctly formatted`;