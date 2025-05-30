
'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { S3Config } from '@/types/s3';
import { Upload } from 'lucide-react';
// Import the new server action for getting pre-signed URLs
import { getPresignedUploadUrl } from '@/app/actions/getPresignedUploadUrl';

interface FileUploadButtonProps {
  s3Config: S3Config | null;
  onUploadSuccess: (fileName?: string) => void;
  disabled?: boolean;
}

export function FileUploadButton({ s3Config, onUploadSuccess, disabled }: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!s3Config) {
      toast({
        title: 'Configuration Error',
        description: 'S3 configuration is not loaded. Cannot upload file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    toast({
      title: 'Preparing Upload...',
      description: `Requesting secure upload URL for ${file.name}.`,
    });

    try {
      // 1. Get pre-signed URL from server action
      console.log(`[FILE_UPLOAD_BUTTON] Requesting pre-signed URL for: ${file.name}, type: ${file.type}`);
      const presignedUrlResult = await getPresignedUploadUrl(s3Config, {
        fileName: file.name,
        fileType: file.type,
      });

      if (!presignedUrlResult.success || !presignedUrlResult.url) {
        console.error('[FILE_UPLOAD_BUTTON] Failed to get pre-signed URL:', presignedUrlResult.message);
        toast({
          title: 'Upload Failed',
          description: presignedUrlResult.message || 'Could not get upload URL.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      toast({
        title: 'Uploading...',
        description: `Sending ${file.name} directly to S3. This may take a moment.`,
      });
      console.log(`[FILE_UPLOAD_BUTTON] Uploading ${file.name} (${file.type}) directly to S3.`);
      // Log only a portion of the URL for security/brevity
      console.log(`[FILE_UPLOAD_BUTTON] Target URL: ${presignedUrlResult.url.substring(0, Math.min(100, presignedUrlResult.url.length))}...`);


      // 2. Upload file directly to S3 using fetch
      const uploadResponse = await fetch(presignedUrlResult.url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (uploadResponse.ok) {
        console.log(`[FILE_UPLOAD_BUTTON] Successfully uploaded ${file.name} to S3.`);
        toast({
          title: 'Upload Successful',
          description: `File "${file.name}" uploaded to S3.`,
        });
        onUploadSuccess(file.name);
      } else {
        const errorText = await uploadResponse.text();
        console.error(`[FILE_UPLOAD_BUTTON] S3 PUT error: ${uploadResponse.status} - ${uploadResponse.statusText}. Response: ${errorText}`);
        toast({
          title: 'Upload Failed',
          // Truncate errorText if it's too long
          description: `S3 returned an error: ${uploadResponse.status}. ${errorText.substring(0, 150)}${errorText.length > 150 ? '...' : ''}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[FILE_UPLOAD_BUTTON] Client-side upload error:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'An unexpected client-side error occurred during upload.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input to allow uploading the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || disabled}
        aria-hidden="true" // Hide from accessibility tree as it's triggered by button
      />
      <Button
        onClick={triggerFileInput}
        disabled={isUploading || disabled || !s3Config}
        variant="outline"
        size="sm"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Upload File'}
      </Button>
    </>
  );
}
