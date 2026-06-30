import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/create-org',
  '/intake/(.*)',
  '/review/(.*)',
  '/api/intake/(.*)',
  '/api/review/(.*)',
  '/api/webhooks/(.*)',
  '/api/inngest',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Dev-only engine test routes (blocked by NODE_ENV check inside the route)
  ...(process.env.NODE_ENV !== 'production' ? ['/api/dev/(.*)'] : []),
])

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
