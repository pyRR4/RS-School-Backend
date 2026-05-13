import csv from 'csv-parser';
import { Readable } from 'stream';

export const parseCsvStream = async (stream: Readable, identifier: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    console.log(`Starting CSV parsing for: ${identifier}`);

    stream
      .pipe(csv())
      .on('data', (data) => {
        console.log('Parsed Record:', data);
      })
      .on('error', (error) => {
        console.error(`Stream error while parsing ${identifier}:`, error);
        reject(error);
      })
      .on('end', () => {
        console.log(`Finished parsing: ${identifier}`);
        resolve();
      });
  });
};