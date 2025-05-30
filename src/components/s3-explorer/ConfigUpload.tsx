
'use client';

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { S3Config } from '@/types/s3';
import { UploadCloud, CheckCircle, AlertTriangle, Settings2, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfigUploadProps {
  onConfigChange: (config: S3Config | null) => void;
  currentConfig: S3Config | null;
}

const exampleConfigFormat = `{
  "bucketName": "your-s3-bucket-name",
  "region": "your-bucket-region",
  "accessKeyId": "your-aws-access-key-id",
  "secretAccessKey": "your-aws-secret-access-key"
}`;

export function ConfigUpload({ onConfigChange, currentConfig }: ConfigUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a JSON configuration file.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const config = JSON.parse(text) as S3Config;

        // Basic validation
        if (!config.bucketName || !config.region || !config.accessKeyId || !config.secretAccessKey) {
          throw new Error('Invalid configuration file. Missing required fields: bucketName, region, accessKeyId, secretAccessKey.');
        }
        
        onConfigChange(config);
        toast({
          title: 'Configuration Loaded',
          description: `Bucket: ${config.bucketName}, Region: ${config.region}`,
          action: <CheckCircle className="text-green-500" />,
        });
      } catch (error) {
        onConfigChange(null);
        toast({
          title: 'Error loading configuration',
          description: error instanceof Error ? error.message : 'Unknown error occurred. Ensure the file is valid JSON and contains all required fields.',
          variant: 'destructive',
          action: <AlertTriangle className="text-yellow-500" />,
        });
      } finally {
        setIsLoading(false);
        setFile(null); 
        // Reset file input
        const fileInput = document.getElementById('s3-config-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    };
    reader.onerror = () => {
      onConfigChange(null);
      toast({
        title: 'Error reading file',
        description: 'Could not read the selected file.',
        variant: 'destructive',
      });
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-accent" />
          S3 Configuration
        </CardTitle>
        <CardDescription>
          Upload your S3 access configuration JSON file.
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 p-0 inline-flex items-center justify-center">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="bg-background border shadow-lg p-3">
                <p className="text-sm font-medium mb-1">Example JSON format:</p>
                <pre className="text-xs bg-muted p-2 rounded-sm overflow-x-auto">{exampleConfigFormat}</pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s3-config-upload">Configuration File (.json)</Label>
          <Input id="s3-config-upload" type="file" accept=".json" onChange={handleFileChange} disabled={isLoading} />
        </div>
        <Button onClick={handleUpload} disabled={isLoading || !file} className="w-full">
          <UploadCloud className="mr-2 h-4 w-4" />
          {isLoading ? 'Loading...' : 'Load Configuration'}
        </Button>
        {currentConfig && (
          <div className="mt-4 p-3 border rounded-md bg-secondary/50 text-sm">
            <p className="font-semibold">Current Configuration:</p>
            <p>Bucket: <span className="font-medium text-primary">{currentConfig.bucketName}</span></p>
            <p>Region: <span className="font-medium text-primary">{currentConfig.region}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
