
'use server';

import { S3Client, ListObjectsV2Command, type _Object } from '@aws-sdk/client-s3';
import type { S3Config, S3Object, S3Folder, S3File } from '@/types/s3';

function buildS3Tree(objects: ({ Key?: string; Size?: number; LastModified?: Date })[]): S3Object[] {
  const rootItems: S3Object[] = [];
  // folderMap stores folders by their full key (e.g., "documents/archive/")
  const folderMap = new Map<string, S3Folder>();

  // Creates/retrieves a folder and all its parents, returns the S3Folder object for the given fullPath
  const getOrCreateFolder = (fullPath: string): S3Folder => {
    // Check if folder already memoized
    const memoizedFolder = folderMap.get(fullPath);
    if (memoizedFolder) {
      return memoizedFolder;
    }

    const pathSegments = fullPath.split('/').filter(p => p.length > 0); // e.g., "foo/bar/" -> ["foo", "bar"]
    let currentItemsList = rootItems;
    let currentPathPrefix = '';
    let folder: S3Folder | undefined; 

    for (let i = 0; i < pathSegments.length; i++) {
      const segmentName = pathSegments[i];
      currentPathPrefix += segmentName + '/';

      // Find existing folder at this level
      folder = currentItemsList.find(
        (item): item is S3Folder => item.type === 'folder' && item.key === currentPathPrefix
      );

      if (!folder) {
        // Create new folder if it doesn't exist
        folder = {
          type: 'folder',
          name: segmentName,
          path: currentPathPrefix,
          key: currentPathPrefix,
          children: [],
        };
        currentItemsList.push(folder);
        folderMap.set(currentPathPrefix, folder); // Memoize the newly created folder
      }
      // Move to the children of the current folder for the next segment
      currentItemsList = folder.children;
    }
    // The last folder processed in the loop is the one corresponding to fullPath
    return folder!; 
  };
  
  // Sort objects by key. This helps ensure that parent directories are generally processed before their contents,
  // although getOrCreateFolder is designed to handle any order.
  const sortedObjects = objects.sort((a, b) => (a.Key || "").localeCompare(b.Key || ""));

  for (const obj of sortedObjects) {
    if (!obj.Key) continue;

    const key = obj.Key;
    // An "actual" folder in S3 is often represented by an object with a key ending in "/" and Size 0.
    const isActualFolder = key.endsWith('/'); 

    if (isActualFolder) {
      getOrCreateFolder(key); // Ensure this folder exists in the tree
    } else {
      // This is a file, e.g. "foo/bar/baz.txt"
      const pathSegments = key.split('/');
      const fileName = pathSegments.pop()!; // baz.txt (pathSegments is now ["foo", "bar"])
      
      let targetChildrenList: S3Object[];
      if (pathSegments.length === 0) { // File is in the root
        targetChildrenList = rootItems;
      } else {
        const parentFolderPath = pathSegments.join('/') + '/'; // "foo/bar/"
        const parentFolder = getOrCreateFolder(parentFolderPath);
        targetChildrenList = parentFolder.children;
      }

      // Add the file if it doesn't already exist in this part of the tree
      if (!targetChildrenList.some(item => item.key === key)) {
        const file: S3File = {
          type: 'file',
          name: fileName,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          path: key,
          key: key,
        };
        targetChildrenList.push(file);
      }
    }
  }
  return rootItems;
}

export async function fetchS3Objects(config: S3Config): Promise<S3Object[]> {
  const s3Client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  let continuationToken: string | undefined = undefined;
  const allS3RawObjects: _Object[] = [];
  let isTruncated = true;

  try {
    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: config.bucketName,
        ContinuationToken: continuationToken,
      });
      const response = await s3Client.send(command);
      
      if (response.Contents) {
        allS3RawObjects.push(...response.Contents);
      }

      isTruncated = !!response.IsTruncated;
      if (isTruncated) {
        continuationToken = response.NextContinuationToken;
      } else {
        continuationToken = undefined; // Explicitly clear if not truncated
      }
    }
    return buildS3Tree(allS3RawObjects);
  } catch (error) {
    console.error("Error fetching S3 objects:", error);
    if (error instanceof Error) {
        // Provide more specific error messages for common S3 issues if possible
        if (error.name === 'NoSuchBucket') {
            throw new Error(`Bucket "${config.bucketName}" not found or access denied.`);
        }
        if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch' || error.name === 'AuthFailure') {
            throw new Error('Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.');
        }
        throw new Error(`Failed to fetch S3 objects: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching S3 objects.");
  }
}
