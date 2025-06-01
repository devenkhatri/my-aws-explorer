
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import type { S3Config, S3Object, S3File, S3Folder } from '@/types/s3';
import { fetchS3Objects } from '@/lib/s3-utils';
import { CodeXml, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const S3_CONFIG_STORAGE_KEY = 's3ExplorerConfig';

export default function S3ExplorerPage() {
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Objects, setS3Objects] = useState<S3Object[]>([]); // Stores the entire fetched tree
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [currentPathKey, setCurrentPathKey] = useState<string>(""); // Current folder path being viewed, "" for root
  const { toast } = useToast();

  // Effect to load config from localStorage on initial mount
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(S3_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        const parsedConfig: S3Config = JSON.parse(storedConfig);
        if (parsedConfig.bucketName && parsedConfig.region && parsedConfig.accessKeyId && parsedConfig.secretAccessKey) {
          handleConfigChange(parsedConfig, false);
          toast({
            title: 'Configuration Loaded from Cache',
            description: `Using cached S3 config for bucket: ${parsedConfig.bucketName}`,
          });
        } else {
          localStorage.removeItem(S3_CONFIG_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load S3 config from localStorage:", error);
      localStorage.removeItem(S3_CONFIG_STORAGE_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadS3Data = async (currentConfig: S3Config) => {
    setIsLoadingFiles(true);
    setSelectedFile(null);
    setCurrentPathKey(""); // Reset to root view when loading new data/config
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
      setS3Objects([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConfigChange = async (config: S3Config | null, saveToLocalStorage: boolean = true) => {
    setS3Config(config);
    setSelectedFile(null);
    setS3Objects([]);
    setCurrentPathKey(""); // Reset path on config change

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
      if (saveToLocalStorage) {
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

  const handleNavigate = (pathKey: string) => {
    setCurrentPathKey(pathKey);
    setSelectedFile(null); // Clear file selection when navigating folders
  };

  const getDisplayedItems = useCallback((): S3Object[] => {
    if (!currentPathKey || currentPathKey === "") {
      return s3Objects; // Root
    }

    const findNodeChildren = (nodes: S3Object[], key: string): S3Object[] | null => {
      for (const node of nodes) {
        if (node.key === key && node.type === 'folder') {
          return node.children;
        }
        if (node.type === 'folder' && node.children.length > 0) {
          const foundInChildren = findNodeChildren(node.children, key);
          if (foundInChildren) return foundInChildren;
        }
      }
      return null;
    };
    return findNodeChildren(s3Objects, currentPathKey) || [];
  }, [s3Objects, currentPathKey]);

  const handleUploadSuccess = async () => {
    if (s3Config) {
      toast({
        title: 'Refreshing file list...',
        description: `Fetching updated contents from S3.`,
      });
      // Re-fetch data and maintain current path if possible, or reset to root
      // For simplicity, let's re-fetch all and the user can navigate back if needed.
      // A more advanced solution would involve intelligently updating only the current view.
      await loadS3Data(s3Config); 
      // Note: loadS3Data currently resets currentPathKey to "".
      // If we want to stay in the same folder after upload, we'd need to preserve and re-apply currentPathKey
      // or pass it to loadS3Data to selectively refresh. For now, this is simpler.
    }
  };
  
  const displayedItems = getDisplayedItems();

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
            <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
              <FileTree
                items={displayedItems}
                onFileSelect={handleFileSelect}
                onNavigate={handleNavigate}
                currentPathKey={currentPathKey}
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
