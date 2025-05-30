
'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { S3Config } from '@/types/s3';
import { Upload } from 'lucide-react';
import { uploadFileToS3 } from '@/app/actions/uploadFile';

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
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadFileToS3(s3Config, formData);

      if (result.success && result.fileName) {
        toast({
          title: 'Upload Successful',
          description: result.message,
        });
        onUploadSuccess(result.fileName);
      } else {
        toast({
          title: 'Upload Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || disabled}
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
