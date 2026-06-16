'use client';

import { useJob, useJobApplications } from '@/hooks/useJobs';
import { useCurrentUser } from '@/hooks/useUsers';
import { useUpdateApplicationStatus } from '@/hooks/useApplicationMutations';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { ArrowLeft, User, Briefcase, Mail, FileText, Award, Bot } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface CandidateExperience {
  role?: string;
  title?: string;
  company: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface CandidateEducation {
  degree?: string | null;
  field?: string | null;
  fieldOfStudy?: string | null;
  institution: string;
  graduationYear?: number | null;
  startDate?: string;
  endDate?: string;
}

interface CandidateCertification {
  name: string;
  issuer?: string | null;
  year?: number | null;
  issueDate?: string;
}

interface CandidateCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSelectedApp: (app: any) => void;
  borderClass: string;
  score: number;
  scoreBadgeVariant: "default" | "secondary" | "outline" | "destructive";
}

function CandidateCard({ 
  app, 
  job, 
  setSelectedApp, 
  borderClass, 
  score, 
  scoreBadgeVariant 
}: CandidateCardProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const candidateSkills = app.user?.skills || [];
  const matchedSkills = candidateSkills.filter((s: string) =>
    job.requiredSkills.some((rs: string) => rs.toLowerCase() === s.toLowerCase())
  );
  const otherSkills = candidateSkills.filter((s: string) =>
    !job.requiredSkills.some((rs: string) => rs.toLowerCase() === s.toLowerCase())
  );
  const sortedSkills = [...matchedSkills, ...otherSkills];

  return (
    <div 
      className={`p-5 border rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden group flex flex-col justify-between ${borderClass}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base text-foreground truncate flex items-center gap-1.5">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              {app.user?.email || 'Unknown Candidate'}
            </h4>
            {app.user?.yearsOfExperience !== undefined && app.user?.yearsOfExperience !== null && (
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Briefcase className="w-3.5 h-3.5 mr-1 text-purple-500 shrink-0" />
                {app.user.yearsOfExperience} {app.user.yearsOfExperience === 1 ? 'year' : 'years'} experience
              </p>
            )}
          </div>
          <Badge 
            variant={scoreBadgeVariant}
            className="shrink-0 text-xs font-semibold px-2 py-0.5"
          >
            {score}% Match
          </Badge>
        </div>

        {/* Skills badge group with matched skills first and hover popover */}
        {sortedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4 items-center">
            {sortedSkills.slice(0, 4).map((skill: string) => {
              const isMatched = job.requiredSkills.some(
                (rs: string) => rs.toLowerCase() === skill.toLowerCase()
              );
              return (
                <Badge 
                  key={skill} 
                  variant={isMatched ? 'default' : 'outline'} 
                  className={`text-[10px] px-1.5 py-0 ${
                    isMatched 
                      ? 'bg-green-500/10 hover:bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20' 
                      : 'bg-background/50 text-foreground/80 border-muted'
                  }`}
                >
                  {skill}
                </Badge>
              );
            })}
            {sortedSkills.length > 4 && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <div 
                    className="inline-block cursor-pointer"
                    onMouseEnter={() => setIsPopoverOpen(true)}
                    onMouseLeave={() => setIsPopoverOpen(false)}
                  >
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 bg-background/50 hover:bg-muted text-foreground/80 border-muted cursor-pointer transition-colors"
                    >
                      +{sortedSkills.length - 4} more
                    </Badge>
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 p-4 border border-muted bg-popover/95 backdrop-blur-md shadow-xl rounded-xl z-50"
                  onMouseEnter={() => setIsPopoverOpen(true)}
                  onMouseLeave={() => setIsPopoverOpen(false)}
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Candidate Skills Profile
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Matching skills highlighted first.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto pt-1">
                      {sortedSkills.map((skill: string) => {
                        const isMatched = job.requiredSkills.some(
                          (rs: string) => rs.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <Badge 
                            key={skill} 
                            variant={isMatched ? 'default' : 'outline'}
                            className={`text-[10px] px-2 py-0.5 ${
                              isMatched 
                                ? 'bg-green-600 hover:bg-green-600 text-white border-transparent' 
                                : 'bg-background text-muted-foreground border-muted'
                            }`}
                          >
                            {skill}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-muted/50 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-none bg-muted/20">
            {app.status}
          </Badge>
        </div>
        <div className="flex gap-1.5">
          <Button 
            size="sm" 
            className="h-7 text-[10px] md:text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
            onClick={() => setSelectedApp(app)}
          >
            <User className="w-3 h-3 md:w-3.5 md:h-3.5" />
            View Details
          </Button>
          {app.user?.resumeUrl && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-[10px] md:text-xs gap-1 border-muted hover:bg-background/80"
              onClick={(e) => {
                e.stopPropagation();
              }}
              asChild
            >
              <a 
                href={app.user.resumeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" />
                Resume
              </a>
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            className="h-7 text-[10px] md:text-xs gap-1 border-muted hover:bg-background/80"
            onClick={(e) => {
              e.stopPropagation();
            }}
            asChild
          >
            <a href={`mailto:${app.user?.email}`}>
              <Mail className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Contact
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: jobApplications, isLoading: appsLoading } = useJobApplications(jobId);
  const { data: currentUser } = useCurrentUser();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateApplicationStatus();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const isRecruiter = currentUser?.role === 'RECRUITER' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Get ranked applications
  const rankedApplications = useMemo(() => {
    if (!jobApplications) return [];
    return [...jobApplications].sort((a, b) => (b.matchingScore || 0) - (a.matchingScore || 0));
  }, [jobApplications]);

  const handleStatusChange = (status: 'ACCEPTED' | 'REJECTED' | 'REVIEWED') => {
    if (!selectedApp) return;
    updateStatus(
      { applicationId: selectedApp.id, status },
      {
        onSuccess: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSelectedApp((prev: any) => prev ? { ...prev, status } : null);
        }
      }
    );
  };

  if (jobLoading || appsLoading) {
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-muted">
          <CardTitle className="text-xl font-bold mb-2">Job Not Found</CardTitle>
          <CardDescription className="mb-4">The job listing you are looking for does not exist or has been removed.</CardDescription>
          <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (!isRecruiter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-muted">
          <CardTitle className="text-xl font-bold mb-2 text-destructive">Access Denied</CardTitle>
          <CardDescription className="mb-4">Only authorized hiring managers can view job applications.</CardDescription>
          <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="gap-2 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job Posting
          </Button>
        </div>

        {/* Header Block */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">Job Applicants</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground">{job.title}</span>
            <span>&bull;</span>
            <span>{rankedApplications.length} applied {rankedApplications.length === 1 ? 'candidate' : 'candidates'}</span>
          </p>
        </div>

        {/* Main Applicants Grid */}
        <div className="max-w-5xl">
          <Card className="border-muted bg-card/60 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-muted">
              <CardTitle>Candidates Directory</CardTitle>
              <CardDescription>Ranked automatically by AI Semantic Vector Alignment</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {rankedApplications.length === 0 ? (
                <div className="text-center p-12 bg-muted/10 rounded-2xl border-2 border-dashed border-muted/50">
                  <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-1">No applicants yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Candidates who apply to this posting will be ranked and displayed here automatically.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rankedApplications.map((app) => {
                    const score = Math.round(app.matchingScore || 0);
                    const borderClass = 
                      score >= 80 ? 'border-green-500/30 hover:border-green-500/60 bg-green-500/5' :
                      score >= 50 ? 'border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5' :
                      'border-muted hover:border-muted-foreground/30 bg-muted/5';

                    const scoreBadgeVariant = 
                      score >= 80 ? 'default' :
                      score >= 50 ? 'secondary' :
                      'outline';

                    return (
                      <CandidateCard
                        key={app.id}
                        app={app}
                        job={job}
                        setSelectedApp={setSelectedApp}
                        borderClass={borderClass}
                        score={score}
                        scoreBadgeVariant={scoreBadgeVariant}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Candidate Profile Details Overlay Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md transition-all duration-300">
          <div className="bg-card border border-muted w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-muted flex items-start justify-between gap-4 bg-muted/30">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Candidate Application Details
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedApp.user?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={
                  selectedApp.status === 'ACCEPTED' ? 'default' :
                  selectedApp.status === 'REJECTED' ? 'destructive' :
                  selectedApp.status === 'REVIEWED' ? 'secondary' :
                  'outline'
                } className="font-semibold px-2.5 py-1">
                  Status: {selectedApp.status}
                </Badge>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Details) */}
                <div className="md:col-span-2 space-y-6">
                  {/* Experience Section */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      Work Experience
                    </h4>
                    {!selectedApp.user?.experiences || selectedApp.user.experiences.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-xl border border-muted/50">No experience records found.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedApp.user.experiences.map((exp: CandidateExperience, i: number) => (
                          <div key={i} className="p-4 bg-muted/10 rounded-xl border border-muted/50 hover:bg-muted/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-foreground">{exp.role || exp.title}</h5>
                                <p className="text-xs font-semibold text-muted-foreground">{exp.company}</p>
                              </div>
                              <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold shrink-0">
                                {exp.startDate ? new Date(exp.startDate).getFullYear() : ''} - {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
                              </span>
                            </div>
                            {exp.description && (
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Education Section */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Education
                    </h4>
                    {!selectedApp.user?.education || selectedApp.user.education.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-xl border border-muted/50">No education records found.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedApp.user.education.map((edu: CandidateEducation, i: number) => (
                          <div key={i} className="p-4 bg-muted/10 rounded-xl border border-muted/50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-foreground">{edu.degree} in {edu.field || edu.fieldOfStudy}</h5>
                                <p className="text-xs font-semibold text-muted-foreground">{edu.institution}</p>
                              </div>
                              <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold shrink-0">
                                {edu.graduationYear || (edu.startDate ? new Date(edu.startDate).getFullYear() : '')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Certifications Section */}
                  {selectedApp.user?.certifications && selectedApp.user.certifications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-teal-500" />
                        Certifications
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApp.user.certifications.map((cert: CandidateCertification, i: number) => (
                          <div key={i} className="p-3 bg-muted/10 rounded-xl border border-muted/50 flex flex-col justify-between">
                            <div>
                              <h5 className="font-bold text-xs text-foreground">{cert.name}</h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{cert.issuer}</p>
                            </div>
                            {(cert.year || cert.issueDate) && (
                              <span className="text-[9px] text-muted-foreground/80 mt-1.5 block">
                                Issued: {cert.year || (cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column (Metrics & AI Insights) */}
                <div className="space-y-6">
                  {/* AI Match Gauge */}
                  <div className="p-4 bg-muted/10 rounded-xl border border-muted/50 text-center relative overflow-hidden group">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">AI Score Match</h4>
                    <div className="inline-flex items-center justify-center relative mb-2">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" className="text-muted/20" fill="transparent" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" 
                          className={
                            Math.round(selectedApp.matchingScore || 0) >= 80 ? 'text-green-500' :
                            Math.round(selectedApp.matchingScore || 0) >= 50 ? 'text-blue-500' :
                            'text-muted-foreground'
                          } 
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - (selectedApp.matchingScore || 0) / 100)}
                          fill="transparent" 
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xl font-black">{Math.round(selectedApp.matchingScore || 0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Vector-similarity scoring relative to job requirements</p>
                  </div>

                  {/* AI Recruiter Review & Reasoning */}
                  {selectedApp.aiReasoning && (
                    <div className="p-5 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-2xl border border-purple-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 pointer-events-none">
                        <Bot className="w-5 h-5 text-purple-400 opacity-60" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-1.5 font-black">
                        <Bot className="w-3.5 h-3.5 shrink-0" />
                        AI Recruiter Review
                      </h4>
                      <p className="text-xs text-foreground leading-relaxed italic">
                        &ldquo;{selectedApp.aiReasoning}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Skill breakdown list */}
                  <div className="p-4 bg-muted/10 rounded-xl border border-muted/50 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skills Breakdown</h4>
                    
                    {/* Common Skills */}
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-2 uppercase">Matching Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.user?.skills?.filter((s: string) => 
                          job.requiredSkills.some((rs: string) => rs.toLowerCase() === s.toLowerCase())
                        ).map((skill: string) => (
                          <Badge key={skill} variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-600 hover:bg-green-600">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Other Candidate Skills */}
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-2 uppercase">Other Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.user?.skills?.filter((s: string) => 
                          !job.requiredSkills.some((rs: string) => rs.toLowerCase() === s.toLowerCase())
                        ).map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0.5 bg-background">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column Right */}
                  <div className="space-y-2">
                    {selectedApp.user?.resumeUrl && (
                      <Button className="w-full gap-2 text-xs" variant="outline" asChild>
                        <a href={selectedApp.user.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4" />
                          Open PDF Resume
                        </a>
                      </Button>
                    )}
                    <Button className="w-full gap-2 text-xs bg-muted hover:bg-muted/80 text-foreground" variant="outline" asChild>
                      <a href={`mailto:${selectedApp.user?.email}`}>
                        <Mail className="w-4 h-4" />
                        Send Direct Email
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Action Bar */}
            <div className="px-6 py-4 border-t border-muted bg-muted/30 flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Apply status to transition application workflow.
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedApp(null)}
                  className="h-8 text-xs border-muted"
                >
                  Cancel
                </Button>
                {selectedApp.status !== 'REJECTED' && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={isUpdatingStatus}
                    className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Reject
                  </Button>
                )}
                {selectedApp.status === 'PENDING' && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleStatusChange('REVIEWED')}
                    disabled={isUpdatingStatus}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Mark Reviewed
                  </Button>
                )}
                {selectedApp.status !== 'ACCEPTED' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusChange('ACCEPTED')}
                    disabled={isUpdatingStatus}
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Accept Application
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
