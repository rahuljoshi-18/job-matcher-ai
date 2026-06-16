'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import Link from 'next/link';
import { 
  Briefcase, 
  FileText, 
  PlusCircle,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';

export function RecruiterDashboard() {
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: applications, isLoading: applicationsLoading } = useApplications();

  const stats = {
    totalJobs: jobs?.length || 0,
    totalApplications: applications?.length || 0,
    pendingApplications: applications?.filter(app => app.status === 'PENDING').length || 0,
    reviewedApplications: applications?.filter(app => app.status === 'REVIEWED').length || 0,
    acceptedApplications: applications?.filter(app => app.status === 'ACCEPTED').length || 0,
    rejectedApplications: applications?.filter(app => app.status === 'REJECTED').length || 0,
  };

  return (
    <div className="space-y-8">
      {/* Recruiter Overview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-6 w-6 text-secondary" />
          <h3 className="text-2xl font-bold">Recruiter Dashboard</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">Active postings</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                  <p className="text-xs text-muted-foreground">Total received</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hired</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.acceptedApplications}</div>
                  <p className="text-xs text-muted-foreground">Successful hires</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recruiter Actions */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-secondary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <PlusCircle className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-lg">Create Job</CardTitle>
                </div>
                <CardDescription>
                  Post a new job opening
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <Link href="/jobs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Job Posting
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <Link href="/jobs/upload">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Jobs (CSV)
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-secondary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <Briefcase className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-lg">Manage Jobs</CardTitle>
                </div>
                <CardDescription>
                  View and edit your postings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <Link href="/jobs/manage">
                    <Briefcase className="mr-2 h-4 w-4" />
                    View All Jobs
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-secondary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-lg">Job Analytics</CardTitle>
                </div>
                <CardDescription>
                  View performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <Link href="/jobs/analytics">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Current pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <Badge variant="outline">{stats.pendingApplications}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Reviewed</span>
                  </div>
                  <Badge variant="outline">{stats.reviewedApplications}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Accepted</span>
                  </div>
                  <Badge variant="outline">{stats.acceptedApplications}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  <Badge variant="outline">{stats.rejectedApplications}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Review applications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/applications?status=PENDING">
                    <Clock className="mr-2 h-4 w-4" />
                    Review Pending ({stats.pendingApplications})
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/applications">
                    <FileText className="mr-2 h-4 w-4" />
                    View All Applications
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/applications?status=ACCEPTED">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accepted Candidates
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
