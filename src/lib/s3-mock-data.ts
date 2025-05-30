import type { S3Object } from '@/types/s3';

export const mockS3Objects: S3Object[] = [
  {
    type: 'folder',
    name: 'documents',
    path: 'documents/',
    key: 'documents/',
    children: [
      {
        type: 'file',
        name: 'report.docx',
        size: 1024 * 256, // 256 KB
        lastModified: new Date('2023-10-15T10:30:00Z'),
        path: 'documents/report.docx',
        key: 'documents/report.docx',
      },
      {
        type: 'folder',
        name: 'archive',
        path: 'documents/archive/',
        key: 'documents/archive/',
        children: [
          {
            type: 'file',
            name: 'old_data.zip',
            size: 1024 * 1024 * 5, // 5 MB
            lastModified: new Date('2022-01-20T14:00:00Z'),
            path: 'documents/archive/old_data.zip',
            key: 'documents/archive/old_data.zip',
          },
        ],
      },
    ],
  },
  {
    type: 'folder',
    name: 'images',
    path: 'images/',
    key: 'images/',
    children: [
      {
        type: 'file',
        name: 'photo1.jpg',
        size: 1024 * 1024 * 2, // 2 MB
        lastModified: new Date('2023-11-01T09:15:00Z'),
        path: 'images/photo1.jpg',
        key: 'images/photo1.jpg',
      },
      {
        type: 'file',
        name: 'logo.png',
        size: 1024 * 50, // 50 KB
        lastModified: new Date('2023-09-01T17:45:00Z'),
        path: 'images/logo.png',
        key: 'images/logo.png',
      },
    ],
  },
  {
    type: 'file',
    name: 'README.md',
    size: 1024 * 2, // 2 KB
    lastModified: new Date('2023-11-10T12:00:00Z'),
    path: 'README.md',
    key: 'README.md',
  },
  {
    type: 'folder',
    name: 'empty_folder',
    path: 'empty_folder/',
    key: 'empty_folder/',
    children: [],
  }
];
