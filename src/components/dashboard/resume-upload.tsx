'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useUsers';

export function ResumeUpload({ 
  onUploadSuccess,
  forceUploadMode = false,
}: { 
  onUploadSuccess?: () => void;
  forceUploadMode?: boolean;
}) {
  const { data: currentUser } = useCurrentUser();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const queryClient = useQueryClient();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        showErrorToast('Please upload a valid PDF file.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        showErrorToast('Please upload a valid PDF file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('resume', file);

      await apiClient.post('/resume/upload', formData);

      showSuccessToast('Resume uploaded and parsed successfully!');
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setFile(null);
      setIsReplacing(false);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error?.message ?? 'Failed to upload resume.'
        : 'Failed to upload resume.';
      showErrorToast(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // If user has a resume and is not actively replacing it, show the dashboard card (unless forced into upload mode)
  if (currentUser?.resumeUrl && !isReplacing && !forceUploadMode) {
    return (
      <Card className="border-green-500/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Resume Active
          </CardTitle>
          <CardDescription>
            Your resume is parsed, embedded, and actively used for job matchmaking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="p-4 border rounded-lg bg-emerald-50/30 flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-emerald-950">Active_Resume.pdf</p>
              <p className="text-xs text-muted-foreground">
                Embedding Status: <span className="capitalize font-medium text-emerald-700">{currentUser.embeddingStatus}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="outline"
              className="flex-1 border-muted hover:bg-muted/10"
            >
              <a
                href={currentUser.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Uploaded Resume
              </a>
            </Button>
            <Button
              onClick={() => setIsReplacing(true)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2 text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Upload New Resume
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/50 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-purple-500" />
          {currentUser?.resumeUrl ? 'Replace Current Resume' : 'Upload Resume (PDF)'}
        </CardTitle>
        <CardDescription>
          {currentUser?.resumeUrl 
            ? 'Uploading a new resume will automatically delete your previous resume from storage.' 
            : "We'll automatically extract your skills and experience using our AI parser."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-muted-foreground/25 bg-muted/10 hover:bg-muted/20 hover:border-purple-500/50'
              }`}
            >
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-purple-500' : 'text-muted-foreground'}`} />
              <p className="mb-2 text-sm font-medium text-center">
                Drag & drop your PDF resume here
              </p>
              <p className="text-xs text-muted-foreground mb-4 text-center">
                Max file size: 5MB
              </p>
              <div className="relative">
                <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                  Browse Files
                </Button>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
              </div>
            </div>

            {currentUser?.resumeUrl && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setFile(null);
                  setIsReplacing(false);
                }}
              >
                Keep Current Resume
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-purple-50/50 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                disabled={isUploading}
                className="text-destructive hover:text-destructive/90"
              >
                Remove
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {currentUser?.resumeUrl && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setIsReplacing(false);
                  }}
                  disabled={isUploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Extract Profile Data
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
