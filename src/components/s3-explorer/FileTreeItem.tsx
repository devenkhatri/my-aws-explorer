'use client';

import type React from 'react';
import { useState } from 'react';
import type { S3Object, S3File, S3Folder } from '@/types/s3';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ChevronDown, Folder, FileText, DownloadCloud, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FileTreeItemProps {
  item: S3Object;
  level: number;
  onFileSelect: (file: S3File) => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileTreeItem({ item, level, onFileSelect }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleToggle = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggle if it's a folder (though download is for files)
    if (item.type === 'file') {
      toast({
        title: 'Download Initiated (Mock)',
        description: `Preparing to download ${item.name}. In a real app, this would download from S3.`,
      });
      // In a real app, you would use AWS SDK to get a presigned URL or stream the file.
      // For mock, we can create a dummy download link:
      const dummyContent = `This is a mock download for ${item.name}.\nSize: ${formatBytes(item.size)}\nLast Modified: ${format(item.lastModified, 'PPP p')}`;
      const blob = new Blob([dummyContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShowInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'file') {
      onFileSelect(item);
    }
  };
  
  const isFolder = item.type === 'folder';
  const Icon = isFolder ? Folder : FileText;
  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;

  return (
    <div className="py-1">
      <div
        className={`flex items-center p-2 rounded-md hover:bg-accent/20 cursor-pointer ${level > 0 ? 'border-l-2 border-primary/30' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
        aria-expanded={isFolder ? isOpen : undefined}
      >
        {isFolder && (item as S3Folder).children.length > 0 && <ChevronIcon className="h-5 w-5 mr-2 shrink-0 text-accent" />}
        {isFolder && (item as S3Folder).children.length === 0 && <span className="w-5 mr-2 shrink-0" />} 
        <Icon className={`h-5 w-5 mr-2 shrink-0 ${isFolder ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="truncate flex-grow">{item.name}</span>
        {!isFolder && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" onClick={handleShowInfo} title="Show Info">
              <Info className="h-4 w-4 text-accent" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <DownloadCloud className="h-4 w-4 text-accent" />
            </Button>
          </div>
        )}
      </div>
      {isFolder && isOpen && (item as S3Folder).children.length > 0 && (
        <div className="pl-4">
          {(item as S3Folder).children.map((child) => (
            <FileTreeItem key={child.key} item={child} level={level + 1} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
