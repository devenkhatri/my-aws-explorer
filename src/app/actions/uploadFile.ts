
'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Config } from '@/types/s3';
import type { Readable } from 'stream';

export async function uploadFileToS3(
  config: S3Config,
  formData: FormData
): Promise<{ success: boolean; message: string; fileName?: string }> {
  const file = formData.get('file') as File | null;

  if (!file) {
    return { success: false, message: 'No file provided.' };
  }

  if (!config || !config.bucketName || !config.region || !config.accessKeyId || !config.secretAccessKey) {
    return { success: false, message: 'S3 configuration is missing or incomplete. All fields (bucketName, region, accessKeyId, secretAccessKey) are required.' };
  }

  try {
    const s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // Use file.stream() for efficient large file handling
    // The AWS SDK v3 expects a Node.js ReadableStream or a web ReadableStream.
    // File.stream() returns a web ReadableStream.
    const fileStream = file.stream() as unknown as Readable; 

    const params = {
      Bucket: config.bucketName,
      Key: file.name, 
      Body: fileStream,
      ContentType: file.type,
      ContentLength: file.size, // Important for S3 and progress tracking
    };

    await s3Client.send(new PutObjectCommand(params));
    return { success: true, message: `File "${file.name}" uploaded successfully.`, fileName: file.name };

  } catch (error) {
    console.error('Error in uploadFileToS3 server action:', error);
    
    let errorMessage = 'An unknown error occurred during file upload.';
    if (error instanceof Error) {
      errorMessage = String(error.message || 'Unknown error detail');
      if (error.name === 'AccessDenied') {
        errorMessage = 'Access Denied. Check S3 bucket permissions for PutObject and ensure your IAM user/role has s3:PutObject permission on the bucket/prefix.';
      } else if (error.name === 'NoSuchBucket') {
        errorMessage = `S3 Bucket "${config.bucketName}" not found. Please check the bucket name.`;
      } else if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch' || error.name === 'AuthFailure') {
        errorMessage = 'Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.';
      }
      // Add more specific error checks if needed, e.g., for timeouts or network issues
    }
    
    return { success: false, message: errorMessage };
  }
}
