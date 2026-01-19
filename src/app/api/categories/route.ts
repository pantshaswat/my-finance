import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Category from '@/models/Category';
import { authOptions } from '@/lib/auth';
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  
  const categories = await Category.find({ userId: user._id }).sort({ name: 1 });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  
  const category = await Category.create({
    userId: user._id,
    ...body,
  });

  return NextResponse.json(category, { status: 201 });
}