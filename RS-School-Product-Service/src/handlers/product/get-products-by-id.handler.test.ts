import { handler } from './get-products-by-id.handler';
import * as productService from '../../services/product.service';
import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('../../services/product.service');

describe('getProductById handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 and the product when a valid ID is provided', async () => {
        const mockProduct = { id: '123', title: 'Test', description: '', price: 10, count: 5 };
        (productService.getProductsById as jest.Mock).mockResolvedValue(mockProduct);

        const event = {
            pathParameters: { id: '123' }
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(mockProduct);
        expect(productService.getProductsById).toHaveBeenCalledWith('123');
    });

    it('should return 400 when product ID is missing from path parameters', async () => {
        const event = {
            pathParameters: {}
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Product ID is missing');
        expect(productService.getProductsById).not.toHaveBeenCalled();
    });

    it('should return 404 when product is not found in the service', async () => {
        (productService.getProductsById as jest.Mock).mockResolvedValue(undefined);

        const event = {
            pathParameters: { id: 'non-existent-id' }
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.message).toContain('not found');
    });
});