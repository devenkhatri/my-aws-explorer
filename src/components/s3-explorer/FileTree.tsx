'use client';

import type { S3Object, S3File } from '@/types/s3';
import { FileTreeItem } from './FileTreeItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListTree } from 'lucide-react';

interface FileTreeProps {
  items: S3Object[];
  onFileSelect: (file: S3File) => void;
  isLoading: boolean;
  configLoaded: boolean;
}

export function FileTree({ items, onFileSelect, isLoading, configLoaded }: FileTreeProps) {
  if (!configLoaded) {
    return (
      <Card className="h-full shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="h-6 w-6 text-accent" />
            File Explorer
          </CardTitle>
          <CardDescription>Upload an S3 configuration to browse files.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground p-8">
            Please load an S3 configuration using the sidebar.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="h-6 w-6 text-accent" />
            File Explorer
          </CardTitle>
          <CardDescription>Loading files...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (items.length === 0) {
     return (
      <Card className="h-full shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="h-6 w-6 text-accent" />
            File Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground p-8">
            No files or folders found in the bucket, or an error occurred.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTree className="h-6 w-6 text-accent" />
          File Explorer
        </CardTitle>
        <CardDescription>Browse files and folders in your S3 bucket.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {items.map((item) => (
            <FileTreeItem key={item.key} item={item} level={0} onFileSelect={onFileSelect} />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
