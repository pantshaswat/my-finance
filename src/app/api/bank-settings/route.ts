import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import BankPrompt from '@/models/BankPrompt';
import { authOptions } from '@/lib/auth'; 

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  
  const prompts = await BankPrompt.find({ userId: user._id });
  
  const settings = {
    bankEmails: user.bankEmailAddresses || [],
    prompts: prompts.map(p => ({
      bankEmail: p.bankEmail,
      promptTemplate: p.promptTemplate,
      linkedAt: p.linkedAt,
    })),
  };

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bankEmail, promptTemplate } = await req.json();
  
  if (!bankEmail || !promptTemplate) {
    return NextResponse.json({ 
      error: 'Bank email and prompt template are required' 
    }, { status: 400 });
  }

  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  
  // Add bank email if not already present
  if (!user.bankEmailAddresses.includes(bankEmail)) {
    user.bankEmailAddresses.push(bankEmail);
    await user.save();
  }

  // Create or update bank prompt with linkedAt date
  const existingPrompt = await BankPrompt.findOne({ userId: user._id, bankEmail });
  
  if (existingPrompt) {
    existingPrompt.promptTemplate = promptTemplate;
    await existingPrompt.save();
  } else {
    await BankPrompt.create({
      userId: user._id,
      bankEmail,
      promptTemplate,
      linkedAt: new Date(), // Start syncing from today when first added
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

  if (!bankEmail) {
    return NextResponse.json({ error: 'Bank email is required' }, { status: 400 });
  }

  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  
  // Remove from user's bank email list
  user.bankEmailAddresses = user.bankEmailAddresses.filter((e: string) => e !== bankEmail);
  await user.save();
  
  // Delete the prompt
  await BankPrompt.deleteOne({ userId: user._id, bankEmail });

  return NextResponse.json({ success: true });
}