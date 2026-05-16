import { S3Event } from 'aws-lambda';

export const withS3ErrorHandler = (handler: (event: S3Event) => Promise<void>) => {
  return async (event: S3Event): Promise<void> => {
    try {
      await handler(event);
    } catch (error) {
      console.error('CRITICAL ERROR in S3 Event Handler:', error);

      throw error;
    }
  };
};