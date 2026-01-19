import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import BankPrompt from '@/models/BankPrompt';
import { fetchEmailsFromSender } from '@/lib/gmail';
import { parseEmailWithGemini, DEFAULT_NABIL_BANK_PROMPT } from '@/lib/gemini';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const accessToken = (session as any).accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }

  const bankEmails = user.bankEmailAddresses || [];
  if (bankEmails.length === 0) {
    return NextResponse.json({ 
      error: 'No bank emails configured. Please add bank emails in settings.' 
    }, { status: 400 });
  }

  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const maxEmailsPerSync = 20; // Limit to avoid rate limits

  const allCategories = await Category.find({ userId: user._id });
  const categoryNames = allCategories.map(c => c.name);

  for (const bankEmail of bankEmails) {
    try {
      const bankPrompt = await BankPrompt.findOne({ userId: user._id, bankEmail });
      if (!bankPrompt) {
        console.log(`No prompt configured for ${bankEmail}, skipping`);
        continue;
      }
      
      const promptTemplate = bankPrompt.promptTemplate || DEFAULT_NABIL_BANK_PROMPT;
      const linkedAt = bankPrompt.linkedAt;

      // Find the most recent email we've already processed for this bank
      const lastProcessed = await Transaction.findOne({
        userId: user._id,
        source: 'email',
        emailId: { $exists: true }
      }).sort({ createdAt: -1 });

      // Use the later of linkedAt or last processed date
      let startDate = linkedAt;
      if (lastProcessed && lastProcessed.createdAt > linkedAt) {
        startDate = lastProcessed.createdAt;
      }

      const emails = await fetchEmailsFromSender(accessToken, bankEmail, startDate, 50);
      console.log(`Found ${emails.length} emails from ${bankEmail} after ${startDate}`);

      // Process only a limited number to avoid rate limits
      const emailsToProcess = emails.slice(0, maxEmailsPerSync);
      if (emails.length > maxEmailsPerSync) {
        console.log(`Limiting to ${maxEmailsPerSync} emails to avoid rate limits`);
      }

      for (const email of emailsToProcess) {
        const exists = await Transaction.findOne({ emailId: email.id });
        if (exists) {
          console.log(`Email ${email.id} already processed, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`Processing email ${email.id} from ${email.date}`);
        console.log(`Subject: ${email.subject}`);
        console.log(`Body length: ${email.body?.length || 0} characters`);
        
        if (!email.body || email.body.trim().length === 0) {
          console.error(`Email ${email.id} has no body content`);
          errorCount++;
          continue;
        }

        const transactionData = await parseEmailWithGemini(email.body, promptTemplate, categoryNames);
        
        if (!transactionData) {
          console.error(`Failed to parse email ${email.id}`);
          errorCount++;
          continue;
        }

        // Validate required fields
        if (!transactionData.type || !transactionData.amount || !transactionData.date) {
          console.error(`Missing required fields in parsed data for email ${email.id}`);
          errorCount++;
          continue;
        }

        let category = await Category.findOne({
          userId: user._id,
          name: { $regex: new RegExp(`^${transactionData.suggestedCategory}$`, 'i') },
          type: transactionData.type,
        });

        if (!category) {
          category = await Category.create({
            userId: user._id,
            name: transactionData.suggestedCategory || 'Uncategorized',
            type: transactionData.type,
          });
        }

        await Transaction.create({
          userId: user._id,
          categoryId: category._id,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          date: new Date(transactionData.date),
          source: 'email',
          emailId: email.id,
        });

        processedCount++;
      }
    } catch (error) {
      console.error(`Error processing emails from ${bankEmail}:`, error);
      errorCount++;
    }
  }

  return NextResponse.json({ 
    success: true, 
    processed: processedCount,
    skipped: skippedCount,
    errors: errorCount,
    message: `Processed ${processedCount} new transactions, skipped ${skippedCount} existing${errorCount > 0 ? `, ${errorCount} errors` : ''}`
  });
}