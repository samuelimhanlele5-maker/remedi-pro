import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from './routes.js';
import { dbManager } from './db.js';

// Opens a database session for each API request and saves/commits it before the response is sent.
// Does nothing when DATABASE_URL is not set (local file mode).
function dbSession(req: Request, res: Response, next: NextFunction) {
  if (!dbManager.usesPostgres) return next();
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  dbManager
    .beginRequest(write)
    .then(() => {
      let done = false;
      const origEnd = res.end.bind(res) as (...args: any[]) => any;
      (res as any).end = (...args: any[]) => {
        if (done) return origEnd(...args);
        done = true;
        dbManager
          .endRequest(true)
          .then(() => origEnd(...args))
          .catch((err) => {
            console.error('[Remedi Pro] Failed to save changes:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            origEnd(JSON.stringify({ error: 'Failed to save changes. Please try again.' }));
          });
        return res;
      };
      // Client disconnected before we answered: undo the transaction
      res.on('close', () => {
        if (!done) {
          done = true;
          dbManager.endRequest(false).catch(() => {});
        }
      });
      next();
    })
    .catch((err) => {
      console.error('[Remedi Pro] Database unavailable:', err);
      res.status(503).json({ error: 'Database unavailable. Check DATABASE_URL.' });
    });
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use('/api', dbSession, apiRouter);
  return app;
}
