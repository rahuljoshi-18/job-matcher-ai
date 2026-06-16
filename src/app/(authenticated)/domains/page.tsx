'use client';

import { useCurrentUser } from '@/hooks/useUsers';
import { useCreateDomain, useDomains } from '@/hooks/useDomains';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { domainSchema, type DomainInput } from '@/lib/validations/domain';

export default function DomainsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { mutate: createDomain, isPending } = useCreateDomain();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const form = useForm<DomainInput>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      name: '',
      domainName: '',
    },
  });

  const onSubmit = (data: DomainInput) => {
    createDomain(data, {
      onSuccess: () => {
        form.reset();
      },
      onError: (error) => {
        const errorMsg = error instanceof Error ? error.message : 'Unable to create domain. Please try again.';
        form.setError('root', { message: errorMsg });
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

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not authorized</CardTitle>
              <CardDescription>
                Only Super Admins can manage organizations.
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Manage Domains</CardTitle>
                <CardDescription>
                  Create new organizations and review existing domains.
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
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="domainName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Name</FormLabel>
                        <FormControl>
                          <Input placeholder="example-company" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Example Company" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.formState.errors.root && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Domain'}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Domains</CardTitle>
            <CardDescription>
              Domains are created by Super Admins and used to isolate jobs and users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-20 rounded-md border bg-muted p-4" />
                ))}
              </div>
            ) : domains?.length ? (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <div>
                        <p className="font-semibold">{domain.name}</p>
                        <p className="text-sm text-muted-foreground">{domain.domainName}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {domain.verified ? 'Verified' : 'Unverified'} • {domain.disabled ? 'Disabled' : 'Enabled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No domains available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
