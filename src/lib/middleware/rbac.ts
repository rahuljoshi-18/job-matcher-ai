import { Role } from '@/generated/prisma';
import { AuthorizationError } from '@/lib/errors';

type Permission = 'read:jobs' | 'write:jobs' | 'read:users' | 'write:users' | 'manage:domain';

const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: ['read:jobs', 'write:jobs', 'read:users', 'write:users', 'manage:domain'],
  COMPANY_ADMIN: ['read:jobs', 'write:jobs', 'read:users', 'write:users'],
  RECRUITER: ['read:jobs', 'write:jobs', 'read:users'],
  CANDIDATE: ['read:jobs'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    // Throw AuthorizationError so handleRouteError returns a proper 403 response
    // instead of an unhandled 500 from a generic Error.
    throw new AuthorizationError('Forbidden: Insufficient permissions');
  }
}
