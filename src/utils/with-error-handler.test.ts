import {withErrorHandler} from './with-error-handler';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {NotFoundError} from '../errors/http.error';

describe('withErrorHandler utility', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        consoleSpy.mockRestore();
    });

    it('should return the result directly if the handler succeeds (Happy Path)', async () => {
        const mockSuccessResult: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify({ message: 'Success' })
        };
        const mockHandler = jest.fn().mockResolvedValue(mockSuccessResult);

        const wrappedHandler = withErrorHandler(mockHandler);
        const event = {} as APIGatewayProxyEvent;

        const result = await wrappedHandler(event);

        expect(result).toEqual(mockSuccessResult);
        expect(mockHandler).toHaveBeenCalledWith(event);
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should catch HttpError (e.g. NotFoundError) and return its status code', async () => {
        const errorMessage = 'Custom not found message';
        const mockHandler = jest.fn().mockRejectedValue(new NotFoundError(errorMessage));

        const wrappedHandler = withErrorHandler(mockHandler);
        const event = {} as APIGatewayProxyEvent;

        const result = await wrappedHandler(event);

        expect(result.statusCode).toBe(404);
        expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');

        const body = JSON.parse(result.body);
        expect(body.message).toBe(errorMessage);

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should catch unhandled generic errors and return a safe 500 response', async () => {
        const mockHandler = jest.fn().mockRejectedValue(new Error('FATAL: Database connection lost'));

        const wrappedHandler = withErrorHandler(mockHandler);
        const event = {} as APIGatewayProxyEvent;

        // Act
        const result = await wrappedHandler(event);

        expect(result.statusCode).toBe(500);
        expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');

        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal Server Error');
        expect(body.message).not.toContain('Database');

        expect(consoleSpy).toHaveBeenCalled();
    });
});