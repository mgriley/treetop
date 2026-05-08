import { Writable } from 'stream';
import { Request, Response } from 'express';
import { Container } from 'dockerode';
import { docker } from '../docker';

export async function streamContainerLogs(container: Container, req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (line: string, type: 'stdout' | 'stderr') =>
    res.write(`data: ${JSON.stringify({ line, type })}\n\n`);

  const stdout = new Writable({
    write(chunk, _, cb) {
      chunk.toString().split('\n').filter(Boolean).forEach((l: string) => send(l, 'stdout'));
      cb();
    },
  });

  const stderr = new Writable({
    write(chunk, _, cb) {
      chunk.toString().split('\n').filter(Boolean).forEach((l: string) => send(l, 'stderr'));
      cb();
    },
  });

  const logStream = await container.logs({
    follow: true, stdout: true, stderr: true, tail: 200,
  });

  (docker as any).modem.demuxStream(logStream, stdout, stderr);
  req.on('close', () => logStream.destroy());
}
