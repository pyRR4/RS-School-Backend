import {S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {Readable} from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });

export const generateUploadUrl = async (fileName: string): Promise<string> => {
  const bucketName = process.env.IMPORT_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('IMPORT_BUCKET_NAME environment variable is missing');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `uploaded/${fileName}`,
    ContentType: 'text/csv',
  });

  return getSignedUrl(s3Client, command, { expiresIn: 60 });
};

export const getS3ObjectStream = async (bucketName: string, objectKey: string): Promise<Readable> => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const response = await s3Client.send(command);
  return response.Body as Readable;
};

export const moveFileInS3 = async (bucketName: string, originalKey: string): Promise<void> => {
  const newKey = originalKey.replace('uploaded/', 'parsed/');

  console.log(`Attempting to move file from ${originalKey} to ${newKey}`);

  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: `${bucketName}/${originalKey}`,
    Key: newKey,
  });

  await s3Client.send(copyCommand);
  console.log(`Successfully copied to ${newKey}`);
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: originalKey,
  });

  await s3Client.send(deleteCommand);
  console.log(`Successfully deleted original file ${originalKey}`);
};