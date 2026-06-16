'use client';

import Link from 'next/link';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useCurrentUser } from '@/hooks/useUsers';
import { calculateMatchingScore } from '@/lib/matching';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, Suspense } from 'react';

function JobsListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecommended = searchParams.get('recommended') === 'true';
  const { data: jobs, isLoading: jobsLoading } = useJobs(undefined, isRecommended);
  const { data: applications } = useApplications();
  const { data: currentUser } = useCurrentUser();

  // Get filters from URL
  const skillFilter = useMemo(() => 
    searchParams.get('skills')?.split(',').filter(Boolean) || [], 
    [searchParams]
  );
  const minMatchScore = searchParams.get('minMatchScore') ? Number(searchParams.get('minMatchScore')) : undefined;

  // Local state for filter inputs
  const [skillInput, setSkillInput] = useState(skillFilter.join(', '));
  const [matchScoreInput, setMatchScoreInput] = useState(minMatchScore?.toString() || '');

  const isCandidate = currentUser?.role === 'CANDIDATE';

  // Get candidate skills from user profile
  const candidateSkills = useMemo(() => {
    if (!isCandidate || !currentUser) return [];
    return currentUser.skills || [];
  }, [currentUser, isCandidate]);

  // Filter and calculate matching scores
  const processedJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs
      .map(job => {
        // Calculate matching score for candidates
        let matchingScore = job.aiScore ?? 0;
        if (job.aiScore === undefined && isCandidate && candidateSkills.length > 0) {
          const result = calculateMatchingScore({
            candidateSkills,
            requiredSkills: job.requiredSkills,
          });
          matchingScore = Math.round(result.score * 100);
        }

        return {
          ...job,
          matchingScore,
        };
      })
      .filter(job => {
        // Filter by skills
        if (skillFilter.length > 0) {
          const hasMatchingSkill = skillFilter.some(filterSkill =>
            job.requiredSkills.some(jobSkill =>
              jobSkill.toLowerCase().includes(filterSkill.toLowerCase().trim())
            )
          );
          if (!hasMatchingSkill) return false;
        }

        // Filter by minimum matching score (candidates only)
        if (isCandidate && minMatchScore !== undefined) {
          if (job.matchingScore < minMatchScore) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by matching score descending for candidates
        if (isCandidate) {
          return b.matchingScore - a.matchingScore;
        }
        // Sort by creation date for others
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [jobs, skillFilter, minMatchScore, isCandidate, candidateSkills]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (skillInput.trim()) {
      params.set('skills', skillInput.trim());
    }
    
    if (matchScoreInput && !isNaN(Number(matchScoreInput))) {
      params.set('minMatchScore', matchScoreInput);
    }

    router.push(`/jobs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSkillInput('');
    setMatchScoreInput('');
    router.push('/jobs');
  };

  const hasActiveFilters = skillFilter.length > 0 || minMatchScore !== undefined;

  if (jobsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Jobs</h1>
          <p className="text-muted-foreground">
            {isCandidate 
              ? 'Find positions that match your skills'
              : 'View all available job postings'}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Refine your job search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Skills</label>
                <Input
                  placeholder="e.g. React, TypeScript"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>

              {isCandidate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Match Score (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 70"
                    value={matchScoreInput}
                    onChange={(e) => setMatchScoreInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  />
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {processedJobs.length} {processedJobs.length === 1 ? 'job' : 'jobs'} found
          </p>
        </div>

        {/* Jobs grid */}
        {processedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No jobs found matching your criteria.
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="link" className="mt-2">
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processedJobs.map((job) => {
              const hasApplied = applications?.some(app => app.jobId === job.id);

              return (
                <Link href={`/jobs/${job.id}`} key={job.id} >
                  <Card 
                    key={job.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      {isCandidate && (
                        <Badge variant={
                          job.matchingScore >= 80 ? 'default' :
                          job.matchingScore >= 50 ? 'secondary' :
                          'outline'
                        }>
                          {Math.round(job.matchingScore)}%
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {job.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Required Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.requiredSkills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.requiredSkills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isCandidate && hasApplied && (
                        <Badge variant="secondary" className="w-full justify-center">
                          Already Applied
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    }>
      <JobsListingContent />
    </Suspense>
  );
}
