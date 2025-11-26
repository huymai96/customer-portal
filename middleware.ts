import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes - no auth required
const isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/product(.*)',
  '/category(.*)',
  '/api/products(.*)',
  '/api/health(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Staff-only routes - require staff/admin role
const isStaffRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/quotes/pending(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Require auth for all other routes
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Check staff routes
  if (isStaffRoute(req)) {
    const userRole = (sessionClaims?.metadata as { role?: string })?.role;
    const isStaff = userRole === 'staff' || userRole === 'admin';
    
    if (!isStaff) {
      // Redirect non-staff to portal home
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
