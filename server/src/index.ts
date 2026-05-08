import express, { Request, Response } from 'express';
import os from 'os';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Hello there from Treetop!',
    hostname: os.hostname(),
  });
});

app.listen(PORT, () => {
  console.log(`Treetop server running on port ${PORT}`);
});
