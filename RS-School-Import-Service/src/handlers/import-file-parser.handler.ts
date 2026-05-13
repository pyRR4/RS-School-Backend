import { S3Event } from 'aws-lambda';
import {getS3ObjectStream, moveFileInS3} from '../services/s3.service';
import { parseCsvStream } from '../services/parser.service';
import { withS3ErrorHandler } from '../utils/with-s3-error-handler';

export const handler = withS3ErrorHandler(async (event: S3Event): Promise<void> => {
  console.log('Received S3 Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const fileStream = await getS3ObjectStream(bucket, key);

    await parseCsvStream(fileStream, key);

    await moveFileInS3(bucket, key);

    console.log(`Completed full processing and move for: ${key}`);
  }
});