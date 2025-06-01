
'use client';

import type { S3Object, S3File } from '@/types/s3';
import { FileTreeItem } from './FileTreeItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ListTree, ArrowUpToLine } from 'lucide-react';
import { FileUploadButton } from './FileUploadButton';
import type { S3Config } from '@/types/s3';

interface FileTreeProps {
  items: S3Object[];
  onFileSelect: (file: S3File) => void;
  onNavigate: (pathKey: string) => void;
  currentPathKey: string;
  isLoading: boolean;
  configLoaded: boolean;
  s3Config: S3Config | null;
  onUploadSuccess: () => void;
}

const getParentPath = (pathKey: string): string => {
  if (!pathKey || pathKey === "/") return ""; 
  const segments = pathKey.split('/').filter(s => s.length > 0);
  if (segments.length <= 1) return ""; 
  segments.pop(); 
  return segments.join('/') + '/';
};

const getCurrentPathForDisplay = (pathKey: string): string => {
  if (!pathKey || pathKey === "/") return "Root";
  const segments = pathKey.split('/').filter(s => s.length > 0);
  return `Root > ${segments.join(' > ')}`;
}

export function FileTree({ 
  items, 
  onFileSelect, 
  onNavigate, 
  currentPathKey, 
  isLoading, 
  configLoaded, 
  s3Config, 
  onUploadSuccess 
}: FileTreeProps) {

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
          <CardDescription>Loading files from S3 bucket...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const pathForDisplay = getCurrentPathForDisplay(currentPathKey);
  const uploadTargetDisplay = currentPathKey ? currentPathKey.split('/').filter(s => s.length > 0).pop() || 'Root' : 'Root';

  if (items.length === 0 && configLoaded && !isLoading) {
     return (
      <Card className="h-full shadow-md flex flex-col">
        <CardHeader>
           <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ListTree className="h-6 w-6 text-accent" />
              File Explorer
            </CardTitle>
            <div className="flex items-center gap-2">
              {currentPathKey !== "" && (
                <Button variant="outline" size="sm" onClick={() => onNavigate(getParentPath(currentPathKey))} title="Go to parent folder">
                  <ArrowUpToLine className="h-4 w-4 mr-2" />
                  Go Up
                </Button>
              )}
              {configLoaded && s3Config && (
                <FileUploadButton
                  s3Config={s3Config}
                  onUploadSuccess={onUploadSuccess}
                  disabled={isLoading}
                  uploadPathKey={currentPathKey}
                />
              )}
            </div>
          </div>
          <CardDescription>
            Current path: <span className="font-semibold text-primary">{pathForDisplay}</span>.
            No items found. Upload to <span className="font-semibold text-primary">{uploadTargetDisplay}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-center text-muted-foreground p-8">
            This folder is empty.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <ListTree className="h-6 w-6 text-accent" />
            File Explorer
          </CardTitle>
          <div className="flex items-center gap-2">
            {currentPathKey !== "" && (
              <Button variant="outline" size="sm" onClick={() => onNavigate(getParentPath(currentPathKey))} title="Go to parent folder">
                <ArrowUpToLine className="h-4 w-4 mr-2" />
                Go Up
              </Button>
            )}
            {configLoaded && s3Config && (
              <FileUploadButton
                s3Config={s3Config}
                onUploadSuccess={onUploadSuccess}
                disabled={isLoading}
                uploadPathKey={currentPathKey}
              />
            )}
          </div>
        </div>
        <CardDescription>
          Current path: <span className="font-semibold text-primary">{pathForDisplay}</span>. 
          Uploads will go to <span className="font-semibold text-primary">{uploadTargetDisplay}</span>. Double-click a folder to enter.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {items.map((item) => (
            <FileTreeItem 
              key={item.key} 
              item={item} 
              level={0} // Level is now relative to the current view, so always 0 for direct children
              onFileSelect={onFileSelect}
              onNavigate={onNavigate}
            />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
