'use client';

import type { S3File } from '@/types/s3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CalendarDays, HardDrive, Key } from 'lucide-react';
import { format } from 'date-fns';

interface FileInfoDisplayProps {
  selectedFile: S3File | null;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileInfoDisplay({ selectedFile }: FileInfoDisplayProps) {
  if (!selectedFile) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-accent" />
            File Information
          </CardTitle>
          <CardDescription>Select a file to see its details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground p-4">No file selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent" />
          {selectedFile.name}
        </CardTitle>
        <CardDescription>Details for the selected file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center">
          <HardDrive className="h-4 w-4 mr-2 text-muted-foreground" />
          <strong>Size:</strong> <span className="ml-1">{formatBytes(selectedFile.size)}</span>
        </div>
        <div className="flex items-center">
          <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
          <strong>Last Modified:</strong> <span className="ml-1">{format(selectedFile.lastModified, 'PPP p')}</span>
        </div>
        <div className="flex items-center">
          <Key className="h-4 w-4 mr-2 text-muted-foreground" />
          <strong>Full Path:</strong> <span className="ml-1 truncate" title={selectedFile.key}>{selectedFile.key}</span>
        </div>
      </CardContent>
    </Card>
  );
}
