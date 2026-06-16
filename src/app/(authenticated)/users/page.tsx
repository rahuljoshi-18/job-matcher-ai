'use client';

import { useCurrentUser, useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const { data: users, isLoading: usersLoading } = useUsers();

  const isAuthorized = currentUser && currentUser.role !== 'CANDIDATE';

  if (currentUserLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>
                User management is available for Company Admins, Recruiters, and Super Admins only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>
                  See users in your organization and platform-wide (Super Admin only).
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-20 rounded-md border bg-muted p-4" />
                ))}
              </div>
            ) : users?.length ? (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Role: {user.role}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Domain: {user.domainId ?? 'Platform'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
