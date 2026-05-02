import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductsList } from '../../services/product.service';
import { withErrorHandler } from '../../utils/with-error-handler';

export const handler = withErrorHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Fetching all products');

    const products = await getProductsList();

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(products),
    };
});