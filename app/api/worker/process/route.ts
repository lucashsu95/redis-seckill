import { NextRequest, NextResponse } from 'next/server';
import { processOrders } from '@/lib/worker';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await processOrders(50);
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error('Worker Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}