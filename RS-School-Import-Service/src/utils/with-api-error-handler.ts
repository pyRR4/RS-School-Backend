import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const withApiErrorHandler = (handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(event);
    } catch (error: any) {
      console.error('API Error:', error);

      return {
        statusCode: error.statusCode || 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
      };
    }
  };
};