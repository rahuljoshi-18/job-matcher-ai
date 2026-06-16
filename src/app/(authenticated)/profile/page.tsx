'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useUsers';
import { useUpdateProfile } from '@/hooks/useProfileMutations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { X, Plus, Loader2, UserCircle } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

const profileSchema = z.object({
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const clerk = useClerk();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const prevSkillsRef = useRef<string>('');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      skills: [],
    },
  });

  // Update local state when currentUser changes
  useEffect(() => {
    const currentSkillsStr = JSON.stringify(currentUser?.skills || []);
    if (currentUser?.skills && currentSkillsStr !== prevSkillsRef.current) {
      prevSkillsRef.current = currentSkillsStr;
      // Use queueMicrotask to defer state update
      queueMicrotask(() => {
        setSkills(currentUser.skills);
        form.reset({ skills: currentUser.skills });
      });
    }
  }, [currentUser?.skills, form]);

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      const updatedSkills = [...skills, trimmedSkill];
      setSkills(updatedSkills);
      form.setValue('skills', updatedSkills);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(skill => skill !== skillToRemove);
    setSkills(updatedSkills);
    form.setValue('skills', updatedSkills);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const onSubmit = () => {
    if (skills.length === 0) {
      form.setError('skills', { message: 'At least one skill is required' });
      return;
    }
    
    updateProfile(
      { skills: skills },
      {
        onSuccess: () => {
          router.push('/dashboard');
        },
      }
    );
  };

  if (userLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Loading your profile...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Unable to load profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your skills and preferences</CardDescription>
          </div>
          <Button variant="outline" onClick={() => clerk.openUserProfile()}>
            <UserCircle className="mr-2 h-4 w-4" />
            Manage Account
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="skills"
                render={() => (
                  <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a skill..."
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={handleKeyPress}
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
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Experience Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Experience</CardTitle>
          <CardDescription>Your work history</CardDescription>
        </CardHeader>
        <CardContent>
          {!currentUser.experiences || currentUser.experiences.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
              <p>No experience data found.</p>
              <p className="text-sm mt-1">Upload a resume on your dashboard to auto-populate this section.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentUser.experiences.map((exp, i) => (
                <div key={exp.id || i} className="border-l-2 border-primary pl-4 pb-4">
                  <h4 className="font-semibold text-lg">{exp.role}</h4>
                  <p className="text-muted-foreground font-medium">{exp.company}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {exp.startDate ? new Date(exp.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'} - 
                    {exp.endDate ? new Date(exp.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ' Present'}
                  </p>
                  {exp.description && <p className="text-sm">{exp.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Education</CardTitle>
          <CardDescription>Your academic background</CardDescription>
        </CardHeader>
        <CardContent>
          {!currentUser.education || currentUser.education.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
              <p>No education data found.</p>
              <p className="text-sm mt-1">Upload a resume on your dashboard to auto-populate this section.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentUser.education.map((edu, i) => (
                <div key={edu.id || i} className="border p-4 rounded-md">
                  <h4 className="font-semibold">{edu.institution}</h4>
                  {(edu.degree || edu.field) && (
                    <p className="text-sm font-medium mt-1">
                      {edu.degree} {edu.field && `in ${edu.field}`}
                    </p>
                  )}
                  {edu.graduationYear && <p className="text-sm text-muted-foreground mt-1">Class of {edu.graduationYear}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
          <CardDescription>Your professional certifications</CardDescription>
        </CardHeader>
        <CardContent>
          {!currentUser.certifications || currentUser.certifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
              <p>No certification data found.</p>
              <p className="text-sm mt-1">Upload a resume on your dashboard to auto-populate this section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentUser.certifications.map((cert, i) => (
                <div key={cert.id || i} className="border p-4 rounded-md">
                  <h4 className="font-semibold">{cert.name}</h4>
                  {cert.issuer && <p className="text-sm text-muted-foreground mt-1">Issuer: {cert.issuer}</p>}
                  {cert.year && <p className="text-sm text-muted-foreground">Year: {cert.year}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
