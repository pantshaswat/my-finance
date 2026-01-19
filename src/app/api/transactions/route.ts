import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  
  const transactions = await Transaction.find({ userId: user._id })
    .populate('categoryId')
    .sort({ date: -1 })
    .limit(100);

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  
  const transaction = await Transaction.create({
    userId: user._id,
    ...body,
    source: 'manual',
  });

  return NextResponse.json(transaction, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { _id, ...updateData } = await req.json();
  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  
  const transaction = await Transaction.findOneAndUpdate(
    { _id, userId: user._id },
    updateData,
    { new: true }
  );

  return NextResponse.json(transaction);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  
  await Transaction.deleteOne({ _id: id, userId: user._id });

  return NextResponse.json({ success: true });
}