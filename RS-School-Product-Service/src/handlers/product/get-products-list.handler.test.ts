import { handler } from './get-products-list.handler';
import * as productService from '../../services/product.service';
import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('../../services/product.service');

describe('getProductsList handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 and a list of products', async () => {
        const mockProducts = [
            { id: '1', title: 'Test Product', description: 'Test', price: 10, count: 5 }
        ];

        (productService.getProductsList as jest.Mock).mockResolvedValue(mockProducts);

        const event = {} as APIGatewayProxyEvent;

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('application/json');

        const body = JSON.parse(result.body);
        expect(body).toEqual(mockProducts);

        expect(productService.getProductsList).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when service throws an unexpected error', async () => {
        (productService.getProductsList as jest.Mock).mockRejectedValue(new Error('Database down'));

        const event = {} as APIGatewayProxyEvent;

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
    });
});