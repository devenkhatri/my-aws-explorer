export interface S3File {
  type: 'file';
  name: string;
  size: number; // in bytes
  lastModified: Date;
  path: string;
  key: string; // Full S3 key
}

export interface S3Folder {
  type: 'folder';
  name: string;
  path: string;
  key: string; // Full S3 key prefix
  children: S3Object[];
}

export type S3Object = S3File | S3Folder;

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}
