import {parseCsvStream} from './parser.service';
import {PassThrough, Readable, Transform} from 'stream';

jest.mock('csv-parser', () => {
  return jest.fn();
});

const csvParser = jest.requireMock('csv-parser') as jest.Mock;

const resetCsvParserMock = () => {
  csvParser.mockImplementation(() => {
    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, _enc: string, cb: () => void) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach((line) => this.push({ raw: line }));
        cb();
      },
    });
  });
};

const makeStream = (content: string): Readable => Readable.from([content]);

const makeCsvParserThatErrors = (error: Error) => {
  csvParser.mockImplementationOnce(() => {
    return new Transform({
      objectMode: true,
      transform(_chunk: unknown, _enc: string, cb: (err: Error) => void) {
        cb(error);
      },
    });
  });
};

describe('parseCsvStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCsvParserMock();
  });

  it('resolves when the stream ends successfully', async () => {
    const stream = makeStream('header1,header2\nval1,val2\n');

    await expect(parseCsvStream(stream, 'test.csv')).resolves.toBeUndefined();
  });

  it('resolves with undefined (void) on success', async () => {
    const result = await parseCsvStream(makeStream('x\n1\n'), 'x.csv');

    expect(result).toBeUndefined();
  });

  it('pipes the input stream through csv-parser', async () => {
    const stream = makeStream('a,b\n1,2\n');

    await parseCsvStream(stream, 'test.csv');

    expect(csvParser).toHaveBeenCalledTimes(1);
  });

  it('logs a parsed record for every data row emitted by csv-parser', async () => {
    const rows = [{ col: 'row1' }, { col: 'row2' }, { col: 'row3' }];
    const collectedRows: unknown[] = [];

    csvParser.mockImplementationOnce(() => {
      return new Transform({
        objectMode: true,
        transform(_chunk: unknown, _enc: string, cb: () => void) {
          rows.forEach((r) => this.push(r));
          cb();
        },
      });
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      if (args[0] === 'Parsed Record:') collectedRows.push(args[1]);
    });

    await parseCsvStream(makeStream('any\n'), 'test.csv');

    expect(collectedRows).toEqual(rows);
    logSpy.mockRestore();
  });

  it('rejects when csv-parser emits an error', async () => {
    const parseError = new Error('malformed CSV');
    makeCsvParserThatErrors(parseError);

    await expect(parseCsvStream(makeStream('bad data'), 'bad.csv')).rejects.toThrow(
      'malformed CSV',
    );
  });

  it('rejects when the source stream has no data but csv-parser errors', async () => {
    const parseError = new Error('unexpected end');
    makeCsvParserThatErrors(parseError);

    await expect(parseCsvStream(makeStream('x'), 'eof.csv')).rejects.toThrow('unexpected end');
  });

  it('logs start message with the identifier', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await parseCsvStream(makeStream(''), 'products.csv');

    expect(logSpy).toHaveBeenCalledWith('Starting CSV parsing for: products.csv');
    logSpy.mockRestore();
  });

  it('logs finish message with the identifier', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await parseCsvStream(makeStream(''), 'products.csv');

    expect(logSpy).toHaveBeenCalledWith('Finished parsing: products.csv');
    logSpy.mockRestore();
  });

  it('logs an error message when csv-parser errors', async () => {
    const error = new Error('boom');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    makeCsvParserThatErrors(error);

    await expect(parseCsvStream(makeStream('x'), 'fail.csv')).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledWith('Stream error while parsing fail.csv:', error);
    errorSpy.mockRestore();
  });

  it('does not resolve before the stream has fully ended', async () => {
    const passThrough = new PassThrough({ objectMode: true });

    csvParser.mockImplementationOnce(() => {
      return new Transform({
        objectMode: true,
        transform(chunk: unknown, _enc: string, cb: () => void) {
          this.push(chunk);
          cb();
        },
      });
    });

    let resolved = false;
    const promise = parseCsvStream(passThrough, 'slow.csv').then(() => {
      resolved = true;
    });

    passThrough.push({ row: 1 });
    await new Promise((r) => setImmediate(r));
    expect(resolved).toBe(false);

    passThrough.end();
    await promise;
    expect(resolved).toBe(true);
  });
});