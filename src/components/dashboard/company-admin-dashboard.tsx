'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/hooks/useUsers';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import Link from 'next/link';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Mail,
  PlusCircle,
  Crown,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

export function CompanyAdminDashboard() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: applications, isLoading: applicationsLoading } = useApplications();

  const stats = {
    totalRecruiters: users?.filter(u => u.role === 'RECRUITER').length || 0,
    totalJobs: jobs?.length || 0,
    totalApplications: applications?.length || 0,
    pendingApplications: applications?.filter(app => app.status === 'PENDING').length || 0,
    reviewedApplications: applications?.filter(app => app.status === 'REVIEWED').length || 0,
    acceptedApplications: applications?.filter(app => app.status === 'ACCEPTED').length || 0,
    rejectedApplications: applications?.filter(app => app.status === 'REJECTED').length || 0,
  };

  return (
    <div className="space-y-8">
      {/* Company Overview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold">Company Dashboard</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recruiters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalRecruiters}</div>
                  <p className="text-xs text-muted-foreground">In your domain</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">Job postings</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/50">
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
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingApplications} pending
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalApplications > 0 
                  ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.acceptedApplications} accepted
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="hiring">Hiring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Manage Recruiters</CardTitle>
                </div>
                <CardDescription>
                  View and manage your recruiting team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link href="/users">
                    <Users className="mr-2 h-4 w-4" />
                    View Team
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Invite Recruiters</CardTitle>
                </div>
                <CardDescription>
                  Send invitations to new recruiters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link href="/invitations">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Manage Jobs</CardTitle>
                </div>
                <CardDescription>
                  Oversee all job postings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link href="/jobs/manage">
                    <Briefcase className="mr-2 h-4 w-4" />
                    View Jobs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hiring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Pipeline</CardTitle>
                <CardDescription>Current hiring status</CardDescription>
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
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/jobs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Job
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/applications">
                    <FileText className="mr-2 h-4 w-4" />
                    Review Applications
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/invitations">
                    <Mail className="mr-2 h-4 w-4" />
                    Invite Recruiter
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Metrics</CardTitle>
              <CardDescription>Performance overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Applications</span>
                  <span className="font-bold">{stats.totalApplications}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Acceptance Rate</span>
                  <span className="font-bold">
                    {stats.totalApplications > 0 
                      ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ 
                      width: `${stats.totalApplications > 0 
                        ? (stats.acceptedApplications / stats.totalApplications) * 100
                        : 0}%` 
                    }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
