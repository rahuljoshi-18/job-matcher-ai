'use client';

import Link from 'next/link';
import { BarChart3, Briefcase, CheckCircle, Clock, FileText, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplications } from '@/hooks/useApplications';
import { useJobs } from '@/hooks/useJobs';
import { useCurrentUser } from '@/hooks/useUsers';
import type { LucideIcon } from 'lucide-react';

type StatusRow = {
  label: string;
  count: number;
  Icon: LucideIcon;
};

export default function JobAnalyticsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: applications, isLoading: applicationsLoading } = useApplications();

  const canViewAnalytics =
    currentUser?.role === 'RECRUITER' ||
    currentUser?.role === 'COMPANY_ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN';

  const totalJobs = jobs?.length || 0;
  const activeJobs = jobs?.filter((job) => job.status === 'ACTIVE').length || 0;
  const closedJobs = jobs?.filter((job) => job.status === 'CLOSED').length || 0;
  const totalApplications = applications?.length || 0;
  const pendingApplications = applications?.filter((application) => application.status === 'PENDING').length || 0;
  const acceptedApplications = applications?.filter((application) => application.status === 'ACCEPTED').length || 0;
  const acceptanceRate = totalApplications > 0 ? Math.round((acceptedApplications / totalApplications) * 100) : 0;
  const statusRows: StatusRow[] = [
    { label: 'Pending', count: pendingApplications, Icon: Clock },
    { label: 'Accepted', count: acceptedApplications, Icon: CheckCircle },
    {
      label: 'Reviewed',
      count: applications?.filter((application) => application.status === 'REVIEWED').length || 0,
      Icon: Users,
    },
    {
      label: 'Rejected',
      count: applications?.filter((application) => application.status === 'REJECTED').length || 0,
      Icon: FileText,
    },
  ];

  const applicationsByJob = (jobs || [])
    .map((job) => ({
      job,
      applications: applications?.filter((application) => application.jobId === job.id) || [],
    }))
    .sort((a, b) => b.applications.length - a.applications.length);

  if (userLoading || jobsLoading || applicationsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-8 h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canViewAnalytics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>Only hiring users can view job analytics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Analytics</h1>
            <p className="mt-2 text-sm text-muted-foreground">Performance metrics across your visible job postings.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/jobs/manage">
              <Briefcase className="mr-2 h-4 w-4" />
              Manage Jobs
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalJobs}</div>
              <p className="text-xs text-muted-foreground">{activeJobs} active, {closedJobs} closed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">{pendingApplications} pending review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{acceptedApplications}</div>
              <p className="text-xs text-muted-foreground">Successful candidates</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{acceptanceRate}%</div>
              <p className="text-xs text-muted-foreground">Accepted out of total applications</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Applications by Job
              </CardTitle>
              <CardDescription>Jobs with the strongest applicant activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {applicationsByJob.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No job data available.
                </div>
              ) : (
                applicationsByJob.map(({ job, applications: jobApplications }) => {
                  const width = totalApplications > 0 ? (jobApplications.length / totalApplications) * 100 : 0;

                  return (
                    <div key={job.id} className="space-y-2 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/jobs/${job.id}`} className="truncate font-medium hover:underline">
                          {job.title}
                        </Link>
                        <Badge variant="outline">{jobApplications.length}</Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Pipeline</CardTitle>
              <CardDescription>Application status breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusRows.map(({ label, count, Icon }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
