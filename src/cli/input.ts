import { readFileSync } from 'fs';
import { stdin } from 'process';

export async function readQueryFromFile(filePath: string): Promise<string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to read file "${filePath}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function readQueryFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';

    stdin.setEncoding('utf-8');
    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read()) !== null) {
        data += chunk;
      }
    });

    stdin.on('end', () => {
      if (!data.trim()) {
        reject(new Error('No query provided via stdin'));
      } else {
        resolve(data.trim());
      }
    });

    stdin.on('error', reject);
  });
}
