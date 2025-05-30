
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

  if (!config) {
    return { success: false, message: 'S3 configuration is missing.' };
  }

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

  try {
    await s3Client.send(new PutObjectCommand(params));
    return { success: true, message: `File "${file.name}" uploaded successfully.`, fileName: file.name };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    if (error instanceof Error) {
        // Provide more specific error messages for common S3 issues if possible
        if (error.name === 'AccessDenied') {
            return { success: false, message: 'Access Denied. Check S3 bucket permissions for PutObject.' };
        }
      return { success: false, message: `Failed to upload file: ${error.message}` };
    }
    return { success: false, message: 'An unknown error occurred during file upload.' };
  }
}
