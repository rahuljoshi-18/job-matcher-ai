'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Briefcase, Edit, Eye, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import { useDeleteJob, useUpdateJob } from '@/hooks/useJobMutations';
import { useJobs } from '@/hooks/useJobs';
import { useCurrentUser } from '@/hooks/useUsers';
import type { Job } from '@/generated/prisma';

export default function ManageJobsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { mutate: updateJob, isPending: isUpdating } = useUpdateJob();
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);

  const canManageJobs =
    currentUser?.role === 'RECRUITER' ||
    currentUser?.role === 'COMPANY_ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN';

  const sortedJobs = useMemo(() => {
    return [...(jobs || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [jobs]);

  const openEditDialog = (job: Job) => {
    setSelectedJob(job);
    setTitle(job.title);
    setDescription(job.description);
    setRequiredSkills(job.requiredSkills);
  };

  const handleSave = () => {
    if (!selectedJob) return;
    updateJob(
      {
        id: selectedJob.id,
        title,
        description,
        requiredSkills,
      },
      {
        onSuccess: () => setSelectedJob(null),
      }
    );
  };

  if (userLoading || jobsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-8 h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-52" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canManageJobs) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>Only hiring users can manage job postings.</CardDescription>
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
            <h1 className="text-3xl font-bold tracking-tight">Manage Jobs</h1>
            <p className="mt-2 text-sm text-muted-foreground">View, edit, and review your job postings.</p>
          </div>
          <Button asChild>
            <Link href="/jobs/new">New Job Posting</Link>
          </Button>
        </div>

        {sortedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="font-medium">No jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a job posting to manage it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedJobs.map((job) => (
              <Card key={job.id} className="border-muted">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{job.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{job.description}</CardDescription>
                    </div>
                    <Badge variant={job.status === 'ACTIVE' ? 'default' : 'secondary'}>{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.requiredSkills.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{job.requiredSkills.length - 6} more
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/jobs/${job.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(job)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/jobs/${job.id}/applicants`}>
                        <Users className="mr-2 h-4 w-4" />
                        Applicants
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => deleteJob(job.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>Update the title, description, and required skills.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="job-title">
                Title
              </label>
              <Input id="job-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="job-description">
                Description
              </label>
              <Textarea
                id="job-description"
                className="min-h-40"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Skills</label>
              <TagInput value={requiredSkills} onChange={setRequiredSkills} placeholder="Add a skill and press Enter" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUpdating || !title.trim() || !description.trim() || requiredSkills.length === 0}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
