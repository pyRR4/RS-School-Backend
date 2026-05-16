import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { withApiErrorHandler } from './with-api-error-handler';

const mockApiEvent = {} as APIGatewayProxyEvent;

const makeApiHandler = (result: APIGatewayProxyResult) =>
  jest.fn().mockResolvedValue(result);

const makeFailingApiHandler = (error: unknown) =>
  jest.fn().mockRejectedValue(error);

describe('withApiErrorHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('happy path', () => {
    it('calls the inner handler with the original event', async () => {
      const successResponse: APIGatewayProxyResult = { statusCode: 200, body: 'ok' };
      const handler = makeApiHandler(successResponse);

      await withApiErrorHandler(handler)(mockApiEvent);

      expect(handler).toHaveBeenCalledWith(mockApiEvent);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns the response from the inner handler unchanged', async () => {
      const successResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 42 }),
      };

      const result = await withApiErrorHandler(makeApiHandler(successResponse))(mockApiEvent);

      expect(result).toEqual(successResponse);
    });
  });

  describe('error handling', () => {
    it('returns 500 when the inner handler throws a plain Error', async () => {
      const handler = makeFailingApiHandler(new Error('something broke'));

      const result = await withApiErrorHandler(handler)(mockApiEvent);

      expect(result.statusCode).toBe(500);
    });

    it('uses error.statusCode when present', async () => {
      const error = Object.assign(new Error('Not Found'), { statusCode: 404 });

      const result = await withApiErrorHandler(makeFailingApiHandler(error))(mockApiEvent);

      expect(result.statusCode).toBe(404);
    });

    it('falls back to 500 when error.statusCode is missing', async () => {
      const result = await withApiErrorHandler(
        makeFailingApiHandler(new Error('oops')),
      )(mockApiEvent);

      expect(result.statusCode).toBe(500);
    });

    it('includes the error message in the body', async () => {
      const error = new Error('Validation failed');

      const result = await withApiErrorHandler(makeFailingApiHandler(error))(mockApiEvent);
      const body = JSON.parse(result.body);

      expect(body.message).toBe('Validation failed');
    });

    it('falls back to "Internal Server Error" when error.message is missing', async () => {
      const result = await withApiErrorHandler(
        makeFailingApiHandler({}),
      )(mockApiEvent);
      const body = JSON.parse(result.body);

      expect(body.message).toBe('Internal Server Error');
    });

    it('always includes CORS header in error response', async () => {
      const result = await withApiErrorHandler(
        makeFailingApiHandler(new Error('err')),
      )(mockApiEvent);

      expect(result.headers).toEqual(
        expect.objectContaining({ 'Access-Control-Allow-Origin': '*' }),
      );
    });

    it('returns a valid JSON string in the body', async () => {
      const result = await withApiErrorHandler(
        makeFailingApiHandler(new Error('bad')),
      )(mockApiEvent);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('logs the error to console.error', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('logged error');

      await withApiErrorHandler(makeFailingApiHandler(error))(mockApiEvent);

      expect(errorSpy).toHaveBeenCalledWith('API Error:', error);
      errorSpy.mockRestore();
    });

    it('does not throw — always resolves with an APIGatewayProxyResult', async () => {
      await expect(
        withApiErrorHandler(makeFailingApiHandler(new Error('crash')))(mockApiEvent),
      ).resolves.toBeDefined();
    });
  });
});