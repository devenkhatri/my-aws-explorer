
'use client';

import { useState, useEffect } from 'react';
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
import { fetchS3Objects } from '@/lib/s3-utils';
import { CodeXml, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const S3_CONFIG_STORAGE_KEY = 's3ExplorerConfig';

export default function S3ExplorerPage() {
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Objects, setS3Objects] = useState<S3Object[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const { toast } = useToast();

  // Effect to load config from localStorage on initial mount
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(S3_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        const parsedConfig: S3Config = JSON.parse(storedConfig);
        // Basic validation of stored config
        if (parsedConfig.bucketName && parsedConfig.region && parsedConfig.accessKeyId && parsedConfig.secretAccessKey) {
          handleConfigChange(parsedConfig, false); // false to prevent immediate re-saving
          toast({
            title: 'Configuration Loaded from Cache',
            description: `Using cached S3 config for bucket: ${parsedConfig.bucketName}`,
          });
        } else {
          localStorage.removeItem(S3_CONFIG_STORAGE_KEY); // Clear invalid stored config
        }
      }
    } catch (error) {
      console.error("Failed to load S3 config from localStorage:", error);
      localStorage.removeItem(S3_CONFIG_STORAGE_KEY); // Clear potentially corrupted data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount


  const loadS3Data = async (currentConfig: S3Config) => {
    setIsLoadingFiles(true);
    setSelectedFile(null); // Reset selected file when loading new data
    try {
      const objects = await fetchS3Objects(currentConfig);
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
  };

  const handleConfigChange = async (config: S3Config | null, saveToLocalStorage: boolean = true) => {
    setS3Config(config);
    setSelectedFile(null);
    setS3Objects([]);

    if (config) {
      if (saveToLocalStorage) {
        try {
          localStorage.setItem(S3_CONFIG_STORAGE_KEY, JSON.stringify(config));
        } catch (error) {
          console.error("Failed to save S3 config to localStorage:", error);
          toast({
            title: 'Could not cache configuration',
            description: 'Your S3 configuration could not be saved in the browser for next time.',
            variant: 'default',
          });
        }
      }
      await loadS3Data(config);
    } else {
      if (saveToLocalStorage) { // Also remove if explicitly cleared or errored during new load
        try {
          localStorage.removeItem(S3_CONFIG_STORAGE_KEY);
        } catch (error) {
          console.error("Failed to remove S3 config from localStorage:", error);
        }
      }
    }
  };

  const handleFileSelect = (file: S3File) => {
    setSelectedFile(file);
  };

  const handleUploadSuccess = async () => {
    if (s3Config) {
      toast({
        title: 'Refreshing file list...',
        description: `Fetching updated contents from S3.`,
      });
      await loadS3Data(s3Config);
    }
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
                <h1 className="text-xl font-semibold text-foreground">My AWS Explorer</h1>
              </div>
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <ConfigUpload onConfigChange={(config) => handleConfigChange(config, true)} currentConfig={s3Config} />
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
                s3Config={s3Config}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
