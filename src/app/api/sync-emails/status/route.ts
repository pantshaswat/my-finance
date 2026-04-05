import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import SyncJob from '@/models/SyncJob';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  const job = jobId
    ? await SyncJob.findOne({ _id: jobId, userId: user._id })
    : await SyncJob.findOne({ userId: user._id }).sort({ createdAt: -1 });

  if (!job) return NextResponse.json({ job: null });

  return NextResponse.json({
    job: {
      _id: job._id,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      totals: job.totals,
      perBank: job.perBank,
      currentBank: job.currentBank,
      currentMessage: job.currentMessage,
      error: job.error,
    },
  });
}
