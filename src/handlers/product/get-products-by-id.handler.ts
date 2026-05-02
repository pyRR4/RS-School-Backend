import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductsById } from '../../services/product.service';
import {BadRequestError, NotFoundError} from "../../errors/http.error";
import {withErrorHandler} from "../../utils/with-error-handler";

export const handler = withErrorHandler(async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Incoming request parameters:', event.pathParameters);

    const productId = event.pathParameters?.id;

    if (!productId) {
        throw new BadRequestError('Product ID is missing')
    }

    const product = await getProductsById(productId);

    if (!product) {
        throw new NotFoundError(`Product with id ${productId} not found`);
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(product),
    };
});