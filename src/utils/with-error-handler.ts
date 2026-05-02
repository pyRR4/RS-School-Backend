import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpError } from '../errors/http.error';

type HandlerFunction = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export const withErrorHandler = (handler: HandlerFunction): HandlerFunction => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
            return await handler(event);
        } catch (error) {
            console.error('Error occured:', error);

            if (error instanceof HttpError) {
                return {
                    statusCode: error.statusCode,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: error.message }),
                };
            }

            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Internal Server Error' }),
            };
        }
    };
};