import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import BankPrompt from '@/models/BankPrompt';
import ProcessedEmail from '@/models/ProcessedEmail';
import SyncJob from '@/models/SyncJob';
import { fetchEmailsFromSender, EmailMessage } from '@/lib/gmail';
import { parseEmailWithGemini, GeminiQuotaError } from '@/lib/gemini';

const MAX_EMAILS_PER_BANK = 50;

/**
 * Access tokens are held in memory only for the lifetime of the sync job.
 * Never persisted. If the server restarts mid-sync, the job is orphaned
 * and the user can start a new one.
 */
const tokenRegistry = new Map<string, string>();

export function registerToken(jobId: string, accessToken: string) {
  tokenRegistry.set(jobId, accessToken);
}

function consumeToken(jobId: string): string | undefined {
  const t = tokenRegistry.get(jobId);
  tokenRegistry.delete(jobId);
  return t;
}
// If a `processing` row is older than this we assume a previous sync was
// interrupted mid-flight and we allow reclaim.
const STALE_PROCESSING_MS = 5 * 60 * 1000;

interface BankTally {
  bankEmail: string;
  fetched: number;
  parsed: number;
  ignored: number;
  skipped: number;
  failed: number;
  error?: string;
}

/**
 * Atomically claim an email for processing. Returns true if we inserted a new
 * `processing` row (caller is the owner) or reclaimed a stale one. Returns
 * false if another run has already handled it.
 */
async function claimEmail(
  userId: mongoose.Types.ObjectId,
  bankEmail: string,
  email: EmailMessage
): Promise<'claimed' | 'already-done' | 'already-failed'> {
  try {
    await ProcessedEmail.create({
      userId,
      bankEmail,
      emailId: email.id,
      status: 'processing',
      emailDate: email.internalDate ? new Date(email.internalDate) : undefined,
      attempts: 1,
    });
    return 'claimed';
  } catch (err: any) {
    // Duplicate key — already seen. Check status.
    if (err?.code !== 11000) throw err;

    const existing = await ProcessedEmail.findOne({ userId, emailId: email.id });
    if (!existing) return 'already-done';

    if (existing.status === 'parsed' || existing.status === 'ignored') {
      return 'already-done';
    }

    // Reclaim stale `processing` rows from an interrupted sync.
    if (
      existing.status === 'processing' &&
      Date.now() - existing.updatedAt.getTime() > STALE_PROCESSING_MS
    ) {
      existing.attempts += 1;
      existing.updatedAt = new Date();
      await existing.save();
      return 'claimed';
    }

    // `failed` / `skipped` / recent `processing` → do not retry automatically.
    return 'already-failed';
  }
}

async function resolveCategory(
  userId: mongoose.Types.ObjectId,
  name: string | undefined,
  type: 'income' | 'expense'
) {
  const catName = (name || 'Uncategorized').trim();
  let category = await Category.findOne({
    userId,
    name: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    type,
  });
  if (!category) {
    category = await Category.create({ userId, name: catName, type });
  }
  return category;
}

async function updateJob(jobId: mongoose.Types.ObjectId, patch: any) {
  await SyncJob.updateOne({ _id: jobId }, { $set: patch });
}

