import { NextRequest, NextResponse } from 'next/server';
import {
  completeCloudPrntJob,
  getCloudPrntPrinter,
  getCloudPrntTicket,
  getNextCloudPrntJob,
  recordCloudPrntPoll,
} from '@/lib/cloudprnt-service';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const printer = await getCloudPrntPrinter(token);
  if (!printer) return new NextResponse(null, { status: 404 });

  const jobToken = request.nextUrl.searchParams.get('token');
  const mediaType = request.nextUrl.searchParams.get('type') || 'text/plain';

  if (!jobToken) {
    return new NextResponse(null, { status: 404 });
  }

  if (mediaType !== 'text/plain') {
    return new NextResponse(null, { status: 415 });
  }

  const ticket = await getCloudPrntTicket(printer.id, jobToken);
  if (!ticket) return new NextResponse(null, { status: 404 });

  return new NextResponse(ticket, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Star-Cut': 'full; feed=true',
      'X-Star-Buzzerstartpattern': '1',
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const printer = await getCloudPrntPrinter(token);
  if (!printer) return NextResponse.json({ jobReady: false }, { status: 404 });

  const poll = await request.json().catch(() => ({}));
  await recordCloudPrntPoll(printer.id, poll);

  if (poll.printingInProgress || poll.statusCode?.startsWith('200') === false) {
    return NextResponse.json({ jobReady: false });
  }

  const job = await getNextCloudPrntJob(printer.id);
  if (!job) return NextResponse.json({ jobReady: false });

  return NextResponse.json({
    jobReady: true,
    mediaTypes: ['text/plain'],
    jobToken: job.id,
    deleteMethod: 'DELETE',
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const printer = await getCloudPrntPrinter(token);
  if (!printer) return new NextResponse(null, { status: 404 });

  const jobToken = request.nextUrl.searchParams.get('token');
  if (!jobToken) return new NextResponse(null, { status: 404 });

  await completeCloudPrntJob(
    printer.id,
    jobToken,
    request.nextUrl.searchParams.get('code') || '200 OK'
  );

  return NextResponse.json({ ok: true });
}
