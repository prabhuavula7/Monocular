import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/create-org',
  '/intake/(.*)',
  '/api/intake/(.*)',
  '/api/webhooks/(.*)',
  '/api/inngest',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
