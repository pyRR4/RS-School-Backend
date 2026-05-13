import { handler } from './create-product.handler';
import { createProduct } from '../../services/product.service';
import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('../../services/product.service', () => ({
  createProduct: jest.fn()
}));

describe('createProduct handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const invokeHandler = async (bodyContent: string | null) => {
    const event = { body: bodyContent } as APIGatewayProxyEvent;
    const result = await handler(event);
    return {
      statusCode: result.statusCode,
      headers: result.headers,
      parsedBody: result.body ? JSON.parse(result.body) : null,
    };
  };

  it('should return 201 and the created product when payload is valid', async () => {
    const mockPayload = {
      title: 'Test Product',
      description: 'Test Description',
      price: 150,
      count: 10,
    };
    const mockCreatedProduct = { id: 'generated-uuid-123', ...mockPayload };
    (createProduct as jest.Mock).mockResolvedValue(mockCreatedProduct);

    const { statusCode, headers, parsedBody } = await invokeHandler(JSON.stringify(mockPayload));

    expect(statusCode).toBe(201);
    expect(headers?.['Content-Type']).toBe('application/json');
    expect(parsedBody).toEqual(mockCreatedProduct);
    expect(createProduct).toHaveBeenCalledWith(mockPayload);
  });

  it('should return 400 when body is completely missing', async () => {
    const { statusCode, parsedBody } = await invokeHandler(null);

    expect(statusCode).toBe(400);
    expect(parsedBody.message).toBe('Product data is missing from the request body');
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('should return 400 when body contains malformed JSON', async () => {
    const { statusCode, parsedBody } = await invokeHandler('{"title": "Test Product", "price": ');

    expect(statusCode).toBe(400);
    expect(parsedBody.message).toBe('Invalid JSON format');
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('should return 400 when validation fails due to invalid values (e.g., negative price)', async () => {
    const invalidPayload = { title: 'Test Product', price: -50, count: 5 };

    const { statusCode, parsedBody } = await invokeHandler(JSON.stringify(invalidPayload));

    expect(statusCode).toBe(400);
    expect(parsedBody.message).toContain('Validation error');
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('should return 400 when required fields are missing', async () => {
    const invalidPayload = { description: 'Missing title, price, and count' };

    const { statusCode, parsedBody } = await invokeHandler(JSON.stringify(invalidPayload));

    expect(statusCode).toBe(400);
    expect(parsedBody.message).toContain('Validation error');
    expect(createProduct).not.toHaveBeenCalled();
  });
});