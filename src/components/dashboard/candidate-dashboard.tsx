'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useCurrentUser } from '@/hooks/useUsers';
import { useUpdateProfile } from '@/hooks/useProfileMutations';
import { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  FileText, 
  Search,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Plus,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ResumeUpload } from './resume-upload';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

export function CandidateDashboard() {
  const { data: currentUser } = useCurrentUser();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: applications, isLoading: applicationsLoading } = useApplications();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const prevSkillsRef = useRef<string>('');

  // Update local state when currentUser changes
  useEffect(() => {
    const currentSkillsStr = JSON.stringify(currentUser?.skills || []);
    if (currentUser?.skills && currentSkillsStr !== prevSkillsRef.current) {
      prevSkillsRef.current = currentSkillsStr;
      // Use queueMicrotask to defer state update
      queueMicrotask(() => {
        setSkills(currentUser.skills);
      });
    }
  }, [currentUser?.skills]);

  const myApplications = applications?.filter(app => app.userId === currentUser?.id) || [];
  const hasSkills = currentUser?.skills && currentUser.skills.length > 0;
  
  const stats = {
    availableJobs: jobs?.length || 0,
    myApplications: myApplications.length,
    pendingApplications: myApplications.filter(app => app.status === 'PENDING').length,
    reviewedApplications: myApplications.filter(app => app.status === 'REVIEWED').length,
    acceptedApplications: myApplications.filter(app => app.status === 'ACCEPTED').length,
    rejectedApplications: myApplications.filter(app => app.status === 'REJECTED').length,
    averageMatch: myApplications.length > 0
      ? Math.round(myApplications.reduce((acc, app) => acc + (app.matchingScore || 0), 0) / myApplications.length)
      : 0,
  };

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSaveSkills = () => {
    if (skills.length === 0) return;
    updateProfile({ skills });
  };

  // Show prompt to add skills if user has no skills
  if (!hasSkills) {
    return (
      <div className="space-y-8">
        <Card className="border-blue-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle>Add Your Skills to Get Started</CardTitle>
            </div>
            <CardDescription>
              Tell us about your skills to get personalized job recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., React, Node.js, Python..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isPending}
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!newSkill.trim() || isPending}
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        disabled={isPending}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={handleSaveSkills} 
              disabled={skills.length === 0 || isPending}
              className="w-full"
            >
              Save Skills and Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Candidate Overview */}
      <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.availableJobs}</div>
                  <p className="text-xs text-muted-foreground">Browse and apply</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.myApplications}</div>
                  <p className="text-xs text-muted-foreground">Total submitted</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.pendingApplications + stats.reviewedApplications}
                  </div>
                  <p className="text-xs text-muted-foreground">Under review</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageMatch}%</div>
              <p className="text-xs text-muted-foreground">Compatibility rate</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {currentUser?.resumeUrl ? (
        <div className="flex flex-col sm:flex-row gap-4 items-center p-5 border rounded-lg bg-muted/10 border-purple-500/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-100 pointer-events-none" />
          <div className="flex items-center gap-3 mr-auto relative z-10">
            <div className="bg-purple-100 dark:bg-purple-950/50 p-2.5 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Your Resume is Uploaded</p>
              <p className="text-xs text-muted-foreground">Ready for AI job matchmaking recommendations</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto relative z-10">
            <Button
              asChild
              variant="outline"
              size="default"
              className="flex-1 sm:flex-initial gap-2 border-muted hover:bg-muted/10"
            >
              <a
                href={currentUser.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                View Resume
              </a>
            </Button>

            <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Upload New Resume
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload New Resume</DialogTitle>
                  <DialogDescription>
                    Select or drag a new PDF resume. This will automatically delete your previous resume and update your parsed profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                  <ResumeUpload 
                    forceUploadMode={true} 
                    onUploadSuccess={() => setIsResumeModalOpen(false)} 
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ResumeUpload />
        </div>
      )}

      {/* Candidate Actions */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="jobs">Find Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/jobs">
              <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Search className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">Browse Jobs</CardTitle>
                  </div>
                  <CardDescription>
                    Find jobs matching your skills
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/jobs/ai-match">
              <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-purple-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Star className="h-5 w-5 text-purple-500" />
                    </div>
                    <CardTitle className="text-lg">AI Resume Match</CardTitle>
                  </div>
                  <CardDescription>
                    Find the most relevant jobs using AI based on your skills
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/jobs">
              <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-green-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <Search className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">Search Jobs</CardTitle>
                  </div>
                  <CardDescription>
                    Find jobs that match your criteria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full py-2 px-4 rounded-md border border-input bg-background text-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Search className="inline-block mr-2 h-4 w-4" />
                    Search Jobs
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/jobs">
              <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Star className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">Recommended</CardTitle>
                  </div>
                  <CardDescription>
                    Jobs matched to your profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full py-2 px-4 rounded-md border border-input bg-background text-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Star className="inline-block mr-2 h-4 w-4" />
                    View Matches
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/profile">
              <Card className="group hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <User className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">My Profile</CardTitle>
                  </div>
                  <CardDescription>
                    Update skills and experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full py-2 px-4 rounded-md border border-input bg-background text-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <User className="inline-block mr-2 h-4 w-4" />
                    Edit Profile
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Track your applications</CardDescription>
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
                    <span className="font-medium">Under Review</span>
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
                    <span className="font-medium">Not Selected</span>
                  </div>
                  <Badge variant="outline">{stats.rejectedApplications}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : myApplications.length > 0 ? (
                  <div className="space-y-3">
                    {myApplications.slice(0, 3).map((app) => (
                      <div key={app.id} className="p-3 rounded-lg border hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">Application #{app.id.slice(0, 8)}</span>
                          <Badge variant="outline">{app.status}</Badge>
                        </div>
                        {app.matchingScore && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{Math.round(app.matchingScore)}% match</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No applications yet</p>
                    <Button asChild variant="link" className="mt-2">
                      <Link href="/jobs">Browse Jobs</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
