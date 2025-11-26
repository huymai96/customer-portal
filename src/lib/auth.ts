/**
 * Clerk Auth Utilities
 * 
 * Helper functions for authentication and authorization
 */

import { auth, currentUser } from '@clerk/nextjs/server';

export type UserRole = 'customer' | 'staff' | 'admin';

export interface UserMetadata {
  role?: UserRole;
  companyId?: string;
  accountManagerEmail?: string;
}

/**
 * Get the current user's role from Clerk metadata
 */
export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as UserMetadata | undefined;
  return metadata?.role || 'customer';
}

/**
 * Check if current user is staff or admin
 */
export async function isStaffUser(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'staff' || role === 'admin';
}

/**
 * Check if current user is admin
 */
export async function isAdminUser(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Get current user with metadata
 */
export async function getCurrentUser() {
  const user = await currentUser();
  if (!user) return null;
  
  const metadata = user.publicMetadata as UserMetadata;
  
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: metadata?.role || 'customer',
    companyId: metadata?.companyId,
    accountManagerEmail: metadata?.accountManagerEmail,
  };
}

/**
 * Check if an email is a staff email (promosink.com domain)
 */
export function isStaffEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'promosink.com' || domain === 'promosinkwall-e.com';
}

