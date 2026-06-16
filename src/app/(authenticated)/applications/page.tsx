'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Briefcase, CheckCircle, Clock, FileText, UserCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplications } from '@/hooks/useApplications';
import { useCurrentUser } from '@/hooks/useUsers';
import type { ApplicationStatus } from '@/generated/prisma';

const statusOptions: Array<{ label: string; value?: ApplicationStatus }> = [
  { label: 'All Applications' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Reviewed', value: 'REVIEWED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const statusIcons: Record<ApplicationStatus, typeof Clock> = {
  PENDING: Clock,
  REVIEWED: FileText,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
};

const statusBadgeClass: Record<ApplicationStatus, string> = {
  PENDING: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  REVIEWED: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ACCEPTED: 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400',
  REJECTED: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
};

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const selectedStatus = searchParams.get('status') as ApplicationStatus | null;
  const { data: applications, isLoading } = useApplications();
  const { data: currentUser } = useCurrentUser();

  const isHiringRole =
    currentUser?.role === 'RECRUITER' ||
    currentUser?.role === 'COMPANY_ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN';

  const filteredApplications = useMemo(() => {
    const list = applications || [];
    if (!selectedStatus) return list;
    return list.filter((application) => application.status === selectedStatus);
  }, [applications, selectedStatus]);

  const pageTitle = selectedStatus
    ? `${statusOptions.find((option) => option.value === selectedStatus)?.label || 'Filtered'} Applications`
    : isHiringRole
      ? 'All Applications'
      : 'My Applications';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isHiringRole
                ? 'Review candidates and open the related job applicant list.'
                : 'Track the jobs you have applied to.'}
            </p>
          </div>
          {isHiringRole && (
            <Button asChild variant="outline" className="self-start">
              <Link href="/jobs">
                <Briefcase className="mr-2 h-4 w-4" />
                Manage Jobs
              </Link>
            </Button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const isActive = option.value ? selectedStatus === option.value : !selectedStatus;
            const href = option.value ? `/applications?status=${option.value}` : '/applications';

            return (
              <Button key={option.label} asChild variant={isActive ? 'default' : 'outline'} size="sm">
                <Link href={href}>{option.label}</Link>
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-48" />
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="font-medium">No applications found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedStatus ? 'Try a different status filter.' : 'Applications will appear here once candidates apply.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredApplications.map((application) => {
              const StatusIcon = statusIcons[application.status];
              const score = Math.round(application.matchingScore || 0);

              return (
                <Card key={application.id} className="border-muted">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-lg">
                          {application.job?.title || 'Untitled job'}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {application.job?.description || 'No job description available.'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${statusBadgeClass[application.status]}`}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {application.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Candidate</p>
                        <p className="truncate text-sm font-medium">
                          {application.user?.email || 'Unknown candidate'}
                        </p>
                      </div>
                      <div className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Match Score</p>
                        <p className="text-sm font-medium">{score}%</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {application.job?.requiredSkills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {(application.job?.requiredSkills.length || 0) > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{(application.job?.requiredSkills.length || 0) - 6} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/jobs/${application.jobId}`}>
                          <Briefcase className="mr-2 h-4 w-4" />
                          View Job
                        </Link>
                      </Button>
                      {isHiringRole && (
                        <Button asChild className="flex-1">
                          <Link href={`/jobs/${application.jobId}/applicants`}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Review Candidates
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="mb-8 h-10 w-64" />
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-48" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
