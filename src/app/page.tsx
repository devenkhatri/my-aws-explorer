
'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ConfigUpload } from '@/components/s3-explorer/ConfigUpload';
import { FileTree } from '@/components/s3-explorer/FileTree';
import { FileInfoDisplay } from '@/components/s3-explorer/FileInfoDisplay';
import { Button } from '@/components/ui/button';
import type { S3Config, S3Object, S3File } from '@/types/s3';
import { fetchS3Objects } from '@/lib/s3-utils'; // Import the new utility
import { CodeXml, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function S3ExplorerPage() {
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Objects, setS3Objects] = useState<S3Object[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const { toast } = useToast();

  const handleConfigChange = async (config: S3Config | null) => {
    setS3Config(config);
    setSelectedFile(null); 
    setS3Objects([]); 

    if (config) {
      setIsLoadingFiles(true);
      try {
        const objects = await fetchS3Objects(config);
        setS3Objects(objects);
      } catch (error) {
        console.error("Failed to load S3 objects:", error);
        toast({
          title: 'Error Loading S3 Data',
          description: error instanceof Error ? error.message : 'Could not fetch data from S3.',
          variant: 'destructive',
          action: <AlertTriangle className="text-yellow-500" />,
        });
        setS3Objects([]); // Clear objects on error
      } finally {
        setIsLoadingFiles(false);
      }
    }
  };

  const handleFileSelect = (file: S3File) => {
    setSelectedFile(file);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-primary/20 hover:bg-primary/30 text-primary-foreground">
                  <CodeXml className="h-5 w-5 text-primary" />
                </Button>
                <h1 className="text-xl font-semibold text-foreground">S3 Explorer</h1>
              </div>
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <ConfigUpload onConfigChange={handleConfigChange} currentConfig={s3Config} />
          <div className="mt-6">
            <FileInfoDisplay selectedFile={selectedFile} />
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-full w-full items-start justify-center p-4 md:p-6">
            <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]"> {/* Adjust height for padding */}
              <FileTree 
                items={s3Objects} 
                onFileSelect={handleFileSelect} 
                isLoading={isLoadingFiles}
                configLoaded={!!s3Config}
              />
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
