import { S3Event } from 'aws-lambda';
import { Readable } from 'stream';
import { handler } from './import-file-parser.handler';

jest.mock('../services/s3.service', () => ({
  getS3ObjectStream: jest.fn(),
  moveFileInS3: jest.fn(),
}));

jest.mock('../services/parser.service', () => ({
  parseCsvStream: jest.fn(),
}));

jest.mock('../utils/with-s3-error-handler', () => ({
  withS3ErrorHandler: (fn: unknown) => fn,
}));

import { getS3ObjectStream, moveFileInS3 } from '../services/s3.service';
import { parseCsvStream } from '../services/parser.service';

const mockGetS3ObjectStream = getS3ObjectStream as jest.Mock;
const mockParseCsvStream = parseCsvStream as jest.Mock;
const mockMoveFileInS3 = moveFileInS3 as jest.Mock;

const makeEvent = (records: { bucket: string; key: string }[]): S3Event => ({
  Records: records.map(({ bucket, key }) => ({
    s3: {
      bucket: { name: bucket },
      object: { key },
    },
  })) as S3Event['Records'],
});

const fakeStream = new Readable({ read() {} });

describe('importFileParser handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetS3ObjectStream.mockResolvedValue(fakeStream);
    mockParseCsvStream.mockResolvedValue(undefined);
    mockMoveFileInS3.mockResolvedValue(undefined);
  });

  describe('single record', () => {
    it('calls getS3ObjectStream with the correct bucket and key', async () => {
      const event = makeEvent([{ bucket: 'my-bucket', key: 'uploaded/products.csv' }]);

      await handler(event);

      expect(mockGetS3ObjectStream).toHaveBeenCalledWith('my-bucket', 'uploaded/products.csv');
    });

    it('passes the stream and key to parseCsvStream', async () => {
      const event = makeEvent([{ bucket: 'my-bucket', key: 'uploaded/products.csv' }]);

      await handler(event);

      expect(mockParseCsvStream).toHaveBeenCalledWith(fakeStream, 'uploaded/products.csv');
    });

    it('calls moveFileInS3 with the correct bucket and key', async () => {
      const event = makeEvent([{ bucket: 'my-bucket', key: 'uploaded/products.csv' }]);

      await handler(event);

      expect(mockMoveFileInS3).toHaveBeenCalledWith('my-bucket', 'uploaded/products.csv');
    });

    it('decodes a URL-encoded key (spaces)', async () => {
      const event = makeEvent([{ bucket: 'b', key: 'uploaded/my+file+name.csv' }]);

      await handler(event);

      expect(mockGetS3ObjectStream).toHaveBeenCalledWith('b', 'uploaded/my file name.csv');
      expect(mockParseCsvStream).toHaveBeenCalledWith(fakeStream, 'uploaded/my file name.csv');
      expect(mockMoveFileInS3).toHaveBeenCalledWith('b', 'uploaded/my file name.csv');
    });

    it('decodes a URI-encoded key (%20)', async () => {
      const event = makeEvent([{ bucket: 'b', key: 'uploaded/my%20file.csv' }]);

      await handler(event);

      expect(mockGetS3ObjectStream).toHaveBeenCalledWith('b', 'uploaded/my file.csv');
    });

    it('resolves with undefined on success', async () => {
      const event = makeEvent([{ bucket: 'b', key: 'uploaded/f.csv' }]);

      await expect(handler(event)).resolves.toBeUndefined();
    });
  });

  describe('operation order', () => {
    it('calls operations in order: getStream → parse → move', async () => {
      const callOrder: string[] = [];
      mockGetS3ObjectStream.mockImplementation(async () => { callOrder.push('getStream'); return fakeStream; });
      mockParseCsvStream.mockImplementation(async () => { callOrder.push('parse'); });
      mockMoveFileInS3.mockImplementation(async () => { callOrder.push('move'); });

      await handler(makeEvent([{ bucket: 'b', key: 'uploaded/f.csv' }]));

      expect(callOrder).toEqual(['getStream', 'parse', 'move']);
    });

    it('does not call moveFileInS3 when parseCsvStream fails', async () => {
      mockParseCsvStream.mockRejectedValue(new Error('parse error'));

      await expect(handler(makeEvent([{ bucket: 'b', key: 'k' }]))).rejects.toThrow('parse error');

      expect(mockMoveFileInS3).not.toHaveBeenCalled();
    });

    it('does not call parseCsvStream when getS3ObjectStream fails', async () => {
      mockGetS3ObjectStream.mockRejectedValue(new Error('stream error'));

      await expect(handler(makeEvent([{ bucket: 'b', key: 'k' }]))).rejects.toThrow('stream error');

      expect(mockParseCsvStream).not.toHaveBeenCalled();
      expect(mockMoveFileInS3).not.toHaveBeenCalled();
    });
  });

  describe('multiple records', () => {
    it('processes every record in the event', async () => {
      const event = makeEvent([
        { bucket: 'b', key: 'uploaded/a.csv' },
        { bucket: 'b', key: 'uploaded/b.csv' },
        { bucket: 'b', key: 'uploaded/c.csv' },
      ]);

      await handler(event);

      expect(mockGetS3ObjectStream).toHaveBeenCalledTimes(3);
      expect(mockParseCsvStream).toHaveBeenCalledTimes(3);
      expect(mockMoveFileInS3).toHaveBeenCalledTimes(3);
    });

    it('processes records with their own bucket and key', async () => {
      const event = makeEvent([
        { bucket: 'bucket-1', key: 'uploaded/first.csv' },
        { bucket: 'bucket-2', key: 'uploaded/second.csv' },
      ]);

      await handler(event);

      expect(mockGetS3ObjectStream).toHaveBeenNthCalledWith(1, 'bucket-1', 'uploaded/first.csv');
      expect(mockGetS3ObjectStream).toHaveBeenNthCalledWith(2, 'bucket-2', 'uploaded/second.csv');
    });

    it('stops processing on the first record that fails', async () => {
      mockParseCsvStream
        .mockResolvedValueOnce(undefined)        // first record ok
        .mockRejectedValueOnce(new Error('fail')); // second record fails

      const event = makeEvent([
        { bucket: 'b', key: 'uploaded/first.csv' },
        { bucket: 'b', key: 'uploaded/second.csv' },
        { bucket: 'b', key: 'uploaded/third.csv' },
      ]);

      await expect(handler(event)).rejects.toThrow('fail');

      // third record never reached
      expect(mockGetS3ObjectStream).toHaveBeenCalledTimes(2);
    });
  });

  describe('error propagation', () => {
    it('propagates errors from getS3ObjectStream', async () => {
      mockGetS3ObjectStream.mockRejectedValue(new Error('S3 read error'));

      await expect(handler(makeEvent([{ bucket: 'b', key: 'k' }]))).rejects.toThrow('S3 read error');
    });

    it('propagates errors from parseCsvStream', async () => {
      mockParseCsvStream.mockRejectedValue(new Error('CSV parse error'));

      await expect(handler(makeEvent([{ bucket: 'b', key: 'k' }]))).rejects.toThrow('CSV parse error');
    });

    it('propagates errors from moveFileInS3', async () => {
      mockMoveFileInS3.mockRejectedValue(new Error('Move failed'));

      await expect(handler(makeEvent([{ bucket: 'b', key: 'k' }]))).rejects.toThrow('Move failed');
    });
  });

  describe('logging', () => {
    it('logs the received S3 event at the start', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const event = makeEvent([{ bucket: 'b', key: 'uploaded/f.csv' }]);

      await handler(event);

      expect(logSpy).toHaveBeenCalledWith(
        'Received S3 Event:',
        JSON.stringify(event, null, 2),
      );
      logSpy.mockRestore();
    });

    it('logs completion message for each processed file', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const event = makeEvent([
        { bucket: 'b', key: 'uploaded/a.csv' },
        { bucket: 'b', key: 'uploaded/b.csv' },
      ]);

      await handler(event);

      expect(logSpy).toHaveBeenCalledWith('Completed full processing and move for: uploaded/a.csv');
      expect(logSpy).toHaveBeenCalledWith('Completed full processing and move for: uploaded/b.csv');
      logSpy.mockRestore();
    });
  });
});