async function processBank(
  jobId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  accessToken: string,
  bankEmail: string,
  categoryNames: string[]
): Promise<BankTally> {
  const tally: BankTally = {
    bankEmail,
    fetched: 0,
    parsed: 0,
    ignored: 0,
    skipped: 0,
    failed: 0,
  };

  const bankPrompt = await BankPrompt.findOne({ userId, bankEmail });
  if (!bankPrompt) {
    tally.error = 'No prompt configured';
    return tally;
  }

  // Use the per-bank cursor; fall back to linkedAt.
  const startDate = bankPrompt.lastSyncedAt || bankPrompt.linkedAt;

  await updateJob(jobId, {
    currentBank: bankEmail,
    currentMessage: `Fetching emails from ${bankEmail}…`,
  });

  let emails: EmailMessage[] = [];
  try {
    emails = await fetchEmailsFromSender(
      accessToken,
      bankEmail,
      startDate,
      MAX_EMAILS_PER_BANK
    );
  } catch (err: any) {
    tally.error = `Gmail fetch failed: ${err?.message || 'unknown'}`;
    return tally;
  }

  tally.fetched = emails.length;

  // Oldest-first so the cursor advances safely.
  emails.sort((a, b) => a.internalDate - b.internalDate);

  let newestProcessed = startDate;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    await updateJob(jobId, {
      currentMessage: `[${bankEmail}] parsing ${i + 1}/${emails.length}…`,
    });

    const claim = await claimEmail(userId, bankEmail, email);
    if (claim === 'already-done') {
      tally.skipped++;
      continue;
    }
    if (claim === 'already-failed') {
      tally.skipped++;
      continue;
    }

    if (!email.body || email.body.trim().length === 0) {
      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'failed', reason: 'empty body' } }
      );
      tally.failed++;
      continue;
    }

    let parsed;
    try {
      parsed = await parseEmailWithGemini(
        email.body,
        bankPrompt.promptTemplate,
        categoryNames
      );
    } catch (err: any) {
      // Quota exhaustion is not this email's fault — release the claim so
      // it can be retried naturally on the next sync, then abort the job.
      if (err instanceof GeminiQuotaError) {
        await ProcessedEmail.deleteOne({ userId, emailId: email.id });
        throw err;
      }
      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'failed', reason: err?.message || 'gemini error' } }
      );
      tally.failed++;
      continue;
    }

    if (!parsed) {
      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'failed', reason: 'parse returned null' } }
      );
      tally.failed++;
      continue;
    }

    if (parsed.isTransaction === false) {
      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'ignored', reason: parsed.ignoreReason || 'not a transaction' } }
      );
      tally.ignored++;
      continue;
    }

    if (!parsed.type || !parsed.amount || !parsed.date) {
      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'failed', reason: 'missing required fields' } }
      );
      tally.failed++;
      continue;
    }

    try {
      const category = await resolveCategory(userId, parsed.suggestedCategory, parsed.type);
      const txn = await Transaction.create({
        userId,
        categoryId: category._id,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description || '(no description)',
        date: new Date(parsed.date),
        source: 'email',
        emailId: email.id,
        merchant: parsed.merchant,
        reference: parsed.reference,
        currency: parsed.currency,
        balanceAfter: parsed.balanceAfter,
      });

      await ProcessedEmail.updateOne(
        { userId, emailId: email.id },
        { $set: { status: 'parsed', transactionId: txn._id } }
      );

      if (!categoryNames.includes(category.name)) categoryNames.push(category.name);
      tally.parsed++;
    } catch (err: any) {
      // Transaction insert could fail on duplicate emailId (legacy data). Mark
      // as parsed anyway since someone else already created the txn.
      if (err?.code === 11000) {
        await ProcessedEmail.updateOne(
          { userId, emailId: email.id },
          { $set: { status: 'parsed', reason: 'txn already existed' } }
        );
        tally.skipped++;
      } else {
        await ProcessedEmail.updateOne(
          { userId, emailId: email.id },
          { $set: { status: 'failed', reason: err?.message || 'db insert failed' } }
        );
        tally.failed++;
      }
    }

    const emailDate = email.internalDate ? new Date(email.internalDate) : null;
    if (emailDate && emailDate > newestProcessed) newestProcessed = emailDate;
  }

  // Advance cursor for this bank.
  bankPrompt.lastSyncedAt = newestProcessed;
  await bankPrompt.save();

  return tally;
}

/**
 * Run the sync job. Invoked via fire-and-forget from the start endpoint —
 * the caller MUST NOT await this. The job row is the source of truth for
 * progress, so the HTTP client can disconnect and still see the result.
 */
export async function runSyncJob(jobId: mongoose.Types.ObjectId) {
  try {
    await dbConnect();
    const job = await SyncJob.findById(jobId);
    if (!job) return;

    const user = await User.findById(job.userId);
    if (!user) {
      await updateJob(jobId, { status: 'failed', error: 'user not found', finishedAt: new Date() });
      return;
    }

    const accessToken = consumeToken(String(jobId));
    if (!accessToken) {
      await updateJob(jobId, { status: 'failed', error: 'no access token', finishedAt: new Date() });
      return;
    }

    const bankEmails: string[] = user.bankEmailAddresses || [];
    if (bankEmails.length === 0) {
      await updateJob(jobId, {
        status: 'failed',
        error: 'no bank emails configured',
        finishedAt: new Date(),
      });
      return;
    }

    await updateJob(jobId, { status: 'running' });

    const categories = await Category.find({ userId: user._id });
    const categoryNames = categories.map((c) => c.name);

    const totals = { fetched: 0, parsed: 0, ignored: 0, skipped: 0, failed: 0 };
    const perBank: BankTally[] = [];

    for (const bankEmail of bankEmails) {
      try {
        const tally = await processBank(
          jobId,
          user._id,
          accessToken,
          bankEmail,
          categoryNames
        );
        perBank.push(tally);
        totals.fetched += tally.fetched;
        totals.parsed += tally.parsed;
        totals.ignored += tally.ignored;
        totals.skipped += tally.skipped;
        totals.failed += tally.failed;
        await updateJob(jobId, { perBank, totals });
      } catch (err: any) {
        if (err instanceof GeminiQuotaError) {
          await updateJob(jobId, {
            status: 'failed',
            error: err.message,
            currentBank: undefined,
            currentMessage: 'Aborted — Gemini quota exhausted',
            perBank,
            totals,
            finishedAt: new Date(),
          });
          return;
        }
        throw err;
      }
    }

    await updateJob(jobId, {
      status: 'completed',
      finishedAt: new Date(),
      currentBank: undefined,
      currentMessage: 'Done',
      perBank,
      totals,
    });
  } catch (err: any) {
    console.error('sync job crashed', err);
    await updateJob(jobId, {
      status: 'failed',
      error: err?.message || 'unknown error',
      finishedAt: new Date(),
    });
  }
}
