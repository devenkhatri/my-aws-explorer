
'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Config } from '@/types/s3';
// No longer importing Node.js Readable as we'll rely on Web API ReadableStream

export async function uploadFileToS3(
  config: S3Config,
  formData: FormData
): Promise<{ success: boolean; message: string; fileName?: string }> {
  console.log('[UPLOAD_ACTION] Action started.');

  const file = formData.get('file') as File | null;

  if (!file) {
    console.error('[UPLOAD_ACTION] No file provided.');
    return { success: false, message: 'No file provided.' };
  }
  console.log(`[UPLOAD_ACTION] File received: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

  if (!config || !config.bucketName || !config.region || !config.accessKeyId || !config.secretAccessKey) {
    console.error('[UPLOAD_ACTION] S3 configuration is missing or incomplete.');
    return { success: false, message: 'S3 configuration is missing or incomplete. All fields (bucketName, region, accessKeyId, secretAccessKey) are required.' };
  }
  console.log(`[UPLOAD_ACTION] S3 config validated. Bucket: ${config.bucketName}, Region: ${config.region}`);

  let s3Client: S3Client;
  try {
    console.log('[UPLOAD_ACTION] Initializing S3Client...');
    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Consider adding requestTimeout or connectionTimeout for very long uploads, e.g.:
      // requestTimeout: 300000, // 5 minutes in milliseconds
    });
    console.log('[UPLOAD_ACTION] S3Client initialized.');

    const fileStream = file.stream(); // This is a Web API ReadableStream
    console.log('[UPLOAD_ACTION] Obtained file stream.');

    const params = {
      Bucket: config.bucketName,
      Key: file.name,
      Body: fileStream, // Pass the Web API ReadableStream directly
      ContentType: file.type,
      ContentLength: file.size,
    };
    console.log(`[UPLOAD_ACTION] Prepared S3 PutObjectCommand params for key: ${params.Key}, size: ${params.ContentLength}`);

    console.log('[UPLOAD_ACTION] Attempting to send PutObjectCommand to S3...');
    const startTime = Date.now();
    await s3Client.send(new PutObjectCommand(params));
    const endTime = Date.now();
    console.log(`[UPLOAD_ACTION] File "${file.name}" uploaded successfully to S3. Duration: ${endTime - startTime}ms`);

    return { success: true, message: `File "${file.name}" uploaded successfully.`, fileName: file.name };

  } catch (error: unknown) {
    console.error('[UPLOAD_ACTION] Critical error during S3 operation or setup:', error);

    let errorMessage = 'A critical error occurred during file upload.';
    if (error instanceof Error) {
      errorMessage = String(error.message || 'Unknown error detail from Error object');
      
      // Specific AWS SDK v3 error check. Errors from S3 often have a $metadata property and a name/Code.
      const awsError = error as Error & { $metadata?: { httpStatusCode?: number }, Code?: string };

      if (awsError.name === 'AccessDenied' || awsError.Code === 'AccessDenied') {
        errorMessage = 'Access Denied. Check S3 bucket permissions for PutObject and ensure your IAM user/role has s3:PutObject permission on the bucket/prefix.';
      } else if (awsError.name === 'NoSuchBucket' || awsError.Code === 'NoSuchBucket') {
        errorMessage = `S3 Bucket "${config.bucketName}" not found. Please check the bucket name.`;
      } else if (
        awsError.name === 'InvalidAccessKeyId' || awsError.Code === 'InvalidAccessKeyId' ||
        awsError.name === 'SignatureDoesNotMatch' || awsError.Code === 'SignatureDoesNotMatch' ||
        awsError.name === 'AuthFailure' || awsError.Code === 'AuthFailure' ||
        (awsError.$metadata?.httpStatusCode === 403 && (error.message.includes('InvalidAccessKeyId') || error.message.includes('SignatureDoesNotMatch')))
      ) {
        errorMessage = 'Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.';
      }
      
      console.error('[UPLOAD_ACTION] Caught error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack, // Stack trace can be very long, but useful for debugging
        awsSpecificCode: awsError.Code, 
        httpStatusCode: awsError.$metadata?.httpStatusCode,
      });
    } else {
      errorMessage = 'An unexpected non-Error type was thrown during upload: ' + String(error);
       console.error('[UPLOAD_ACTION] Caught non-Error throwable:', error);
    }
    
    return { success: false, message: errorMessage };
  }
}
