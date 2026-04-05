import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporary passthrough — re-add Clerk auth after confirming routing works
export function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
