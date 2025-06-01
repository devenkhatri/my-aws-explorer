
'use client';

import type React from 'react';
import { useState } from 'react';
import type { S3Object, S3File, S3Folder } from '@/types/s3';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Folder, FileText, DownloadCloud, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FileTreeItemProps {
  item: S3Object;
  level: number; // Remains for visual indentation if needed, though less critical with flat view
  onFileSelect: (file: S3File) => void;
  onNavigate: (pathKey: string) => void; // For folder navigation
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileTreeItem({ item, level, onFileSelect, onNavigate }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false); // For expanding item's own children if it's a folder with nested structure shown
  const { toast } = useToast();

  const isFolder = item.type === 'folder';
  const Icon = isFolder ? Folder : FileText;
  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;

  // Handles click on the chevron for expanding/collapsing the item's children
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation or file selection
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  // Handles click on the item row itself
  const handleClick = () => {
    if (item.type === 'file') {
      onFileSelect(item);
    }
    // For folders, single click doesn't navigate. Double click does.
  };

  const handleDoubleClick = () => {
    if (item.type === 'folder') {
      onNavigate(item.key);
    }
  };
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (item.type === 'file') {
      toast({
        title: 'Download Initiated (Mock)',
        description: `Preparing to download ${item.name}. In a real app, this would download from S3.`,
      });
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

  return (
    <div className="py-1">
      <div
        className={`flex items-center p-2 rounded-md hover:bg-accent/20 cursor-pointer ${level > 0 ? 'border-l-2 border-primary/30' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { 
          if (e.key === 'Enter') {
            if (isFolder) onNavigate(item.key); else if (item.type === 'file') onFileSelect(item);
          }
        }}
        aria-expanded={isFolder ? isOpen : undefined}
      >
        {isFolder && (item as S3Folder).children && (item as S3Folder).children.length > 0 && (
          <Button variant="ghost" size="icon" className="h-6 w-6 mr-1 p-0" onClick={handleToggleExpand}>
            <ChevronIcon className="h-5 w-5 shrink-0 text-accent" />
          </Button>
        )}
        {isFolder && (!(item as S3Folder).children || (item as S3Folder).children.length === 0) && (
          <span className="w-6 mr-1 shrink-0" /> // Placeholder for chevron alignment
        )}
        <Icon className={`h-5 w-5 mr-2 shrink-0 ${isFolder ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="truncate flex-grow">{item.name}</span>
        {!isFolder && (
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={handleShowInfo} title="Show Info" className="h-7 w-7">
              <Info className="h-4 w-4 text-accent" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download" className="h-7 w-7">
              <DownloadCloud className="h-4 w-4 text-accent" />
            </Button>
          </div>
        )}
      </div>
      {/* This section now renders children if the folder item itself is expanded, useful for a tree view */}
      {/* In a "breadcrumb/go-inside" navigation, 'items' passed to FileTree are already the children of currentPathKey */}
      {/* So, if 'item' is a folder in the current view, 'isOpen' controls showing its children within this view */}
      {isFolder && isOpen && (item as S3Folder).children && (item as S3Folder).children.length > 0 && (
        <div className="pl-4">
          {(item as S3Folder).children.map((child) => (
            <FileTreeItem 
              key={child.key} 
              item={child} 
              level={level + 1} 
              onFileSelect={onFileSelect}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
