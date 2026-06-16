'use client';

import { useUser } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useUsers';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { CompanyAdminDashboard } from '@/components/dashboard/company-admin-dashboard';
import { RecruiterDashboard } from '@/components/dashboard/recruiter-dashboard';
import { CandidateDashboard } from '@/components/dashboard/candidate-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { user: clerkUser } = useUser();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const role = currentUser?.role || 'CANDIDATE';

  const roleStyles = useMemo(() => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          gradient: 'bg-gradient-to-br from-background via-background to-amber-500/5',
          badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          label: 'Platform Super Admin',
        };
      case 'COMPANY_ADMIN':
        return {
          gradient: 'bg-gradient-to-br from-background via-background to-purple-500/5',
          badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
          label: 'Company Administrator',
        };
      case 'RECRUITER':
        return {
          gradient: 'bg-gradient-to-br from-background via-background to-emerald-500/5',
          badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          label: 'Talent Acquisition Partner',
        };
      default:
        return {
          gradient: 'bg-gradient-to-br from-background via-background to-indigo-500/5',
          badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          label: 'Candidate Profile',
        };
    }
  }, [role]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${roleStyles.gradient} transition-all duration-500`}>
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-1">
              Welcome back, {clerkUser?.firstName || 'User'}! 👋
            </h2>
            {role !== 'CANDIDATE' && (
              <p className="text-sm text-muted-foreground">
                {role === 'SUPER_ADMIN' && "Manage the entire platform from here."}
                {role === 'COMPANY_ADMIN' && "Oversee your organization and recruiting team."}
                {role === 'RECRUITER' && "Manage your job postings and review applications."}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`text-xs px-3 py-1 font-bold border ${roleStyles.badge} self-start sm:self-center shrink-0`}>
            {roleStyles.label}
          </Badge>
        </div>

        {/* Role-specific Dashboard */}
        {role === 'SUPER_ADMIN' && <SuperAdminDashboard />}
        {role === 'COMPANY_ADMIN' && <CompanyAdminDashboard />}
        {role === 'RECRUITER' && <RecruiterDashboard />}
        {role === 'CANDIDATE' && <CandidateDashboard />}
      </main>
    </div>
  );
}
