
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
    // All operations that might throw an error are now inside this single try block
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
    // Handle S3 specific errors and then generic errors
    if (error instanceof Error) {
      // Check for common AWS SDK error names
      if (error.name === 'AccessDenied') {
        return { success: false, message: 'Access Denied. Check S3 bucket permissions for PutObject and ensure your IAM user/role has s3:PutObject permission on the bucket/prefix.' };
      }
      if (error.name === 'NoSuchBucket') {
        return { success: false, message: `S3 Bucket "${config.bucketName}" not found. Please check the bucket name.`};
      }
      if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch' || error.name === 'AuthFailure') {
        return { success: false, message: 'Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.' };
      }
      // Generic message for other errors
      return { success: false, message: `Failed to upload file: ${error.message}` };
    }
    // Fallback for non-Error objects
    return { success: false, message: 'An unknown error occurred during file upload.' };
  }
}
