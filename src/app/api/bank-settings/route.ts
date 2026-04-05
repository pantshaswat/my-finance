import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import BankPrompt from '@/models/BankPrompt';
import ProcessedEmail from '@/models/ProcessedEmail';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const prompts = await BankPrompt.find({ userId: user._id }).sort({ createdAt: 1 });

  // Compute per-bank stats (parsed/ignored/failed) from ProcessedEmail.
  const statsAgg = await ProcessedEmail.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: { bankEmail: '$bankEmail', status: '$status' }, count: { $sum: 1 } } },
  ]);
  const statsByBank: Record<string, Record<string, number>> = {};
  for (const row of statsAgg) {
    const { bankEmail, status } = row._id;
    statsByBank[bankEmail] ??= {};
    statsByBank[bankEmail][status] = row.count;
  }

  return NextResponse.json({
    bankEmails: user.bankEmailAddresses || [],
    prompts: prompts.map((p) => ({
      bankEmail: p.bankEmail,
      bankName: p.bankName,
      promptTemplate: p.promptTemplate,
      linkedAt: p.linkedAt,
      lastSyncedAt: p.lastSyncedAt,
      stats: statsByBank[p.bankEmail] || {},
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bankEmail, bankName, promptTemplate } = await req.json();
  if (!bankEmail || !promptTemplate) {
    return NextResponse.json(
      { error: 'bankEmail and promptTemplate are required' },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!user.bankEmailAddresses.includes(bankEmail)) {
    user.bankEmailAddresses.push(bankEmail);
    await user.save();
  }

  const existing = await BankPrompt.findOne({ userId: user._id, bankEmail });
  if (existing) {
    existing.promptTemplate = promptTemplate;
    if (bankName !== undefined) existing.bankName = bankName;
    await existing.save();
  } else {
    await BankPrompt.create({
      userId: user._id,
      bankEmail,
      bankName,
      promptTemplate,
      linkedAt: new Date(),
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bankEmail = searchParams.get('email');
  if (!bankEmail) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  user.bankEmailAddresses = user.bankEmailAddresses.filter((e: string) => e !== bankEmail);
  await user.save();
  await BankPrompt.deleteOne({ userId: user._id, bankEmail });

  return NextResponse.json({ success: true });
}
