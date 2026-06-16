import { Role } from '@/generated/prisma';

export function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.trim().toLowerCase());
}

export function getRoleForEmail(email: string, fallbackRole?: Role): Role {
  return isAdminEmail(email) ? Role.SUPER_ADMIN : fallbackRole || Role.CANDIDATE;
}
