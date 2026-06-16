'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';

export default function UploadJobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setProgress(0);
      setErrorCount(0);
    }
  };

  const parseCSV = (text: string) => {
    // Simple CSV parser supporting standard quotes internally if needed, but primarily basic comma sep
    const rows = text.split('\n').map(row => row.trim()).filter(Boolean);
    if (rows.length < 2) throw new Error('CSV must contain at least a header row and one data row');

    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    
    // Check required columns
    const titleIdx = headers.findIndex(h => h.includes('title'));
    const descriptionIdx = headers.findIndex(h => h.includes('description'));
    const skillsIdx = headers.findIndex(h => h.includes('skill'));
    
    if (titleIdx === -1 || descriptionIdx === -1 || skillsIdx === -1) {
      throw new Error('CSV must have "Title", "Description", and "Skills" columns');
    }

    const jobs = [];
    for (let i = 1; i < rows.length; i++) {
      // Very regex to handle basic quotes if present, else just split by comma
      // For simplicity, naive splitting if no quotes, else basic regex
      // A full library would be better, but this handles simple cases.
      const matchPattern = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const columns = rows[i].split(matchPattern).map(c => c.replace(/^"|"$/g, '').trim());
      
      const title = columns[titleIdx];
      const description = columns[descriptionIdx];
      const skillsStr = columns[skillsIdx];
      
      if (title && description && skillsStr) {
        jobs.push({
          title,
          description,
          requiredSkills: skillsStr.split(';').map(s => s.trim()).filter(Boolean),
        });
      }
    }
    
    return jobs;
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorCount(0);
      
      const text = await file.text();
      let jobs;
      try {
        jobs = parseCSV(text);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        showErrorToast(`Failed to parse CSV: ${errorMsg}`);
        setIsUploading(false);
        return;
      }

      if (jobs.length === 0) {
        showErrorToast('No valid jobs found in CSV');
        setIsUploading(false);
        return;
      }

      let successCount = 0;
      let currErrorCount = 0;

      // Process sequentially to not hammer the API
      for (let i = 0; i < jobs.length; i++) {
        try {
          await apiClient.post('/jobs', jobs[i]);
          successCount++;
        } catch {
          currErrorCount++;
        }
        setProgress(Math.round(((i + 1) / jobs.length) * 100));
      }

      setErrorCount(currErrorCount);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      if (successCount > 0) {
        showSuccessToast(`Successfully uploaded ${successCount} job(s)`);
      }
      
      if (currErrorCount === 0 && successCount > 0) {
        router.push('/jobs');
      } else {
        showErrorToast(`${currErrorCount} job(s) failed to upload`);
      }
    } catch {
      showErrorToast('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role === 'CANDIDATE') {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
            <CardDescription>
              Only Recruiters and Admins can upload job postings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Upload Jobs</CardTitle>
                <CardDescription>
                  Bulk upload jobs using a CSV file.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 border border-blue-200 bg-blue-50 text-blue-800 rounded-md text-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                CSV Format Requirements
              </h4>
              <p className="mb-2">Your CSV must include the following column headers (case-insensitive):</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Title</strong> (e.g., Senior Developer)</li>
                <li><strong>Description</strong> (e.g., The role entails...)</li>
                <li><strong>Skills</strong> (semicolon-separated, e.g., React; Node.js; TypeScript)</li>
              </ul>
            </div>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10">
              <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="mb-4 text-sm font-medium">Select a CSV file to upload</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            {errorCount > 0 && !isUploading && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                {errorCount} row(s) failed to upload. Please check your data or title/description length limits.
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="ghost" asChild disabled={isUploading}>
              <Link href="/jobs">Cancel</Link>
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : 'Upload and Create Jobs'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
