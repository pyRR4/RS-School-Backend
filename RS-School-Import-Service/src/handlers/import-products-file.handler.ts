import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateUploadUrl } from '../services/s3.service';
import { withApiErrorHandler } from '../utils/with-api-error-handler';
import { BadRequestError } from '../errors/http.error';

export const handler = withApiErrorHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('GET /import requested. Query params:', event.queryStringParameters);

  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    throw new BadRequestError('Missing "name" query string parameter.');
  }

  const signedUrl = await generateUploadUrl(fileName);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
    body: signedUrl,
  };
});