'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useUsers';
import { useCreateInvitation } from '@/hooks/useInvitationMutations';
import { useDomains } from '@/hooks/useDomains';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Role } from '@/generated/prisma';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// We define a client-side schema because domainId is only required for SUPER_ADMIN
const formSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['RECRUITER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'CANDIDATE']),
  domainId: z.string().optional(),
});

type FormInput = z.infer<typeof formSchema>;

export default function InvitationsPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { mutate: createInvitation, isPending } = useCreateInvitation();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isAuthorized = isSuperAdmin || isCompanyAdmin;

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'RECRUITER',
      domainId: '',
    },
  });

  const onSubmit = (data: FormInput) => {
    if (isSuperAdmin && !data.domainId) {
      form.setError('domainId', { message: 'Please select a domain.' });
      return;
    }

    const payload: { email: string; role: Role; domainId?: string } = {
      email: data.email,
      role: data.role as Role,
    };
    if (isSuperAdmin) {
      payload.domainId = data.domainId;
    }

    createInvitation(payload, {
      onSuccess: () => {
        form.reset();
        router.push('/dashboard');
      },
      onError: (error) => {
        const errorMsg = error instanceof Error ? error.message : 'Unable to send invitation. Please try again.';
        form.setError('root', { message: errorMsg });
      },
    });
  };

  if (userLoading || (isSuperAdmin && domainsLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>
                Only Company Admins and Super Admins can send invitations.
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
                <CardTitle>
                  {isSuperAdmin ? 'Invite Users to Domain' : 'Invite Recruiters'}
                </CardTitle>
                <CardDescription>
                  {isSuperAdmin
                    ? 'Send an invitation to any user for a specific organization. They will receive an email and can complete their signup.'
                    : 'Send an invitation to a recruiter in your organization. They will receive an email and can complete their signup.'}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                {isSuperAdmin && (
                  <FormField
                    control={form.control}
                    name="domainId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain / Organization</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                            disabled={isPending || domainsLoading}
                          >
                            <option value="">Select a domain...</option>
                            {domains?.map((domain) => (
                              <option key={domain.id} value={domain.id}>
                                {domain.name} ({domain.domainName})
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                          disabled={isPending}
                        >
                          <option value="RECRUITER">Recruiter</option>
                          {isSuperAdmin && (
                            <>
                              <option value="COMPANY_ADMIN">Company Admin</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                            </>
                          )}
                          {isCompanyAdmin && <option value="COMPANY_ADMIN">Company Admin</option>}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Cancel</Link>
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

