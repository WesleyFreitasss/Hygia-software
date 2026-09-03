import express, { type Express } from 'express';

import { authRoutes } from './routes/authRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

/**
 * Monta a aplicacao Express sem subir o servidor.
 * Separar `app` de `server` deixa a API testavel (supertest/vitest).
 */
export function criarApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', servico: 'hygia-api', horario: new Date().toISOString() });
  });

  app.use('/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
