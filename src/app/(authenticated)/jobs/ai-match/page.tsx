'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bot, User, CheckCircle2, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

interface AIMatchResult {
  jobId: string;
  aiScore?: number;
  score?: number;
  skillScore?: number;
  embeddingScore?: number | null;
  reasoning: string;
  commonSkills?: string[];
  job: {
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
  };
}

export default function AIMatchPage() {
  const { data: matches, isLoading: loading, error } = useQuery({
    queryKey: ['ai-matches'],
    queryFn: async () => {
      const res = await apiClient.get('/jobs/match');
      return (res.data.data?.matches || res.data.matches || []) as AIMatchResult[];
    },
  });

  const getDisplayScore = (match: AIMatchResult) => {
    const score = match.aiScore ?? match.score ?? match.skillScore ?? 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 80) return 'Highly Compatible';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Partial Match';
    return 'Needs Skill Gap Review';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <Bot className="w-8 h-8 text-purple-500" />
            AI Resume & Skill Matcher
          </h1>
          <p className="text-muted-foreground">
            Llama 3 has analyzed your skills and matched them against open job postings.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="mb-4">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded flex items-center gap-4">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-lg">Error loading matches</h3>
            <p>{(error as unknown as Record<string, unknown> & { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || error.message || 'Failed to fetch AI matches.'}</p>
          </div>
        </div>
      )}

      {!loading && !error && (!matches || matches.length === 0) && (
        <div className="text-center p-12 bg-muted/20 border-2 border-dashed rounded-xl">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No matches found</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            We couldn&apos;t find any direct matches based on your skills. Try adding more skills to your profile or check back later for new job postings.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/profile">Update Profile Skills</Link>
          </Button>
        </div>
      )}

      {!loading && matches && matches.map((match) => {
        const displayScore = getDisplayScore(match);
        const compatibilityLabel = getCompatibilityLabel(displayScore);

        return (
        <Card key={match.jobId} className="mb-6 overflow-hidden border-2 transition-all hover:border-purple-300">
          <div className="bg-purple-50/50 border-b p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 text-purple-700 font-bold p-3 rounded-full text-lg shadow-sm border border-purple-200">
                {displayScore}%
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 leading-tight">AI Confidence Score</h4>
                <p className="text-xs text-purple-700 mb-0">
                  Resume analyzer score
                  {match.embeddingScore !== null && match.embeddingScore !== undefined
                    ? ` • ${Math.round(match.embeddingScore)}% semantic`
                    : ''}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {compatibilityLabel}
            </Badge>
          </div>
          
          <CardHeader>
            <CardTitle className="text-2xl">{match.job.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {match.job.requiredSkills.map(skill => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">AI Score</p>
                <p className="text-lg font-bold">{displayScore}%</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Skill Match</p>
                <p className="text-lg font-bold">{Math.round(match.skillScore ?? displayScore)}%</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Resume Similarity</p>
                <p className="text-lg font-bold">
                  {match.embeddingScore !== null && match.embeddingScore !== undefined
                    ? `${Math.round(match.embeddingScore)}%`
                    : 'Pending'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg text-sm border">
              <strong>AI Reasoning:</strong> <span className="text-muted-foreground">{match.reasoning}</span>
            </div>
            
            <p className="text-sm line-clamp-3 text-muted-foreground">
              {match.job.description}
            </p>
          </CardContent>
          <CardFooter className="bg-muted/10 pt-4">
            <Button asChild className="w-full sm:w-auto ml-auto">
              <Link href={`/jobs/${match.jobId}`}>
                View Job & Apply <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        );
      })}
    </div>
  );
}
