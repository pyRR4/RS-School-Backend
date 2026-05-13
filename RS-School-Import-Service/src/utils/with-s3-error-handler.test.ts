import { S3Event } from 'aws-lambda';
import { withS3ErrorHandler } from './with-s3-error-handler';

const mockS3Event = {} as S3Event;

const makeS3Handler = () =>
  jest.fn().mockResolvedValue(undefined);

const makeFailingS3Handler = (error: unknown) =>
  jest.fn().mockRejectedValue(error);

describe('withS3ErrorHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('happy path', () => {
    it('calls the inner handler with the original event', async () => {
      const handler = makeS3Handler();

      await withS3ErrorHandler(handler)(mockS3Event);

      expect(handler).toHaveBeenCalledWith(mockS3Event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('resolves with undefined on success', async () => {
      const result = await withS3ErrorHandler(makeS3Handler())(mockS3Event);

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('re-throws the original error', async () => {
      const error = new Error('S3 processing failed');

      await expect(
        withS3ErrorHandler(makeFailingS3Handler(error))(mockS3Event),
      ).rejects.toThrow('S3 processing failed');
    });

    it('re-throws the exact same error reference', async () => {
      const error = new Error('exact reference');

      await expect(
        withS3ErrorHandler(makeFailingS3Handler(error))(mockS3Event),
      ).rejects.toBe(error);
    });

    it('re-throws non-Error values (e.g. strings)', async () => {
      await expect(
        withS3ErrorHandler(makeFailingS3Handler('string error'))(mockS3Event),
      ).rejects.toBe('string error');
    });

    it('logs the error to console.error before re-throwing', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('critical failure');

      await expect(
        withS3ErrorHandler(makeFailingS3Handler(error))(mockS3Event),
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('CRITICAL ERROR in S3 Event Handler:', error);
      errorSpy.mockRestore();
    });

    it('logs before throwing — not after', async () => {
      const callOrder: string[] = [];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        callOrder.push('log');
      });

      await withS3ErrorHandler(
        jest.fn().mockRejectedValue(new Error('order check')),
      )(mockS3Event).catch(() => callOrder.push('throw'));

      expect(callOrder).toEqual(['log', 'throw']);
      errorSpy.mockRestore();
    });
  });
});