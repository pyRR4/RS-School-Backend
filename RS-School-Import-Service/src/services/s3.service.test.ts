import { generateUploadUrl, getS3ObjectStream, moveFileInS3 } from './s3.service';
import { PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const getMockSend = () =>
  (jest.requireMock('@aws-sdk/client-s3') as { __mockSend: jest.Mock }).__mockSend;

describe('s3Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUploadUrl', () => {
    const BUCKET = 'test-import-bucket';
    const FILE_NAME = 'products.csv';

    beforeEach(() => {
      process.env.IMPORT_BUCKET_NAME = BUCKET;
    });

    afterEach(() => {
      delete process.env.IMPORT_BUCKET_NAME;
    });

    it('throws when IMPORT_BUCKET_NAME env var is missing', async () => {
      delete process.env.IMPORT_BUCKET_NAME;

      await expect(generateUploadUrl(FILE_NAME)).rejects.toThrow(
        'IMPORT_BUCKET_NAME environment variable is missing',
      );
    });

    it('creates PutObjectCommand with correct params', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url');

      await generateUploadUrl(FILE_NAME);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Key: `uploaded/${FILE_NAME}`,
        ContentType: 'text/csv',
      });
    });

    it('calls getSignedUrl with expiresIn: 60', async () => {
      const fakeUrl = 'https://s3.amazonaws.com/signed';
      (getSignedUrl as jest.Mock).mockResolvedValue(fakeUrl);

      await generateUploadUrl(FILE_NAME);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 60 },
      );
    });

    it('returns the signed URL from getSignedUrl', async () => {
      const fakeUrl = 'https://s3.amazonaws.com/signed?token=abc';
      (getSignedUrl as jest.Mock).mockResolvedValue(fakeUrl);

      const result = await generateUploadUrl(FILE_NAME);

      expect(result).toBe(fakeUrl);
    });

    it('propagates errors thrown by getSignedUrl', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('AWS error'));

      await expect(generateUploadUrl(FILE_NAME)).rejects.toThrow('AWS error');
    });
  });

  describe('getS3ObjectStream', () => {
    const BUCKET = 'my-bucket';
    const KEY = 'uploaded/file.csv';

    it('creates GetObjectCommand with correct bucket and key', async () => {
      const fakeStream = new Readable({ read() {} });
      getMockSend().mockResolvedValue({ Body: fakeStream });

      await getS3ObjectStream(BUCKET, KEY);

      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: BUCKET, Key: KEY });
    });

    it('returns the Body stream from the S3 response', async () => {
      const fakeStream = new Readable({ read() {} });
      getMockSend().mockResolvedValue({ Body: fakeStream });

      const result = await getS3ObjectStream(BUCKET, KEY);

      expect(result).toBe(fakeStream);
    });

    it('propagates errors thrown by s3Client.send', async () => {
      getMockSend().mockRejectedValue(new Error('NoSuchKey'));

      await expect(getS3ObjectStream(BUCKET, KEY)).rejects.toThrow('NoSuchKey');
    });
  });

  describe('moveFileInS3', () => {
    const BUCKET = 'my-bucket';
    const ORIGINAL_KEY = 'uploaded/products.csv';
    const EXPECTED_NEW_KEY = 'parsed/products.csv';

    beforeEach(() => {
      getMockSend().mockResolvedValue({});
    });

    it('calls CopyObjectCommand with correct params', async () => {
      await moveFileInS3(BUCKET, ORIGINAL_KEY);

      expect(CopyObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${ORIGINAL_KEY}`,
        Key: EXPECTED_NEW_KEY,
      });
    });

    it('calls DeleteObjectCommand with the original key', async () => {
      await moveFileInS3(BUCKET, ORIGINAL_KEY);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Key: ORIGINAL_KEY,
      });
    });

    it('performs copy before delete', async () => {
      const callOrder: string[] = [];
      getMockSend().mockImplementation((cmd: unknown) => {
        if (cmd instanceof (CopyObjectCommand as unknown as { new(...args: unknown[]): unknown })) {
          callOrder.push('copy');
        } else if (cmd instanceof (DeleteObjectCommand as unknown as { new(...args: unknown[]): unknown })) {
          callOrder.push('delete');
        }
        return Promise.resolve({});
      });

      let callCount = 0;
      getMockSend().mockImplementation(() => {
        callCount++;
        callOrder.push(callCount === 1 ? 'copy' : 'delete');
        return Promise.resolve({});
      });

      await moveFileInS3(BUCKET, ORIGINAL_KEY);

      expect(callOrder).toEqual(['copy', 'delete']);
    });

    it('correctly replaces "uploaded/" prefix with "parsed/" in the new key', async () => {
      const deepKey = 'uploaded/2024/01/data.csv';
      await moveFileInS3(BUCKET, deepKey);

      expect(CopyObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Key: 'parsed/2024/01/data.csv' }),
      );
    });

    it('calls s3Client.send exactly twice (copy + delete)', async () => {
      await moveFileInS3(BUCKET, ORIGINAL_KEY);

      expect(getMockSend()).toHaveBeenCalledTimes(2);
    });

    it('propagates errors thrown during copy', async () => {
      getMockSend().mockRejectedValueOnce(new Error('CopyFailed'));

      await expect(moveFileInS3(BUCKET, ORIGINAL_KEY)).rejects.toThrow('CopyFailed');
    });

    it('propagates errors thrown during delete', async () => {
      getMockSend()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DeleteFailed'));

      await expect(moveFileInS3(BUCKET, ORIGINAL_KEY)).rejects.toThrow('DeleteFailed');
    });

    it('does not call delete when copy fails', async () => {
      getMockSend().mockRejectedValueOnce(new Error('CopyFailed'));

      await expect(moveFileInS3(BUCKET, ORIGINAL_KEY)).rejects.toThrow();

      expect(getMockSend()).toHaveBeenCalledTimes(1);
      expect(DeleteObjectCommand).not.toHaveBeenCalled();
    });
  });
});