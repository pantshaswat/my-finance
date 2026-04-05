import { DEFAULT_NABIL_BANK_PROMPT, DEFAULT_GENERIC_BANK_PROMPT } from '@/lib/gemini';

export interface BankPreset {
  id: string;
  bankName: string;
  bankEmail: string;
  promptTemplate: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'nabil',
    bankName: 'Nabil Bank',
    bankEmail: 'txn-alert@nabilbank.com',
    promptTemplate: DEFAULT_NABIL_BANK_PROMPT,
  },
  {
    id: 'nic-asia',
    bankName: 'NIC Asia Bank',
    bankEmail: 'alerts@nicasiabank.com',
    promptTemplate: DEFAULT_GENERIC_BANK_PROMPT,
  },
  {
    id: 'global-ime',
    bankName: 'Global IME Bank',
    bankEmail: 'alerts@globalimebank.com',
    promptTemplate: DEFAULT_GENERIC_BANK_PROMPT,
  },
  {
    id: 'esewa',
    bankName: 'eSewa',
    bankEmail: 'noreply@esewa.com.np',
    promptTemplate: DEFAULT_GENERIC_BANK_PROMPT,
  },
  {
    id: 'khalti',
    bankName: 'Khalti',
    bankEmail: 'noreply@khalti.com',
    promptTemplate: DEFAULT_GENERIC_BANK_PROMPT,
  },
  {
    id: 'custom',
    bankName: 'Custom',
    bankEmail: '',
    promptTemplate: DEFAULT_GENERIC_BANK_PROMPT,
  },
];
