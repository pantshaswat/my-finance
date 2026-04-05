import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import SyncJob from '@/models/SyncJob';
import { authOptions } from '@/lib/auth';
import { runSyncJob, registerToken } from '@/lib/syncRunner';

/**
 * POST /api/sync-emails → starts a background sync job and returns its id.
 * The client polls /api/sync-emails/status?jobId=... until status is
 * completed or failed. If the browser tab closes mid-sync, the job row
 * keeps being updated server-side so the user sees the result on return.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Refuse to start a new job while one is in-flight for this user.
  const inflight = await SyncJob.findOne({
    userId: user._id,
    status: { $in: ['queued', 'running'] },
  });
  if (inflight) {
    return NextResponse.json({ jobId: inflight._id, reused: true });
  }

  const job = await SyncJob.create({
    userId: user._id,
    status: 'queued',
    startedAt: new Date(),
  });

  registerToken(String(job._id), accessToken);
  // Fire-and-forget. Do NOT await.
  runSyncJob(job._id).catch((e) => console.error('runSyncJob rejected', e));

  return NextResponse.json({ jobId: job._id, reused: false });
}
