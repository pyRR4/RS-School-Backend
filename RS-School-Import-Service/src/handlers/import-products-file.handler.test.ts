import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './import-products-file.handler';

jest.mock('../services/s3.service', () => ({
  generateUploadUrl: jest.fn(),
}));

jest.mock('../utils/with-api-error-handler', () => ({
  withApiErrorHandler: (fn: unknown) => fn,
}));

import { generateUploadUrl } from '../services/s3.service';

const mockGenerateUploadUrl = generateUploadUrl as jest.Mock;

const makeEvent = (name?: string): APIGatewayProxyEvent =>
  ({
    queryStringParameters: name !== undefined ? { name } : null,
  }) as unknown as APIGatewayProxyEvent;


describe('importProductsFile handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateUploadUrl.mockResolvedValue('https://signed-url.example.com');
  });

  describe('success', () => {
    it('calls generateUploadUrl with the provided file name', async () => {
      await handler(makeEvent('products.csv'));

      expect(mockGenerateUploadUrl).toHaveBeenCalledWith('products.csv');
      expect(mockGenerateUploadUrl).toHaveBeenCalledTimes(1);
    });

    it('returns 200 status code', async () => {
      const result = await handler(makeEvent('products.csv'));

      expect(result.statusCode).toBe(200);
    });

    it('returns the signed URL as the response body', async () => {
      const signedUrl = 'https://s3.amazonaws.com/bucket/uploaded/products.csv?token=abc';
      mockGenerateUploadUrl.mockResolvedValue(signedUrl);

      const result = await handler(makeEvent('products.csv'));

      expect(result.body).toBe(signedUrl);
    });

    it('includes CORS header in response', async () => {
      const result = await handler(makeEvent('products.csv'));

      expect(result.headers).toMatchObject({ 'Access-Control-Allow-Origin': '*' });
    });

    it('includes Content-Type text/plain header', async () => {
      const result = await handler(makeEvent('products.csv'));

      expect(result.headers).toMatchObject({ 'Content-Type': 'text/plain' });
    });
  });

  describe('validation', () => {
    it('throws BadRequestError when "name" param is missing', async () => {
      await expect(handler(makeEvent())).rejects.toThrow('Missing "name" query string parameter.');
    });

    it('throws BadRequestError when "name" param is an empty string', async () => {
      await expect(handler(makeEvent(''))).rejects.toThrow('Missing "name" query string parameter.');
    });

    it('throws a BadRequestError (statusCode 400) when name is missing', async () => {
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it('does not call generateUploadUrl when validation fails', async () => {
      await expect(handler(makeEvent())).rejects.toThrow();

      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });
  });

  describe('error propagation', () => {
    it('propagates errors thrown by generateUploadUrl', async () => {
      mockGenerateUploadUrl.mockRejectedValue(new Error('S3 unavailable'));

      await expect(handler(makeEvent('f.csv'))).rejects.toThrow('S3 unavailable');
    });
  });

  describe('logging', () => {
    it('logs the query params at the start of the request', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const event = makeEvent('products.csv');

      await handler(event);

      expect(logSpy).toHaveBeenCalledWith(
        'GET /import requested. Query params:',
        event.queryStringParameters,
      );
      logSpy.mockRestore();
    });
  });
});