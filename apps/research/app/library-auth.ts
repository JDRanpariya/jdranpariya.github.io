import { ADMIN_EMAIL, getAdminUser, requireAdminUser, type AdminUser } from "@/app/admin-auth";

export const LIBRARY_OWNER_EMAIL = ADMIN_EMAIL;

export function isLibraryOwner(user: AdminUser | null): user is AdminUser {
  return Boolean(user && user.email.toLowerCase() === LIBRARY_OWNER_EMAIL);
}

export async function requireLibraryOwner(returnTo: string): Promise<AdminUser> {
  return requireAdminUser(returnTo);
}

export async function getLibraryOwner(): Promise<AdminUser | null> {
  return getAdminUser();
}
