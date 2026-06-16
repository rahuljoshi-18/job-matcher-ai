'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJob } from '@/hooks/useJobMutations';
import { useCurrentUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { jobSchema, type JobInput } from '@/lib/validations/job';
import { JobStatus } from '@/generated/prisma';
import { TagInput } from '@/components/ui/tag-input';

export default function NewJobPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { mutate: createJob, isPending } = useCreateJob();

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      description: '',
      requiredSkills: [],
      status: JobStatus.ACTIVE,
    },
  });

  const onSubmit = (data: JobInput) => {
    createJob(data, {
      onSuccess: () => {
        router.push('/jobs');
      },
      onError: (error) => {
        const errMsg = error instanceof Error ? error.message : 'Unable to create job posting. Please try again.';
        form.setError('root', { message: errMsg });
      },
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role === 'CANDIDATE') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not authorized</CardTitle>
              <CardDescription>
                Only Recruiters, Company Admins, or Super Admins can create job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Create New Job</CardTitle>
                <CardDescription>
                  Post a new role to your domain and connect with candidates.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/jobs">Back to job listings</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Product Designer" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the responsibilities, team, and desired qualifications."
                          rows={8}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiredSkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Skills</FormLabel>
                      <FormControl>
                        <TagInput
                          placeholder="Type a skill (e.g. React) and press Enter"
                          disabled={isPending}
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>Press Enter or type a comma after each skill to create a tag.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Job'}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/jobs">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
