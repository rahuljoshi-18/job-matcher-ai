'use client';

import { useJob } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useCreateApplication } from '@/hooks/useApplicationMutations';
import { useCurrentUser } from '@/hooks/useUsers';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useMemo } from 'react';
import { ArrowLeft, User, Brain, Sparkles } from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: applications } = useApplications();
  const { data: currentUser } = useCurrentUser();
  const { mutate: createApplication, isPending } = useCreateApplication();

  const isCandidate = currentUser?.role === 'CANDIDATE';
  const isRecruiter = currentUser?.role === 'RECRUITER' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Check if user has already applied
  const hasApplied = useMemo(() => {
    return applications?.some(app => app.jobId === jobId && app.userId === currentUser?.id);
  }, [applications, jobId, currentUser?.id]);

  // Get candidate skills from user profile
  const candidateSkills = useMemo(() => {
    if (!isCandidate || !currentUser) return [];
    return currentUser.skills || [];
  }, [currentUser, isCandidate]);

  // Fetch high-fidelity pre-apply AI hybrid matching details
  const { data: preMatch, isLoading: preMatchLoading } = useQuery({
    queryKey: ['job-pre-match', jobId],
    queryFn: async () => {
      const res = await apiClient.get(`/jobs/${jobId}/pre-match`);
      return res.data as {
        score: number;
        reasoning: string;
        embeddingScore: number | null;
        skillScore: number;
        commonSkills: string[];
      };
    },
    enabled: isCandidate && !!jobId && candidateSkills.length > 0 && !!job,
  });

  const missingSkills = useMemo(() => {
    if (!job || !preMatch) return [];
    return job.requiredSkills.filter(skill => 
      !preMatch.commonSkills.some((cs: string) => cs.toLowerCase() === skill.toLowerCase())
    );
  }, [job, preMatch]);

  const handleApply = () => {
    if (!jobId) return;
    
    if (candidateSkills.length === 0) {
      router.push('/profile');
      return;
    }
    
    createApplication({
      jobId,
    });
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Job not found</p>
              <Button onClick={() => router.push('/jobs')} variant="link" className="mt-2">
                Back to jobs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/jobs')}
            className="gap-2 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-muted bg-card/60 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-muted bg-muted/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-black text-foreground">{job.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Posted on {new Date(job.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={job.status === 'ACTIVE' ? 'default' : 'secondary'} className="px-3 py-1 font-semibold">
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wider">Job Description</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="px-2.5 py-1 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                 {/* Candidate matching details */}
                 {isCandidate && candidateSkills.length > 0 && (
                   <>
                     {preMatchLoading && (
                       <div className="p-6 border border-dashed border-blue-200 dark:border-blue-900/50 rounded-2xl bg-blue-50/10 dark:bg-blue-950/5 space-y-4 animate-pulse">
                         <div className="flex items-center gap-3">
                           <Brain className="w-5 h-5 text-blue-500 animate-bounce" />
                           <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">AI Matching Intelligence...</h3>
                         </div>
                         <div className="space-y-3">
                           <div className="h-4 bg-muted rounded w-2/3" />
                           <div className="h-2 bg-muted rounded w-full" />
                           <div className="h-4 bg-muted rounded w-1/2" />
                         </div>
                       </div>
                     )}

                     {!preMatchLoading && preMatch && (
                       <div className="p-6 border border-muted rounded-2xl bg-muted/5 space-y-6">
                         <div className="flex items-center justify-between border-b pb-4">
                           <div className="flex items-center gap-2">
                             <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                             <h3 className="text-sm font-black text-foreground uppercase tracking-wider">AI Hiring Probability Match</h3>
                           </div>
                           <Badge 
                             className={`px-3 py-1 text-xs font-bold border ${
                               preMatch.score >= 80 
                                 ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" 
                                 : preMatch.score >= 60 
                                   ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                   : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                             }`}
                           >
                             {preMatch.score >= 80 ? 'Excellent Fit' : preMatch.score >= 60 ? 'Good Fit' : 'Fair Fit'}
                           </Badge>
                         </div>
                         
                         <div className="space-y-4">
                           <div>
                             <div className="flex justify-between items-center text-sm font-semibold mb-2">
                               <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Landing Probability Rating</span>
                               <span className={`font-black text-lg ${
                                 preMatch.score >= 80 
                                   ? "text-green-500" 
                                   : preMatch.score >= 60 
                                     ? "text-amber-500" 
                                     : "text-red-500"
                               }`}>
                                 {preMatch.score}%
                               </span>
                             </div>
                              <Progress 
                                value={preMatch.score} 
                                className={`h-3 w-full bg-muted border border-muted-foreground/10 ${
                                  preMatch.score >= 80 
                                    ? "[&>div]:bg-green-500 bg-green-500/10" 
                                    : preMatch.score >= 60 
                                      ? "[&>div]:bg-amber-500 bg-amber-500/10" 
                                      : "[&>div]:bg-red-500 bg-red-500/10"
                                }`}
                              />
                           </div>

                           {/* AI Recruiter Verdict reasoning statement */}
                           <div className="p-4 rounded-xl border border-muted/50 bg-background/50 space-y-2">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                               <Brain className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                               <span>AI Recruiter Verdict</span>
                             </div>
                             <p className="text-xs text-muted-foreground leading-relaxed italic">
                               &ldquo;{preMatch.reasoning}&rdquo;
                             </p>
                           </div>

                           {/* Breakdown metrics (semantic vs skill match) */}
                           <div className="grid grid-cols-2 gap-3 text-xs border-t pt-4">
                             <div className="p-3 border rounded-xl bg-muted/10 space-y-1">
                               <span className="text-muted-foreground block font-medium">Resume Semantic Similarity</span>
                               <span className="font-bold text-sm text-foreground">
                                 {preMatch.embeddingScore !== null ? `${preMatch.embeddingScore}%` : 'Pending'}
                               </span>
                             </div>
                             <div className="p-3 border rounded-xl bg-muted/10 space-y-1">
                               <span className="text-muted-foreground block font-medium">Required Skill Overlap</span>
                               <span className="font-bold text-sm text-foreground">
                                 {preMatch.skillScore}%
                               </span>
                             </div>
                           </div>

                           {/* Common skills */}
                           <div>
                             <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Matched Skills ({preMatch.commonSkills.length})</p>
                             <div className="flex flex-wrap gap-1.5">
                               {preMatch.commonSkills.map((skill: string) => (
                                 <Badge key={skill} className="bg-green-500/10 hover:bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20 px-2.5 py-0.5 text-[11px] rounded-md">
                                   {skill}
                                 </Badge>
                               ))}
                             </div>
                           </div>

                           {/* Missing skills */}
                           {missingSkills.length > 0 && (
                             <div>
                               <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Missing Skills ({missingSkills.length})</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {missingSkills.map((skill: string) => (
                                   <Badge key={skill} variant="outline" className="px-2.5 py-0.5 text-[11px] rounded-md text-muted-foreground">
                                     {skill}
                                   </Badge>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     )}
                   </>
                 )}
                
                {/* Apply button for candidates */}
                {isCandidate && (
                  <div className="border-t pt-6">
                    {hasApplied ? (
                      <Button disabled className="w-full" size="lg">
                        Already Applied
                      </Button>
                    ) : candidateSkills.length === 0 ? (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Please update your profile with skills before applying
                        </p>
                        <Button onClick={() => router.push('/profile')} variant="outline">
                          Update Profile
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleApply} 
                        disabled={isPending}
                        className="w-full" 
                        size="lg"
                      >
                        {isPending ? 'Submitting...' : 'Apply Now'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recruiter view: Link to Applicants Directory */}
          {isRecruiter && (
            <div className="md:col-span-1 space-y-6">
              <Card className="border-muted bg-card/60 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Applicants Directory
                  </CardTitle>
                  <CardDescription>
                    Review and rank all applications for this job listing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 border rounded-2xl bg-muted/5 flex flex-col items-center text-center">
                    <User className="w-10 h-10 text-muted-foreground mb-3 animate-pulse" />
                    <p className="text-sm text-foreground font-semibold mb-1">
                      Candidates Directory
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Candidates are automatically sorted by AI Vector similarity alignment.
                    </p>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all"
                      onClick={() => router.push(`/jobs/${jobId}/applicants`)}
                    >
                      Show Candidates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
