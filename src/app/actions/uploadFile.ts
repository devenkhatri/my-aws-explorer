
'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Config } from '@/types/s3';

export async function uploadFileToS3(
  config: S3Config,
  formData: FormData
): Promise<{ success: boolean; message: string; fileName?: string }> {
  const file = formData.get('file') as File | null;

  if (!file) {
    return { success: false, message: 'No file provided.' };
  }

  // Enhanced config validation
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

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const params = {
      Bucket: config.bucketName,
      Key: file.name, // Upload to root with original file name
      Body: fileBuffer,
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(params));
    return { success: true, message: `File "${file.name}" uploaded successfully.`, fileName: file.name };

  } catch (error) {
    console.error('Error in uploadFileToS3 server action:', error);
    
    if (error instanceof Error) {
      let specificMessage = `Failed to upload file: ${String(error.message || 'Unknown error detail')}`;
      // Check for common AWS SDK error names
      if (error.name === 'AccessDenied') {
        specificMessage = 'Access Denied. Check S3 bucket permissions for PutObject and ensure your IAM user/role has s3:PutObject permission on the bucket/prefix.';
      } else if (error.name === 'NoSuchBucket') {
        specificMessage = `S3 Bucket "${config.bucketName}" not found. Please check the bucket name.`;
      } else if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch' || error.name === 'AuthFailure') {
        specificMessage = 'Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.';
      }
      // Note: The specificMessage for known errors will override the generic one.
      return { success: false, message: specificMessage };
    }
    
    // Fallback for non-Error objects or other unexpected scenarios
    return { success: false, message: 'An unknown error occurred during file upload (the error object was not an instance of Error or had no message).' };
  }
}
