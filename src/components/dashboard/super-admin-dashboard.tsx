'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/hooks/useUsers';
import { useDomains } from '@/hooks/useDomains';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import Link from 'next/link';
import { 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
 
  Mail,
  BarChart3,
  PlusCircle,
  Shield,
  Activity
} from 'lucide-react';

export function SuperAdminDashboard() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: applications, isLoading: applicationsLoading } = useApplications();

  const stats = {
    totalUsers: users?.length || 0,
    totalDomains: domains?.length || 0,
    totalJobs: jobs?.length || 0,
    totalApplications: applications?.length || 0,
    superAdmins: users?.filter(u => u.role === 'SUPER_ADMIN').length || 0,
    companyAdmins: users?.filter(u => u.role === 'COMPANY_ADMIN').length || 0,
    recruiters: users?.filter(u => u.role === 'RECRUITER').length || 0,
    candidates: users?.filter(u => u.role === 'CANDIDATE').length || 0,
  };

  return (
    <div className="space-y-8">
      {/* Platform Overview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-destructive" />
          <h3 className="text-2xl font-bold">Platform Overview</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.superAdmins} admins, {stats.companyAdmins} company admins
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {domainsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalDomains}</div>
                  <p className="text-xs text-muted-foreground">Active domains</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">Across all domains</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
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
                  <p className="text-xs text-muted-foreground">Platform-wide</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Actions */}
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                    <Building2 className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle className="text-lg">Domains</CardTitle>
                </div>
                <CardDescription>
                  Create and manage organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                  <Link href="/domains">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Manage Domains
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                    <Users className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle className="text-lg">Users</CardTitle>
                </div>
                <CardDescription>
                  Manage all platform users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                  <Link href="/users">
                    <Users className="mr-2 h-4 w-4" />
                    View All Users
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                    <Mail className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle className="text-lg">Invitations</CardTitle>
                </div>
                <CardDescription>
                  Invite users to any domain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                  <Link href="/invitations">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Users by role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Super Admins</span>
                  <Badge variant="destructive">{stats.superAdmins}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Company Admins</span>
                  <Badge variant="default">{stats.companyAdmins}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recruiters</span>
                  <Badge variant="secondary">{stats.recruiters}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Candidates</span>
                  <Badge variant="outline">{stats.candidates}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Activity</CardTitle>
                <CardDescription>Recent system metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Jobs</span>
                  <span className="font-bold">{stats.totalJobs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Applications</span>
                  <span className="font-bold">{stats.totalApplications}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Domains</span>
                  <span className="font-bold">{stats.totalDomains}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Platform health and monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span className="font-medium">System Status</span>
                </div>
                <Badge className="bg-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className="bg-blue-500">Connected</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
