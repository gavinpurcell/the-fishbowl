import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_HOSTED_MODE === 'true' && req.nextUrl.pathname.startsWith('/test')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/test/:path*'],
};
