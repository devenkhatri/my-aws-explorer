
'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Config } from '@/types/s3';

interface PresignedUrlPayload {
  fileName: string;
  fileType: string;
}

export async function getPresignedUploadUrl(
  config: S3Config,
  payload: PresignedUrlPayload
): Promise<{ success: boolean; message: string; url?: string; fileName?: string }> {
  console.log('[PRESIGNED_URL_ACTION] Action started.');

  if (!config || !config.bucketName || !config.region || !config.accessKeyId || !config.secretAccessKey) {
    console.error('[PRESIGNED_URL_ACTION] S3 configuration is missing or incomplete.');
    return { success: false, message: 'S3 configuration is missing or incomplete. All fields (bucketName, region, accessKeyId, secretAccessKey) are required.' };
  }
  console.log(`[PRESIGNED_URL_ACTION] S3 config validated. Bucket: ${config.bucketName}, Region: ${config.region}`);

  if (!payload.fileName || !payload.fileType) {
    console.error('[PRESIGNED_URL_ACTION] File name or file type missing.');
    return { success: false, message: 'File name and file type are required.' };
  }
  console.log(`[PRESIGNED_URL_ACTION] Received payload: fileName=${payload.fileName}, fileType=${payload.fileType}`);


  try {
    console.log('[PRESIGNED_URL_ACTION] Initializing S3Client...');
    const s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      signatureVersion: 'v4', // Explicitly use v4, good practice for presigned URLs
    });
    console.log('[PRESIGNED_URL_ACTION] S3Client initialized.');

    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: payload.fileName,
      ContentType: payload.fileType,
      // ACL: 'public-read', // Optional: if you want the uploaded file to be publicly readable
    });

    // The expiration time for the pre-signed URL is in seconds.
    // E.g., 15 minutes = 15 * 60 = 900 seconds
    const expiresIn = 900; 
    console.log(`[PRESIGNED_URL_ACTION] Generating pre-signed URL for Key: ${payload.fileName}, Type: ${payload.fileType}, ExpiresIn: ${expiresIn}s`);
    
    const startTime = Date.now();
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    const endTime = Date.now();

    console.log(`[PRESIGNED_URL_ACTION] Pre-signed URL generated successfully in ${endTime - startTime}ms.`);
    // Log only a portion of the URL for brevity and security in logs
    console.log(`[PRESIGNED_URL_ACTION] URL: ${signedUrl.substring(0, Math.min(100, signedUrl.length))}...`);


    return {
      success: true,
      message: 'Pre-signed URL generated successfully.',
      url: signedUrl,
      fileName: payload.fileName,
    };

  } catch (error: unknown) {
    console.error('[PRESIGNED_URL_ACTION] Critical error during pre-signed URL generation:', error);
    
    let errorMessage = 'A critical error occurred during pre-signed URL generation.';
    if (error instanceof Error) {
      errorMessage = String(error.message || 'Unknown error detail from Error object');
      
      const awsError = error as Error & { $metadata?: { httpStatusCode?: number }, Code?: string, name?: string };

      if (awsError.name === 'AccessDenied' || awsError.Code === 'AccessDenied') {
        errorMessage = 'Access Denied generating pre-signed URL. Check S3 bucket CORS configuration and ensure your IAM user/role has s3:PutObject permission on the bucket/prefix.';
      } else if (awsError.name === 'NoSuchBucket' || awsError.Code === 'NoSuchBucket') {
        errorMessage = `S3 Bucket "${config.bucketName}" not found. Please check the bucket name.`;
      } else if (
        awsError.name === 'InvalidAccessKeyId' || awsError.Code === 'InvalidAccessKeyId' ||
        awsError.name === 'SignatureDoesNotMatch' || awsError.Code === 'SignatureDoesNotMatch' ||
        awsError.name === 'AuthFailure' || awsError.Code === 'AuthFailure' ||
        (awsError.$metadata?.httpStatusCode === 403 && (error.message.includes('InvalidAccessKeyId') || error.message.includes('SignatureDoesNotMatch')))
      ) {
        errorMessage = 'Invalid AWS credentials for generating pre-signed URL. Please check your Access Key ID and Secret Access Key.';
      }
      
      console.error('[PRESIGNED_URL_ACTION] Caught error details:', {
        name: awsError.name,
        code: awsError.Code,
        message: error.message,
        httpStatusCode: awsError.$metadata?.httpStatusCode,
        // stack: error.stack, // Stack trace can be very long
      });
    } else {
      errorMessage = 'An unexpected non-Error type was thrown during pre-signed URL generation: ' + String(error);
      console.error('[PRESIGNED_URL_ACTION] Caught non-Error throwable:', error);
    }
    
    return { success: false, message: errorMessage };
  }
}
