
'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { S3Config } from '@/types/s3';
import { Upload } from 'lucide-react';
import { getPresignedUploadUrl } from '@/app/actions/getPresignedUploadUrl';

interface FileUploadButtonProps {
  s3Config: S3Config | null;
  onUploadSuccess: () => void; // Changed: No longer takes fileName
  disabled?: boolean;
}

export function FileUploadButton({ s3Config, onUploadSuccess, disabled }: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!s3Config) {
      toast({
        title: 'Configuration Error',
        description: 'S3 configuration is not loaded. Cannot upload files.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const numFiles = files.length;
    const fileArray = Array.from(files);

    toast({
      title: `Preparing to upload ${numFiles} file${numFiles > 1 ? 's' : ''}...`,
      description: `Requesting secure upload URLs. This may take a moment.`,
    });

    const uploadPromises = fileArray.map(async (file) => {
      try {
        console.log(`[FILE_UPLOAD_BUTTON] Requesting pre-signed URL for: ${file.name}, type: ${file.type}`);
        const presignedUrlResult = await getPresignedUploadUrl(s3Config, {
          fileName: file.name,
          fileType: file.type,
        });

        if (!presignedUrlResult.success || !presignedUrlResult.url) {
          console.error(`[FILE_UPLOAD_BUTTON] Failed to get pre-signed URL for ${file.name}: ${presignedUrlResult.message}`);
          return { success: false, fileName: file.name, error: presignedUrlResult.message || 'Could not get upload URL.' };
        }
        
        console.log(`[FILE_UPLOAD_BUTTON] Uploading ${file.name} (${file.type}) directly to S3.`);
        console.log(`[FILE_UPLOAD_BUTTON] Target URL for ${file.name}: ${presignedUrlResult.url.substring(0, Math.min(100, presignedUrlResult.url.length))}...`);

        const uploadResponse = await fetch(presignedUrlResult.url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok) {
          console.log(`[FILE_UPLOAD_BUTTON] Successfully uploaded ${file.name} to S3.`);
          return { success: true, fileName: file.name };
        } else {
          const errorText = await uploadResponse.text();
          console.error(`[FILE_UPLOAD_BUTTON] S3 PUT error for ${file.name}: ${uploadResponse.status} - ${uploadResponse.statusText}. Response: ${errorText}`);
          return { success: false, fileName: file.name, error: `S3 Error (${uploadResponse.status}): ${errorText.substring(0, 150)}${errorText.length > 150 ? '...' : ''}` };
        }
      } catch (error) {
        console.error(`[FILE_UPLOAD_BUTTON] Client-side upload error for ${file.name}:`, error);
        return { success: false, fileName: file.name, error: error instanceof Error ? error.message : 'An unexpected client-side error occurred.' };
      }
    });

    const results = await Promise.allSettled(uploadPromises);

    let successfulUploadCount = 0;
    const failedUploadsInfo: { fileName: string; error?: string }[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulUploadCount++;
        } else {
          failedUploadsInfo.push({ fileName: result.value.fileName, error: result.value.error });
        }
      } else {
        // This case handles unhandled promise rejections, though our try/catch within map should prevent most.
        // We don't have fileName here directly if the promise itself rejected before returning an object.
        console.error('[FILE_UPLOAD_BUTTON] A promise was rejected:', result.reason);
        failedUploadsInfo.push({ fileName: 'Unknown file (upload promise rejected)', error: String(result.reason) });
      }
    });
    
    if (successfulUploadCount > 0 && failedUploadsInfo.length === 0) {
      toast({
        title: 'All Uploads Successful',
        description: `${successfulUploadCount} file${successfulUploadCount > 1 ? 's' : ''} uploaded to S3.`,
      });
    } else if (successfulUploadCount > 0 && failedUploadsInfo.length > 0) {
      toast({
        title: 'Partial Upload Success',
        description: `${successfulUploadCount} file${successfulUploadCount > 1 ? 's' : ''} uploaded. ${failedUploadsInfo.length} failed: ${failedUploadsInfo.map(f => f.fileName).join(', ')}.`,
        variant: 'default', // Or consider a warning variant if you had one
      });
    } else if (failedUploadsInfo.length > 0) {
      toast({
        title: 'All Uploads Failed',
        description: `${failedUploadsInfo.length} file${failedUploadsInfo.length > 1 ? 's' : ''} could not be uploaded. Failures: ${failedUploadsInfo.map(f => `${f.fileName} (${f.error || 'Unknown reason'})`).join('; ')}`,
        variant: 'destructive',
      });
    }


    if (successfulUploadCount > 0) {
      onUploadSuccess(); // Refresh list if at least one upload succeeded
    }

    setIsUploading(false);
    // Reset file input to allow uploading the same file(s) again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        aria-hidden="true"
        multiple // Allow multiple file selection
      />
      <Button
        onClick={triggerFileInput}
        disabled={isUploading || disabled || !s3Config}
        variant="outline"
        size="sm"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? 'Uploading...' : `Upload File${isUploading && fileArray.length > 1 ? 's' : ''}`}
      </Button>
    </>
  );
}
